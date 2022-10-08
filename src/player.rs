use std::{
    sync::Arc,
    thread::yield_now,
    time::{Duration, Instant},
};

use crossbeam::channel::{Receiver, TryRecvError};
use log::{debug, info};
use midir::MidiOutputConnection;

use crate::{
    event::{AllNotesOff, Event},
    event_stream::EventStream,
    UiEvent,
};

pub struct Player {
    pub event_stream: Arc<EventStream>,
    pub midi_output_connection: MidiOutputConnection,
    pub ui_receiver: Receiver<UiEvent>,

    // internal player state
    first_event_instant: Option<Instant>,
    should_have_elapsed: Duration,
}

trait PlayerEvent {
    fn next(&self) -> Option<Event>;
}

impl Player {
    pub fn new(
        player_event: PlayerEvent,
        midi_output_connection: MidiOutputConnection,
        ui_receiver: Receiver<UiEvent>,
    ) -> Self {
        Player {
            event_stream,
            ui_receiver,
            midi_output_connection,

            first_event_instant: None,
            should_have_elapsed: Duration::ZERO,
        }
    }

    pub fn start_event_processing_loop(&mut self) -> anyhow::Result<()> {
        loop {
            match self.ui_receiver.try_recv() {
                Ok(UiEvent::Exit) => break,
                Err(TryRecvError::Empty) => (),
                Err(TryRecvError::Disconnected) => {
                    return Err(anyhow::anyhow!("UI receiver disconnected"))
                }
            }

            match self.event_stream.get_event() {
                Some(event) => self.process_new_event(event)?,
                None => yield_now(), // TODO: if no event, we busy-wait until there is.
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

impl Drop for Player {
    fn drop(&mut self) {
        debug!("Sending all notes off signal");

        self.midi_output_connection
            .send(&AllNotesOff {}.to_midi_msg())
            .expect("Could not send all notes out message");
    }
}
