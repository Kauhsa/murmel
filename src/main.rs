mod event;
mod event_generator;
mod player;

use event::Event;
use event_generator::EventGenerator;
use player::Player;
use std::error::Error;
use std::sync::mpsc::channel;
use std::thread::{self, sleep};
use std::time::Duration;
use thread_priority::*;

fn main() -> Result<(), Box<dyn Error>> {
    let (sender, receiver) = channel::<Event>();

    let event_generator_thread = thread::Builder::new()
        .name("event_generator".to_string())
        .spawn(move || {
            let mut exec = EventGenerator::create(sender.clone()).unwrap();

            loop {
                exec.request_notes(1500).unwrap();
                sleep(Duration::from_secs(1))
            }
        })?;

    let player_thread_priority = ThreadPriority::Crossplatform(50.try_into()?);

    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            let mut player = Player::new(receiver);
            player.play()
        })?;

    event_generator_thread.join();
    player_thread.join();

    Ok(())
}
