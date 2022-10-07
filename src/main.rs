mod event;
mod event_generator;
mod multichannel;
mod player;

use crossbeam_channel::{unbounded, RecvTimeoutError};
use event::Event;
use event_generator::EventGenerator;
use log::{debug, info};
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use player::Player;
use std::time::Duration;
use std::{fs, thread};
use thread_priority::*;

#[derive(Clone, Copy)]
pub enum UiEvent {
    Exit,
}

const ENTRYPOINT: &str = "./samples/test.js";

fn main() -> anyhow::Result<()> {
    env_logger::init();

    info!("Starting...");

    let midi_out = MidiOutput::new("murmel")?;
    let (event_sender, event_receiver) = unbounded::<Event>();
    let mut ui_multichannel = multichannel::Multichannel::<UiEvent>::new();

    /* event generator thread */

    let receiver_for_event = ui_multichannel.get_receiver();
    let event_generator_thread = thread::Builder::new()
        .name("event_generator".to_string())
        .spawn(move || {
            debug!("Event generator thread started");

            let entrypoint = fs::canonicalize(ENTRYPOINT).unwrap();

            let mut event_generator = EventGenerator::create(entrypoint.as_path(), event_sender)
                .expect("Could not create event generator");

            // temporary hack - request 1500ms worth of events every 1000ms, so
            // we should not ever run out
            loop {
                event_generator
                    .request_notes(Duration::from_millis(1500))
                    .unwrap();

                match receiver_for_event.recv_timeout(Duration::from_millis(1000)) {
                    Ok(UiEvent::Exit) => break,
                    Err(RecvTimeoutError::Timeout) => (),
                    Err(e) => panic!("{}", e),
                }
            }

            debug!("Event generator thread exited");
        })?;

    /* player thread */

    let thread_priority_value: ThreadPriorityValue = 40.try_into().unwrap();
    let player_thread_priority = ThreadPriority::Crossplatform(thread_priority_value);
    let receiver_for_player = ui_multichannel.get_receiver();
    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            debug!("Player thread started");

            let midi_output_connection = midi_out
                .create_virtual("Virtual port")
                .expect("Could not create MIDI output connection");

            let mut player = Player::new(
                event_receiver.clone(),
                midi_output_connection,
                receiver_for_player,
            );

            player.start_event_processing_loop().unwrap();

            debug!("Player thread exited");
        })?;

    ctrlc::set_handler(move || {
        ui_multichannel
            .send(&UiEvent::Exit)
            .expect("Could not send exit signal");
    })?;

    /* let's go! */

    event_generator_thread.join().unwrap();
    player_thread.join().unwrap();

    Ok(())
}
