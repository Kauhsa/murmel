use std::time::{Duration, Instant};

use crossbeam_channel::Receiver;
use log::{debug, info};
use midir::MidiOutputConnection;

use crate::event::Event;

pub struct Player {
    pub receiver: Receiver<Event>,
    pub midi_output_connection: MidiOutputConnection,
}

impl Player {
    pub fn play(&mut self) -> anyhow::Result<()> {
        let mut start: Option<Instant> = None;
        let mut should_have_elapsed = Duration::ZERO;

        loop {
            let event = self.receiver.recv().expect("Channel died");

            if start.is_none() {
                start = Some(Instant::now())
            }

            debug!("Event: {:?}", event);

            match &event {
                Event::NoteOn(e) => self.send_to_midi(&e.to_midi_msg())?,

                Event::NoteOff(e) => self.send_to_midi(&e.to_midi_msg())?,

                Event::Print { value } => {
                    info!("Print: {}", value)
                }

                Event::Break(e) => {
                    should_have_elapsed += Duration::from_secs_f32(e.duration / 1000.0);
                    let sleep_duration = should_have_elapsed - start.unwrap().elapsed();
                    debug!("Break, sleeping {:?}", sleep_duration);
                    spin_sleep::sleep(sleep_duration)
                }
            }
        }
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
        self.midi_output_connection
            .send(&ALL_NOTES_OFF)
            .expect("Could not send all notes out message");
    }
}
