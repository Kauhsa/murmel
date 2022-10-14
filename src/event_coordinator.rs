use crate::{
    crossterm_raw_logger::LogErr,
    event::Event,
    event_generator_thread::{new_event_generator_actor, EventGeneratorActorHandle},
    player::PlayerEventSource,
};
use anyhow::anyhow;
use crossbeam::channel::{bounded, unbounded, Receiver, RecvError, Sender};
use log::{debug, warn};
use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    thread::{spawn, JoinHandle},
    time::Duration,
};

const REQUEST_MORE_WHEN_COUNT_UNDER: usize = 100;
const REQUEST_FOR_DURATION: Duration = Duration::from_secs(1);

struct EventCoordinatorActor {
    entrypoint: PathBuf,
    rx: Receiver<Msg>,
    events: Arc<Mutex<VecDeque<Event>>>,
    ega: Option<EventGeneratorActorHandle>,
    ega_join_handles: Vec<JoinHandle<()>>,
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
        let mut ega_join_handles = vec![];

        let ega = match Self::initialize_ega(&entrypoint) {
            Ok((ega, ega_jh)) => {
                ega_join_handles.push(ega_jh);
                Some(ega)
            }
            Err(e) => {
                warn!("Could not initialize ega: {:?}", e);
                None
            }
        };

        let ega = EventCoordinatorActor {
            rx,
            events,
            ega,
            entrypoint,
            ega_join_handles,
        };

        ega.load_more_events(REQUEST_FOR_DURATION)
    }

    pub fn run(mut self) -> anyhow::Result<()> {
        loop {
            let e = self.rx.recv();

            debug!("Received event {:?}", e);

            match e {
                Ok(Msg::LoadMoreEvents { until_duration }) => {
                    self = self.load_more_events(until_duration);
                }

                Ok(Msg::ReloadFromNextMarker) => {
                    self = self.reload_from_next_marker();
                }

                Ok(Msg::Exit) => break,

                Err(RecvError) => {
                    warn!("Channel broken");
                    break;
                }
            }
        }

        // send exit signal to current event generator, otherwise we won't ever
        // be able to join it
        match self.ega {
            Some(ega) => ega.exit().unwrap(),
            None => (),
        };

        for jh in self.ega_join_handles {
            jh.join().unwrap();
        }

        Ok(())
    }

    fn reload_from_next_marker(mut self) -> Self {
        let new_ega = match Self::initialize_ega(&self.entrypoint) {
            Ok((ega, ega_jh)) => {
                self.ega_join_handles.push(ega_jh);
                ega
            }
            Err(e) => {
                warn!("Could not initialize new event generator: {:?}", e);
                return self;
            }
        };

        {
            let mut evs = self.events.lock().unwrap();
            let marker_index = evs.iter().position(|e| matches!(e, Event::Marker));

            match marker_index {
                Some(i) => evs.truncate(i),

                // if there is no marker, we should queue events until we do.
                None => {
                    warn!("No marker found, clearing all events");
                    evs.clear()
                }
            }
        }

        {
            let old_ega = self.ega;
            self.ega = Some(new_ega);

            match old_ega {
                Some(ega) => ega.exit().log_err(),
                None => (),
            }

            // TODO: old_ega is probably going to get
            // dropped here. slow if dropping v8 instance
            // is slow?
        }

        // get immediately some new events to the system!
        self.load_more_events(REQUEST_FOR_DURATION)
    }

    fn load_more_events(self, until_duration: Duration) -> Self {
        match &self.ega {
            Some(ega) => {
                match ega.get_events(until_duration) {
                    Ok(res) => {
                        let mut events = self.events.lock().unwrap();

                        for event in res.events {
                            events.push_back(event);
                        }
                    }

                    Err(e) => {
                        warn!("Error while retrieving more events: {:?}", e)
                    }
                };
            }

            None => {
                warn!("No event generator initialized, cannot load events");
            }
        }

        self
    }

    fn initialize_ega(
        entrypoint: &Path,
    ) -> anyhow::Result<(EventGeneratorActorHandle, JoinHandle<()>)> {
        let (initialized_tx, initialized_rx) = bounded(0);
        let (ega, ega_jh) = new_event_generator_actor(entrypoint, initialized_tx);

        match initialized_rx.recv() {
            Ok(Ok(())) => Ok((ega, ega_jh)),
            Ok(Err(e)) => Err(e),
            Err(e) => Err(anyhow!("Could not initialize ega {:?}", e)),
        }
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
            match self.load_more_events(REQUEST_FOR_DURATION) {
                Err(e) => warn!("Could not request for more events: {:?}", e),
                _ => (),
            }
        }

        event
    }
}
