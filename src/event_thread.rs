use std::{
    collections::VecDeque,
    fs,
    path::Path,
    sync::{Arc, Mutex},
    thread::{self, JoinHandle},
    time::Duration,
};

use crossbeam::channel::{bounded, RecvError, Sender};
use log::{debug, warn};

use crate::{event::Event, event_generator::EventGenerator, player::PlayerEventSource};

pub struct EventThread {
    pub handle: JoinHandle<Result<(), anyhow::Error>>,
    action_tx: Sender<Action>,
    events: Arc<Mutex<VecDeque<Event>>>,
}

enum Action {
    GetEvents { until_duration: Duration },
    DropFromNextMarker,
    Exit,
}

impl EventThread {
    pub fn spawn(entrypoint: &Path) -> Result<Self, anyhow::Error> {
        let entrypoint = fs::canonicalize(entrypoint).unwrap();
        let (action_tx, action_rx) = bounded::<Action>(128);

        let events = Arc::new(Mutex::new(VecDeque::<Event>::new()));
        let events_for_thread = events.clone();

        let handle = thread::Builder::new()
            .name("event_thread".to_string())
            .spawn(move || -> Result<(), anyhow::Error> {
                debug!("Event thread started");

                let events = events_for_thread;

                let mut event_generator = EventGenerator::create(entrypoint.as_path())?;

                // TODO: lotta unwrap in this loop!
                loop {
                    match action_rx.recv() {
                        Ok(Action::GetEvents { until_duration }) => {
                            let new_events = event_generator.request_notes(until_duration).unwrap();
                            let mut events = events.lock().unwrap();

                            for event in new_events {
                                events.push_front(event);
                            }
                        }

                        Ok(Action::DropFromNextMarker) => {
                            let mut evs = events.lock().unwrap();
                            let marker_index = evs.iter().position(|x| matches!(x, Event::Marker));

                            match marker_index {
                                Some(i) => evs.truncate(i),
                                None => todo!(),
                            }
                        }

                        Ok(Action::Exit) => break,

                        Err(RecvError) => {
                            warn!("could not receive action");
                            break;
                        }
                    }
                }

                debug!("Event thread ended");

                Ok(())
            })?;

        return Ok(EventThread {
            handle,
            action_tx,
            events,
        });
    }

    pub fn exit(&self) -> Result<(), anyhow::Error> {
        self.action_tx
            .send(Action::Exit)
            .map_err(anyhow::Error::new)
    }

    pub fn load_more_events(&self, until_duration: Duration) -> Result<(), anyhow::Error> {
        self.action_tx
            .send(Action::GetEvents { until_duration })
            .map_err(anyhow::Error::new)
    }
}

const REQUEST_MORE_WHEN_COUNT_UNDER: usize = 100;

impl PlayerEventSource for EventThread {
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
            self.load_more_events(Duration::from_millis(1000)).unwrap()
        }

        event
    }
}
