use std::{
    sync::mpsc::Receiver,
    time::{Duration, Instant},
};

use log::debug;
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
            let event = self.receiver.recv()?;

            if start.is_none() {
                start = Some(Instant::now())
            }

            self.process_midi_event(&event)?;
            debug!("Event: {:?}", event);

            if let Event::Break { duration } = event {
                should_have_elapsed += Duration::from_secs_f32(duration / 1000.0);
                let sleep_duration = should_have_elapsed - start.unwrap().elapsed();
                debug!("Break, sleeping {:?}", sleep_duration);
                spin_sleep::sleep(sleep_duration);
            }
        }
    }

    fn process_midi_event(&mut self, event: &Event) -> anyhow::Result<()> {
        match &event.to_midi_msg() {
            Some(msg) => self
                .midi_output_connection
                .send(msg)
                .map_err(anyhow::Error::msg),

            None => Ok(()),
        }
    }
}
