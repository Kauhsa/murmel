use std::{
    collections::VecDeque,
    fs,
    path::Path,
    sync::{Arc, Mutex},
    thread::{self, spawn, JoinHandle},
    time::Duration,
};

use crossbeam::channel::{bounded, Receiver, RecvError, Sender};
use log::{debug, warn};

use crate::{event::Event, event_generator::EventGenerator, player::PlayerEventSource};

pub struct EventThread {
    pub handle: JoinHandle<Result<(), anyhow::Error>>,
    action_tx: Sender<Action>,
    events: Arc<Mutex<VecDeque<Event>>>,
}

enum Action {
    GetEvents { until_duration: Duration },
    ReloadFromNextMarker,
    Exit,
}

impl EventThread {
    pub fn spawn(entrypoint: &Path) -> Result<Self, anyhow::Error> {
        let entrypoint = fs::canonicalize(entrypoint)?;
        let (action_tx, action_rx) = bounded::<Action>(128);

        let events = Arc::new(Mutex::new(VecDeque::<Event>::new()));
        let events_for_thread = events.clone();

        let handle = thread::Builder::new()
            .name("event_thread".to_string())
            .spawn(move || -> Result<(), anyhow::Error> {
                debug!("Event thread started");

                let mut egt = new_event_generator_thread(&entrypoint);
                egt.ready.recv()?;

                let events = events_for_thread;

                // TODO: lotta unwrap in this loop!
                loop {
                    match action_rx.recv() {
                        Ok(Action::GetEvents { until_duration }) => {
                            // TODO: bad idea to generate a new receiver every time. probably.
                            let (sender, receiver) = bounded(1);

                            egt.sender.send(TAction::GetEvents {
                                until_duration,
                                sender,
                            })?;

                            let new_events = receiver.recv()??;
                            let mut events = events.lock().unwrap();

                            for event in new_events {
                                events.push_front(event);
                            }
                        }

                        Ok(Action::ReloadFromNextMarker) => {
                            // start initializing a new event generator
                            let new_egt = new_event_generator_thread(&entrypoint);

                            // where is the marker? truncate data.
                            {
                                let mut evs = events.lock().unwrap();
                                let marker_index =
                                    evs.iter().position(|x| matches!(x, Event::Marker));

                                match marker_index {
                                    Some(i) => evs.truncate(i),
                                    None => todo!(),
                                }
                            }

                            // replace the event generator
                            {
                                new_egt.ready.recv()?;
                                let old_egt = egt;
                                egt = new_egt;

                                // drop old egt in another thread. might be slow?
                                spawn(move || drop(old_egt));
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

    pub fn reload_from_next_marker(&self) -> Result<(), anyhow::Error> {
        self.action_tx
            .send(Action::ReloadFromNextMarker)
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

enum TAction {
    GetEvents {
        until_duration: Duration,
        sender: Sender<Result<Vec<Event>, anyhow::Error>>,
    },
}

struct NewEventGeneratorResult {
    sender: Sender<TAction>,
    ready: Receiver<()>,
}

fn new_event_generator_thread(entrypoint: &Path) -> NewEventGeneratorResult {
    let entrypoint = entrypoint.to_path_buf();
    let (action_tx, action_rx) = bounded::<TAction>(128);
    let (ready_sender, ready_receiver) = bounded::<()>(1);

    spawn(move || -> anyhow::Result<()> {
        debug!("Event generator thread started, creating event generator");
        let mut event_generator = EventGenerator::create(&entrypoint)?;

        debug!("Event generator created");
        ready_sender.send(())?;

        for e in action_rx.iter() {
            match e {
                TAction::GetEvents {
                    until_duration,
                    sender,
                } => {
                    let new_events = event_generator.request_notes(until_duration);
                    sender.send(new_events)?;
                }
            }
        }

        debug!("Event generator thread exited");
        Ok(())
    });

    NewEventGeneratorResult {
        sender: action_tx,
        ready: ready_receiver,
    }
}
