mod event;
mod event_generator;
mod player;

use event::Event;
use event_generator::EventGenerator;
use player::Player;
use std::sync::mpsc::channel;
use std::thread::{self, sleep};
use std::time::Duration;
use thread_priority::*;

fn main() -> anyhow::Result<()> {
    env_logger::init();

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
    let player_thread_priority = ThreadPriority::Crossplatform(40.try_into().unwrap());

    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            let mut player = Player::new(receiver);
            player.play()
        })?;

    event_generator_thread.join().unwrap();
    player_thread.join().unwrap();

    Ok(())
}
