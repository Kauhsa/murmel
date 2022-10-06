mod event;
mod event_generator;

use event::Event;
use event_generator::EventGenerator;
use midir::os::unix::VirtualOutput;
use midir::MidiOutput;
use std::error::Error;
use std::sync::mpsc::channel;
use std::thread::{self, sleep};
use std::time::{Duration, Instant};
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

    let player_thread_priority = ThreadPriority::Crossplatform(50u8.try_into().unwrap());

    let player_thread = ThreadBuilder::default()
        .name("player".to_string())
        .priority(player_thread_priority)
        .spawn_careless(move || {
            let mut start: Option<Instant> = None;
            let mut should_have_elapsed = Duration::ZERO;

            for event in receiver.iter() {
                if let None = start {
                    start = Some(Instant::now())
                }

                println!("{:?}", event);

                if let Event::Break { duration } = event {
                    should_have_elapsed += Duration::from_millis(duration.into());
                    let sleep_duration = should_have_elapsed - start.unwrap().elapsed();
                    println!("Sleeping {:?}", sleep_duration);
                    spin_sleep::sleep(sleep_duration);
                }
            }
        })?;

    event_generator_thread.join();
    player_thread.join();

    Ok(())
}

fn run_midi() -> Result<(), Box<dyn Error>> {
    let midi_out = MidiOutput::new("My Test Output")?;

    let mut conn_out = midi_out.create_virtual("Virtual port")?;

    println!("Connection open. Listen!");
    {
        // Define a new scope in which the closure `play_note` borrows conn_out, so it can be called easily
        let mut play_note = |note: u8, duration: u64| {
            const NOTE_ON_MSG: u8 = 0x90;
            const NOTE_OFF_MSG: u8 = 0x80;
            const VELOCITY: u8 = 0x64;
            // We're ignoring errors in here
            let _ = conn_out.send(&[NOTE_ON_MSG, note, VELOCITY]);
            sleep(Duration::from_millis(duration * 150));
            let _ = conn_out.send(&[NOTE_OFF_MSG, note, VELOCITY]);
        };

        sleep(Duration::from_millis(4 * 150));

        play_note(66, 4);
        play_note(65, 3);
        play_note(63, 1);
        play_note(61, 6);
        play_note(59, 2);
        play_note(58, 4);
        play_note(56, 4);
        play_note(54, 4);
    }
    sleep(Duration::from_millis(150));
    println!("\nClosing connection");
    // This is optional, the connection would automatically be closed as soon as it goes out of scope
    conn_out.close();
    println!("Connection closed");
    Ok(())
}
