use std::{
    sync::mpsc::Receiver,
    time::{Duration, Instant},
};

use crate::event::Event;

pub struct Player {
    receiver: Receiver<Event>,
}

impl Player {
    pub fn new(receiver: Receiver<Event>) -> Self {
        Player { receiver: receiver }
    }

    pub fn play(&mut self) {
        let mut start: Option<Instant> = None;
        let mut should_have_elapsed = Duration::ZERO;

        for event in self.receiver.iter() {
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
    }
}
