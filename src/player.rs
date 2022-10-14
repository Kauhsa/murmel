use crate::event::{AllNotesOff, Bpm, Event, Ticks, TICKS_PER_BEAT};
use crossbeam::channel::{unbounded, Receiver, Sender, TryRecvError};
use log::{debug, info, warn};
use midir::MidiOutputConnection;
use std::{
    thread::{spawn, JoinHandle},
    time::{Duration, Instant},
};
use thread_priority::{set_current_thread_priority, ThreadPriority, ThreadPriorityValue};

pub enum Msg {
    Play,
    Stop,
    Exit,
}

pub enum PlayerStatus {
    Stopped,
    Playing,
}

const BEAT_IN_120_BPM: Duration = Duration::from_millis(500);

pub struct PlayerActor<T: PlayerEventSource> {
    pub player_event_source: T,
    pub midi_output_connection: MidiOutputConnection,
    pub rx: Receiver<Msg>,

    // internal player state
    current_bpm: Bpm,
    first_event_instant: Option<Instant>,
    should_have_elapsed: Duration,
    player_status: PlayerStatus,
}

impl<T: PlayerEventSource> PlayerActor<T> {
    pub fn new(
        player_event_source: T,
        midi_output_connection: MidiOutputConnection,
        rx: Receiver<Msg>,
    ) -> Self {
        PlayerActor {
            player_event_source,
            midi_output_connection,
            rx,

            current_bpm: 120,
            first_event_instant: None,
            should_have_elapsed: Duration::ZERO,
            player_status: PlayerStatus::Stopped,
        }
    }

    pub fn run(mut self) -> anyhow::Result<()> {
        loop {
            match self.rx.try_recv() {
                Ok(Msg::Exit) => break,

                Ok(Msg::Play) => {
                    if !matches!(self.player_status, PlayerStatus::Playing) {
                        info!("Starting playing");
                        self.player_status = PlayerStatus::Playing;
                    }
                }

                Ok(Msg::Stop) => {
                    if !matches!(self.player_status, PlayerStatus::Stopped) {
                        info!("Stopping playing");
                        self.first_event_instant = None;
                        self.should_have_elapsed = Duration::ZERO;
                        self.player_status = PlayerStatus::Stopped;
                    }
                }

                Err(TryRecvError::Empty) => (),

                Err(TryRecvError::Disconnected) => {
                    return Err(anyhow::anyhow!("UI receiver disconnected"))
                }
            }

            if matches!(&self.player_status, PlayerStatus::Playing) {
                match self.player_event_source.next() {
                    Some(event) => self.process_new_event(event)?,

                    None => {
                        // TODO: we should wait for a while and see if one
                        // comes. Event generator might just be slow.
                        warn!("No next event available. Stopping.");
                        self.player_status = PlayerStatus::Stopped
                    }
                }
            }
        }

        Ok(())
    }

    fn process_new_event(&mut self, event: Event) -> anyhow::Result<()> {
        let first_event_instant = self
            .first_event_instant
            .get_or_insert(Instant::now())
            .to_owned();

        debug!("Next event: {:?}", event);

        match &event {
            Event::NoteOn(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::NoteOff(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::AllNotesOff(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::Print { value } => info!("Print: {}", value),

            Event::Wait(e) => {
                let duration = self.ticks_to_duration(e.ticks);

                self.should_have_elapsed += duration;

                let wait_duration = self
                    .should_have_elapsed
                    .checked_sub(first_event_instant.elapsed())
                    .unwrap_or(Duration::ZERO);

                debug!("Waiting {:?}", wait_duration);

                // TODO: interrupting the thread should be able to interrupt this as well.
                spin_sleep::sleep(wait_duration)
            }

            Event::ChangeBpm(e) => self.current_bpm = e.bpm,

            Event::Marker => {}
        }

        Ok(())
    }

    fn send_to_midi(&mut self, msg: &[u8]) -> anyhow::Result<()> {
        self.midi_output_connection
            .send(&msg)
            .map_err(anyhow::Error::msg)
    }

    fn ticks_to_duration(&self, ticks: Ticks) -> Duration {
        let single_tick_duration =
            (BEAT_IN_120_BPM * 120) / self.current_bpm.into() / TICKS_PER_BEAT;

        single_tick_duration * ticks
    }
}

pub fn new_player_actor<T: PlayerEventSource + Send + 'static>(
    player_event_source: T,
    midi_output_connection: MidiOutputConnection,
) -> (PlayerActorHandle, JoinHandle<anyhow::Result<()>>) {
    let (tx, rx) = unbounded();
    let player = PlayerActor::new(player_event_source, midi_output_connection, rx);

    let jh = spawn(move || -> anyhow::Result<()> {
        debug!("Player thread started");

        set_current_thread_priority(get_player_thread_priority())
            .map_err(|e| anyhow::anyhow!("Could not set thread priority {:?}", e))?;

        player.run()?;

        debug!("Player thread exited");

        Ok(())
    });

    let handle = PlayerActorHandle { tx };

    (handle, jh)
}

fn get_player_thread_priority() -> ThreadPriority {
    let thread_priority_value: ThreadPriorityValue = 40.try_into().unwrap();
    ThreadPriority::Crossplatform(thread_priority_value)
}

#[derive(Clone)]
pub struct PlayerActorHandle {
    tx: Sender<Msg>,
}

impl PlayerActorHandle {
    pub fn play(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Play)?;
        Ok(())
    }

    pub fn stop(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Stop)?;
        Ok(())
    }

    pub fn exit(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Exit)?;
        Ok(())
    }
}

impl<T: PlayerEventSource> Drop for PlayerActor<T> {
    fn drop(&mut self) {
        debug!("Sending all notes off signal");

        self.midi_output_connection
            .send(&AllNotesOff {}.to_midi_msg())
            .expect("Could not send all notes out message");
    }
}

pub trait PlayerEventSource {
    fn next(&self) -> Option<Event>;
}
