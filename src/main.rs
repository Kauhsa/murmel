mod event;
mod event_generator;
mod player;

use event::Event;
use event_generator::EventGenerator;
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use player::Player;
use std::sync::mpsc::channel;
use std::thread::{self, sleep};
use std::time::Duration;
use thread_priority::*;

fn main() -> anyhow::Result<()> {
    env_logger::init();

    let midi_out = MidiOutput::new("murmel")?;

    let (sender, receiver) = channel::<Event>();

    let event_generator_thread = thread::Builder::new()
        .name("event_generator".to_string())
        .spawn(move || {
            let mut exec = EventGenerator::create(sender.clone()).unwrap();

            // temporary hack - request 1500ms worth of events every 1000ms, so
            // we should not ever run out
            loop {
                exec.request_notes(1500).unwrap();
                sleep(Duration::from_millis(1000))
            }
        })?;

    // tried only for OSX
    let player_thread_priority = ThreadPriority::Crossplatform(47.try_into().unwrap());

    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            let midi_output_connection = midi_out
                .create_virtual("Virtual port")
                .expect("Could not create midi output connection");

            let mut player = Player {
                receiver,
                midi_output_connection,
            };

            player.play().unwrap()
        })?;

    event_generator_thread.join().unwrap();
    player_thread.join().unwrap();

    Ok(())
}
