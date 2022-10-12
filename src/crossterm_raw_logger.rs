use std::{
    io::{stdout, Stdout, Write},
    sync::Mutex,
};

use crossterm::{
    cursor::{MoveTo, MoveToColumn},
    terminal::{self, ScrollUp},
    ExecutableCommand,
};
use log::{LevelFilter, Log, Metadata, Record, SetLoggerError};

pub struct CrosstermRawLogger {
    stdout: Mutex<Stdout>,
}

/* TODO: this it terrible hack that I need to do to get keyboard input. */

impl CrosstermRawLogger {
    pub fn new() -> CrosstermRawLogger {
        CrosstermRawLogger {
            stdout: Mutex::new(stdout()),
        }
    }

    pub fn init() -> Result<(), SetLoggerError> {
        let logger = Self::new();

        {
            let (_, height) = terminal::size().unwrap_or((0, 0));
            let mut stdout = logger.stdout.lock().unwrap();
            stdout.execute(MoveTo(0, height)).unwrap();
        }

        log::set_max_level(LevelFilter::Debug);
        log::set_boxed_logger(Box::new(logger))
    }
}

impl Log for CrosstermRawLogger {
    fn enabled(&self, _metadata: &Metadata) -> bool {
        return true;
    }

    fn log(&self, record: &Record) {
        let mut stdout = self.stdout.lock().unwrap();
        stdout.write_fmt(*record.args()).unwrap();
        stdout.execute(ScrollUp(1)).unwrap();
        stdout.execute(MoveToColumn(0)).unwrap();
    }

    fn flush(&self) {}
}
