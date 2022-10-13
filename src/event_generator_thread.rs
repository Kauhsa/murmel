use crate::{event::Event, event_generator::EventGenerator};
use crossbeam::channel::{bounded, unbounded, Sender};
use log::debug;
use std::{
    path::Path,
    thread::{spawn, JoinHandle},
    time::Duration,
};

enum Msg {
    GetEvents {
        until_duration: Duration,
        sndr: Sender<Result<Vec<Event>, anyhow::Error>>,
    },

    Exit,
}

pub fn new_event_generator_actor(
    entrypoint: &Path,
) -> (
    EventGeneratorActorHandle,
    JoinHandle<Result<(), anyhow::Error>>,
) {
    let entrypoint = entrypoint.to_path_buf();
    let (tx, rx) = unbounded();

    let thread = spawn(move || -> anyhow::Result<()> {
        debug!("Event generator thread started, creating event generator");
        let mut event_generator = EventGenerator::create(&entrypoint)?;

        debug!("Event generator created");

        for e in rx.iter() {
            match e {
                Msg::GetEvents {
                    until_duration,
                    sndr,
                } => sndr.send(event_generator.request_notes(until_duration))?,

                Msg::Exit => break,
            }
        }

        debug!("Event generator thread exited");
        Ok(())
    });

    let handle = EventGeneratorActorHandle { tx };

    (handle, thread)
}

#[derive(Clone)]
pub struct EventGeneratorActorHandle {
    tx: Sender<Msg>,
}

impl EventGeneratorActorHandle {
    pub fn get_events(&self, until_duration: Duration) -> anyhow::Result<Vec<Event>> {
        let (tx, rx) = bounded(0);

        self.tx.send(Msg::GetEvents {
            until_duration,
            sndr: tx,
        })?;

        rx.recv()?
    }

    pub fn exit(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Exit)?;
        Ok(())
    }
}
