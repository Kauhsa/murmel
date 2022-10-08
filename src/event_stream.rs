use std::sync::atomic::{AtomicBool, Ordering};

use crossbeam::queue::SegQueue;

use crate::event::Event;

pub struct EventStream {
    current_queue: SegQueue<Event>,
    empty_on_next_marker: AtomicBool,
}

impl EventStream {
    pub fn new() -> Self {
        EventStream {
            current_queue: SegQueue::new(),
            empty_on_next_marker: AtomicBool::new(false),
        }
    }

    pub fn push_event(&self, e: Event) {
        self.current_queue.push(e)
    }

    pub fn get_event(&self) -> Option<Event> {
        self.current_queue.pop()
    }

    pub fn switch_on_next_marker(&self) {
        self.empty_on_next_marker.store(true, Ordering::Relaxed)
    }
}
