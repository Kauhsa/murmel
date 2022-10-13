mod crossterm_raw_logger;
mod event;
mod event_coordinator;
mod event_generator;
mod event_generator_thread;
mod player;

use crate::crossterm_raw_logger::CrosstermRawLogger;
use crate::event_coordinator::new_event_coordinator;
use crate::player::new_player_actor;
use anyhow::anyhow;
use crossterm::event::{poll, read, Event, KeyCode, KeyModifiers};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};
use log::{debug, info};
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use std::time::Duration;
use std::{fs, panic};

#[derive(Clone, Copy)]
pub enum UiEvent {
    Exit,
}

const ENTRYPOINT: &str = "./samples/test.js";

fn main() -> anyhow::Result<()> {
    enable_raw_mode()?;
    CrosstermRawLogger::init()?;
    let _ = panic::catch_unwind(run);
    disable_raw_mode()?;
    Ok(())
}

fn run() -> anyhow::Result<()> {
    info!("Starting...");

    let midi_out = MidiOutput::new("murmel")?;
    let midi_output_connection = midi_out
        .create_virtual("Virtual port")
        .map_err(|e| anyhow!("Could not create midi port: {:?}", e))?;

    /* event thread */

    let entrypoint = fs::canonicalize(ENTRYPOINT)?;
    let (event_coordinator, event_coordinator_jh) = new_event_coordinator(&entrypoint);
    let (player, player_jh) = new_player_actor(event_coordinator.clone(), midi_output_connection);

    /* ui events  */

    while !player_jh.is_finished() {
        if !poll(Duration::from_millis(100))? {
            continue;
        }

        match read()? {
            Event::Key(event) => match event.code {
                KeyCode::Char('q') => {
                    player.exit()?;
                    event_coordinator.exit()?;
                }

                KeyCode::Char('c') => {
                    if event.modifiers.contains(KeyModifiers::CONTROL) {
                        player.exit()?;
                        event_coordinator.exit()?;
                    }
                }

                KeyCode::Char('r') => {
                    event_coordinator.reload_from_next_marker()?;
                }

                _ => (),
            },
            _ => (),
        };
    }

    /* let's go! */

    player_jh.join().unwrap()?;
    event_coordinator_jh.join().unwrap()?;
    debug!("Stopped!");

    Ok(())
}
