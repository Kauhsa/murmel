use crate::event_generator::{EventGenerator, RequestNotesParams, RequestNotesResult};
use crossbeam::channel::{bounded, unbounded, Sender};
use log::debug;
use std::{
    path::Path,
    thread::{spawn, JoinHandle},
};

enum Msg {
    GetEvents {
        params: RequestNotesParams,
        sndr: Sender<Result<RequestNotesResult, anyhow::Error>>,
    },

    Exit,
}

pub fn new_event_generator_actor(
    entrypoint: &Path,
    initialized: Sender<anyhow::Result<()>>,
) -> (EventGeneratorActorHandle, JoinHandle<()>) {
    let entrypoint = entrypoint.to_path_buf();
    let (tx, rx) = unbounded();

    let thread = spawn(move || {
        debug!("Event generator thread started, creating event generator");
        let mut event_generator;

        match EventGenerator::create(&entrypoint) {
            Ok(eg) => {
                event_generator = eg;
                let _ = initialized.send(Ok(()));
            }

            Err(e) => {
                let _ = initialized.send(Err(e));
                return;
            }
        }

        debug!("Event generator created");
        for e in rx.iter() {
            match e {
                Msg::GetEvents { params, sndr } => {
                    let _ = sndr.send(event_generator.request_notes(params));
                }

                Msg::Exit => break,
            }
        }

        debug!("Event generator thread exited");
    });

    let handle = EventGeneratorActorHandle { tx };

    (handle, thread)
}

#[derive(Clone)]
pub struct EventGeneratorActorHandle {
    tx: Sender<Msg>,
}

impl EventGeneratorActorHandle {
    pub fn get_events(&self, params: RequestNotesParams) -> anyhow::Result<RequestNotesResult> {
        let (tx, rx) = bounded(0);
        self.tx.send(Msg::GetEvents { params, sndr: tx })?;
        rx.recv()?
    }

    pub fn exit(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Exit)?;
        Ok(())
    }
}
