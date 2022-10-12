mod crossterm_raw_logger;
mod event;
mod event_generator;
mod event_thread;
mod player;

use crate::crossterm_raw_logger::CrosstermRawLogger;
use crate::event_thread::EventThread;
use crate::player::PlayerCtrlEvent;

use anyhow::anyhow;
use crossterm::event::{poll, read, Event, KeyCode, KeyModifiers};
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use crossterm::ExecutableCommand;
use log::{debug, info};
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use player::Player;
use std::io::stdout;
use std::path::Path;
use std::thread;
use std::time::Duration;
use thread_priority::*;

#[derive(Clone, Copy)]
pub enum UiEvent {
    Exit,
}

const ENTRYPOINT: &str = "./samples/test.js";

fn main() -> anyhow::Result<()> {
    init_ui()?;
    info!("Starting...");

    let midi_out = MidiOutput::new("murmel")?;
    let midi_output_connection = midi_out
        .create_virtual("Virtual port")
        .map_err(|e| anyhow!("Could not create midi port: {:?}", e))?;

    /* event thread */
    let event_thread = EventThread::spawn(Path::new(ENTRYPOINT))?;

    {
        let event_thread = &event_thread;

        let (player_ctrl_tx, mut player) = Player::new(event_thread, midi_output_connection);

        thread::scope(|scope| -> anyhow::Result<()> {
            let player_thread = scope.spawn(move || -> Result<(), anyhow::Error> {
                debug!("Player thread started");

                set_current_thread_priority(get_player_thread_priority())
                    .map_err(|e| anyhow!("Could not set thread priority {:?}", e))?;

                player.run()?;

                debug!("Player thread exited");

                Ok(())
            });

            /* ui events  */

            while !player_thread.is_finished() {
                if !poll(Duration::from_millis(100))? {
                    continue;
                }

                match read()? {
                    Event::Key(event) => match event.code {
                        KeyCode::Char('q') => player_ctrl_tx.send(PlayerCtrlEvent::Exit)?,

                        KeyCode::Char('c') => {
                            if event.modifiers.contains(KeyModifiers::CONTROL) {
                                player_ctrl_tx.send(PlayerCtrlEvent::Exit)?
                            }
                        }

                        KeyCode::Char('r') => event_thread.reload_from_next_marker()?,

                        _ => (),
                    },
                    _ => (),
                };
            }

            Ok(())
        })
    }
    .unwrap();

    /* let's go! */

    event_thread.exit()?;
    event_thread.handle.join().unwrap()?;
    cleanup_ui()?;
    Ok(())
}

fn get_player_thread_priority() -> ThreadPriority {
    let thread_priority_value: ThreadPriorityValue = 40.try_into().unwrap();
    ThreadPriority::Crossplatform(thread_priority_value)
}

fn init_ui() -> anyhow::Result<()> {
    let mut stdout = stdout();
    stdout.execute(EnterAlternateScreen)?;
    enable_raw_mode()?;
    CrosstermRawLogger::init()?;
    Ok(())
}

fn cleanup_ui() -> anyhow::Result<()> {
    let mut stdout = stdout();
    disable_raw_mode()?;
    stdout.execute(LeaveAlternateScreen)?;
    Ok(())
}
