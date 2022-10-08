mod event;
mod event_generator;
mod event_thread;
mod multichannel;
mod player;

use anyhow::anyhow;
use log::{debug, info};
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use player::Player;
use std::path::Path;
use thread_priority::*;

use crate::event_thread::EventThread;

#[derive(Clone, Copy)]
pub enum UiEvent {
    Exit,
}

const ENTRYPOINT: &str = "./samples/test.js";

fn main() -> anyhow::Result<()> {
    env_logger::init();

    info!("Starting...");

    let midi_out = MidiOutput::new("murmel")?;
    let mut ui_multichannel = multichannel::Multichannel::<UiEvent>::new();

    /* player thread */

    let thread_priority_value: ThreadPriorityValue = 40.try_into().unwrap();
    let player_thread_priority = ThreadPriority::Crossplatform(thread_priority_value);
    let receiver_for_player = ui_multichannel.get_receiver();
    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || -> Result<(), anyhow::Error> {
            debug!("Player thread started");

            let midi_output_connection = midi_out
                .create_virtual("Virtual port")
                .map_err(|_| anyhow!("Could not create midi port"))?;

            let event_thread = EventThread::spawn(Path::new(ENTRYPOINT))?;

            {
                let mut player =
                    Player::new(&event_thread, midi_output_connection, receiver_for_player);

                player.start_event_processing_loop()?;
            }

            event_thread.exit()?;
            event_thread.handle.join().unwrap()?; // TODO: map to appropriate error

            debug!("Player thread exited");
            Ok(())
        })?;

    ctrlc::set_handler(move || {
        ui_multichannel
            .send(&UiEvent::Exit)
            .expect("Could not send exit signal");
    })?;

    /* let's go! */

    // TODO
    player_thread.join().expect("foo")?;

    Ok(())
}
