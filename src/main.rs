mod event;
mod event_generator;
mod player;

use crossbeam_channel::{unbounded, RecvTimeoutError};
use event::Event;
use event_generator::EventGenerator;
use log::debug;
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use player::Player;
use std::thread;
use std::time::Duration;
use thread_priority::*;

pub enum UiEvent {
    Exit,
}

fn main() -> anyhow::Result<()> {
    env_logger::init();

    let midi_out = MidiOutput::new("murmel")?;

    let (event_sender, event_receiver) = unbounded::<Event>();

    /* event generator thread */

    let (ui_sender_for_event, ui_receiver_for_event) = unbounded::<UiEvent>();
    let event_generator_thread = thread::Builder::new()
        .name("event_generator".to_string())
        .spawn(move || {
            debug!("Event generator thread started");

            let mut event_generator =
                EventGenerator::create(event_sender).expect("Could not create event generator");

            // temporary hack - request 1500ms worth of events every 1000ms, so
            // we should not ever run out
            loop {
                event_generator.request_notes(1500).unwrap();

                match ui_receiver_for_event.recv_timeout(Duration::from_millis(1000)) {
                    Ok(UiEvent::Exit) => break,
                    Err(RecvTimeoutError::Timeout) => (),
                    Err(e) => panic!("{}", e),
                }
            }

            debug!("Event generator thread exited");
        })?;

    /* player thread */

    let player_thread_priority = ThreadPriority::Crossplatform(40.try_into().unwrap());
    let (ui_sender_for_player, ui_receiver_for_player) = unbounded::<UiEvent>();
    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            debug!("Player thread started");

            let midi_output_connection = midi_out
                .create_virtual("Virtual port")
                .expect("Could not create midi output connection");

            let mut player = Player::new(
                event_receiver.clone(),
                midi_output_connection,
                ui_receiver_for_player,
            );

            player.play().unwrap();

            debug!("Player thread exited");
        })?;

    ctrlc::set_handler(move || {
        // TODO: separate channels probably won't scale.

        ui_sender_for_event
            .send(UiEvent::Exit)
            .expect("Could not send exit signal");

        ui_sender_for_player
            .send(UiEvent::Exit)
            .expect("Could not send exit signal");
    })?;

    /* let's go! */

    event_generator_thread.join().unwrap();
    player_thread.join().unwrap();

    Ok(())
}
