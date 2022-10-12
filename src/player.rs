use std::{
    thread::yield_now,
    time::{Duration, Instant},
};

use crossbeam::channel::{bounded, Receiver, Sender, TryRecvError};
use log::{debug, info};
use midir::MidiOutputConnection;

use crate::event::{AllNotesOff, Event};

pub enum PlayerCtrlEvent {
    Exit,
}

pub struct Player<'a, T: PlayerEventSource> {
    pub player_event_source: &'a T,
    pub midi_output_connection: MidiOutputConnection,
    pub ctrl_receiver: Receiver<PlayerCtrlEvent>,

    // internal player state
    first_event_instant: Option<Instant>,
    should_have_elapsed: Duration,
}

impl<'a, T: PlayerEventSource> Player<'a, T> {
    pub fn new(
        player_event_source: &'a T,
        midi_output_connection: MidiOutputConnection,
    ) -> (Sender<PlayerCtrlEvent>, Self) {
        let (tx, rx) = bounded(128);

        let player = Player {
            player_event_source,
            ctrl_receiver: rx,
            midi_output_connection,

            first_event_instant: None,
            should_have_elapsed: Duration::ZERO,
        };

        (tx, player)
    }

    pub fn run(&mut self) -> anyhow::Result<()> {
        loop {
            match self.ctrl_receiver.try_recv() {
                Ok(PlayerCtrlEvent::Exit) => break,
                Err(TryRecvError::Empty) => yield_now(), // TODO: don't busy-wait.
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

impl<'a, T: PlayerEventSource> Drop for Player<'a, T> {
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
