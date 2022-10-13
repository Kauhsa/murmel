use crate::{
    event::Event,
    event_generator_thread::{new_event_generator_actor, EventGeneratorActorHandle},
    player::PlayerEventSource,
};
use crossbeam::channel::{unbounded, Receiver, RecvError, Sender};
use log::{debug, warn};
use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    thread::{spawn, JoinHandle},
    time::Duration,
};

struct EventCoordinatorActor {
    entrypoint: PathBuf,
    rx: Receiver<Msg>,
    events: Arc<Mutex<VecDeque<Event>>>,
    ega: EventGeneratorActorHandle,
    ega_join_handles: Vec<JoinHandle<anyhow::Result<()>>>,
}

#[derive(Debug)]
pub enum Msg {
    LoadMoreEvents { until_duration: Duration },
    ReloadFromNextMarker,
    Exit,
}

impl EventCoordinatorActor {
    pub fn new(entrypoint: PathBuf, rx: Receiver<Msg>) -> Self {
        let events = Arc::new(Mutex::new(VecDeque::<Event>::new()));
        let (ega, ega_jh) = new_event_generator_actor(&entrypoint);

        EventCoordinatorActor {
            rx,
            events,
            ega,
            entrypoint,
            ega_join_handles: vec![ega_jh],
        }
    }

    pub fn run(mut self) -> anyhow::Result<()> {
        loop {
            let e = self.rx.recv();

            debug!("Received event {:?}", e);

            match e {
                Ok(Msg::LoadMoreEvents { until_duration }) => {
                    self.load_more_events(until_duration)?
                }

                Ok(Msg::ReloadFromNextMarker) => {
                    self = self.reload_from_next_marker()?;
                }

                Ok(Msg::Exit) => break,

                Err(RecvError) => {
                    warn!("Channel broken");
                    break;
                }
            }
        }

        // send exit signal to current event generator, otherwise we won't ever
        // be able to join
        self.ega.exit()?;

        for jh in self.ega_join_handles {
            jh.join().unwrap()?;
        }

        Ok(())
    }

    fn reload_from_next_marker(mut self) -> Result<Self, anyhow::Error> {
        let (new_ega, new_ega_jh) = new_event_generator_actor(&self.entrypoint);
        self.ega_join_handles.push(new_ega_jh);

        {
            let mut evs = self.events.lock().unwrap();
            let marker_index = evs.iter().position(|e| matches!(e, Event::Marker));

            match marker_index {
                Some(i) => evs.truncate(i),

                // if there is no marker, we should queue events until we do.
                None => todo!(),
            }
        }

        {
            let old_ega = self.ega;
            self.ega = new_ega;

            // TODO: old_ega is probably going to get
            // dropped here. slow if dropping v8 instance
            // is slow?
            old_ega.exit()?;
        }

        Ok(self)
    }

    pub fn load_more_events(&self, until_duration: Duration) -> anyhow::Result<()> {
        let new_events = self.ega.get_events(until_duration)?;
        let mut events = self.events.lock().unwrap();

        for event in new_events {
            events.push_back(event);
        }

        Ok(())
    }
}

pub fn new_event_coordinator(
    entrypoint: &Path,
) -> (EventCoordinatorActorHandle, JoinHandle<anyhow::Result<()>>) {
    let (tx, rx) = unbounded();
    let ega = EventCoordinatorActor::new(entrypoint.to_path_buf(), rx);
    let events = ega.events.clone();

    let jh = spawn(move || -> Result<(), anyhow::Error> {
        debug!("Event thread started");
        ega.run()?;
        debug!("Event thread ended");
        Ok(())
    });

    let handle = EventCoordinatorActorHandle { tx, events };

    (handle, jh)
}

#[derive(Clone)]
pub struct EventCoordinatorActorHandle {
    tx: Sender<Msg>,
    events: Arc<Mutex<VecDeque<Event>>>,
}

impl EventCoordinatorActorHandle {
    pub fn load_more_events(&self, until_duration: Duration) -> anyhow::Result<()> {
        self.tx.send(Msg::LoadMoreEvents { until_duration })?;
        Ok(())
    }

    pub fn reload_from_next_marker(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::ReloadFromNextMarker)?;
        Ok(())
    }

    pub fn exit(&self) -> anyhow::Result<()> {
        self.tx.send(Msg::Exit)?;
        Ok(())
    }
}

const REQUEST_MORE_WHEN_COUNT_UNDER: usize = 100;
const REQUEST_FOR_DURATION: Duration = Duration::from_secs(1);

impl PlayerEventSource for EventCoordinatorActorHandle {
    fn next(&self) -> Option<Event> {
        let need_mode;
        let event;

        // new scope for mutex.
        {
            let mut events = self.events.lock().unwrap();
            event = events.pop_front();
            need_mode = events.len() < REQUEST_MORE_WHEN_COUNT_UNDER
        }

        if need_mode {
            self.load_more_events(REQUEST_FOR_DURATION)
                .expect("Could not request for more events");
        }

        event
    }
}
