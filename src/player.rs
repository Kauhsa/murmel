use crate::event::{AllNotesOff, Event};
use crossbeam::channel::{unbounded, Receiver, Sender, TryRecvError};
use log::{debug, info};
use midir::MidiOutputConnection;
use std::{
    thread::{spawn, yield_now, JoinHandle},
    time::{Duration, Instant},
};
use thread_priority::{set_current_thread_priority, ThreadPriority, ThreadPriorityValue};

pub enum Msg {
    Exit,
}

pub struct PlayerActor<T: PlayerEventSource> {
    pub player_event_source: T,
    pub midi_output_connection: MidiOutputConnection,
    pub ctrl_receiver: Receiver<Msg>,

    // internal player state
    first_event_instant: Option<Instant>,
    should_have_elapsed: Duration,
}

impl<T: PlayerEventSource> PlayerActor<T> {
    pub fn new(
        player_event_source: T,
        midi_output_connection: MidiOutputConnection,
        rx: Receiver<Msg>,
    ) -> Self {
        PlayerActor {
            player_event_source,
            ctrl_receiver: rx,
            midi_output_connection,

            first_event_instant: None,
            should_have_elapsed: Duration::ZERO,
        }
    }

    pub fn run(mut self) -> anyhow::Result<()> {
        loop {
            match self.ctrl_receiver.try_recv() {
                Ok(Msg::Exit) => break,
                Err(TryRecvError::Empty) => (),
                Err(TryRecvError::Disconnected) => {
                    return Err(anyhow::anyhow!("UI receiver disconnected"))
                }
            }

            match self.player_event_source.next() {
                Some(event) => self.process_new_event(event)?,
                None => yield_now(), // TODO: don't busy-wait.
            }
        }

        Ok(())
    }

    fn process_new_event(&mut self, event: Event) -> anyhow::Result<()> {
        if self.first_event_instant.is_none() {
            self.first_event_instant = Some(Instant::now())
        }

        debug!("Event: {:?}", event);

        match &event {
            Event::NoteOn(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::NoteOff(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::AllNotesOff(e) => self.send_to_midi(&e.to_midi_msg())?,

            Event::Print { value } => info!("Print: {}", value),

            Event::Wait(e) => {
                self.should_have_elapsed += Duration::from_secs_f32(e.duration / 1000.0);

                let wait_duration = self
                    .should_have_elapsed
                    .checked_sub(self.first_event_instant.unwrap().elapsed())
                    .unwrap_or(Duration::ZERO);

                debug!("Waiting {:?}", wait_duration);

                // TODO: interrupting the thread should be able to interrupt this as well.
                spin_sleep::sleep(wait_duration)
            }

            Event::Marker => {}
        }

        Ok(())
    }

    fn send_to_midi(&mut self, msg: &[u8]) -> anyhow::Result<()> {
        self.midi_output_connection
            .send(&msg)
            .map_err(anyhow::Error::msg)
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
