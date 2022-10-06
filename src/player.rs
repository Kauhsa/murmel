use std::time::{Duration, Instant};

use crossbeam_channel::{select, Receiver};
use log::{debug, info};
use midir::MidiOutputConnection;

use crate::{event::Event, UiEvent};

pub struct Player {
    pub receiver: Receiver<Event>,
    pub midi_output_connection: MidiOutputConnection,
    pub ui_receiver: Receiver<UiEvent>,

    // internal player state
    first_event_instant: Option<Instant>,
    should_have_elapsed: Duration,
}

impl Player {
    pub fn new(
        event_receiver: Receiver<Event>,
        midi_output_connection: MidiOutputConnection,
        ui_receiver: Receiver<UiEvent>,
    ) -> Self {
        Player {
            receiver: event_receiver,
            ui_receiver,
            midi_output_connection,

            first_event_instant: None,
            should_have_elapsed: Duration::ZERO,
        }
    }

    pub fn start_event_processing_loop(&mut self) -> anyhow::Result<()> {
        loop {
            // TODO: ui_receiver should have a priority - I don't think it does now.
            select! {
                recv(self.ui_receiver) -> e => match e {
                    Ok(UiEvent::Exit) => break,
                    _ => ()
                },

                recv(self.receiver) -> e => match e {
                    Ok(event) => self.process_new_event(event)?,
                    _ => ()
                }
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

            Event::Print { value } => {
                info!("Print: {}", value)
            }

            Event::Break(e) => {
                self.should_have_elapsed += Duration::from_secs_f32(e.duration / 1000.0);
                let sleep_duration =
                    self.should_have_elapsed - self.first_event_instant.unwrap().elapsed();
                debug!("Break, sleeping {:?}", sleep_duration);

                // TODO: interrupting the thread should be able to interrupt this as well.
                spin_sleep::sleep(sleep_duration)
            }
        }

        Ok(())
    }

    fn send_to_midi(&mut self, msg: &[u8]) -> anyhow::Result<()> {
        self.midi_output_connection
            .send(&msg)
            .map_err(anyhow::Error::msg)
    }
}

const ALL_NOTES_OFF: [u8; 3] = [0xB0, 0, 0];

impl Drop for Player {
    fn drop(&mut self) {
        debug!("Sending all notes off signal");

        self.midi_output_connection
            .send(&ALL_NOTES_OFF)
            .expect("Could not send all notes out message");
    }
}
