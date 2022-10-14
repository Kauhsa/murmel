use std::{
    io::{stdout, Stdout},
    sync::Mutex,
};

use crossterm::{
    cursor::{MoveTo, MoveToColumn},
    execute,
    style::{Color, Print, ResetColor, SetForegroundColor},
    terminal::{self, ScrollUp},
    ExecutableCommand,
};
use log::{warn, Level, Log, Metadata, Record, SetLoggerError};

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

        log::set_boxed_logger(Box::new(logger))
    }
}

impl Log for CrosstermRawLogger {
    fn enabled(&self, _metadata: &Metadata) -> bool {
        return true;
    }

    fn log(&self, record: &Record) {
        let mut stdout = self.stdout.lock().unwrap();

        execute!(
            stdout,
            SetForegroundColor(Color::DarkGrey),
            Print(record.module_path().unwrap_or("")),
            Print(" "),
            SetForegroundColor(level_to_color(record.level())),
            Print(record.level()),
            Print(" "),
            ResetColor,
            Print(*record.args()),
            ScrollUp(1),
            MoveToColumn(0)
        )
        .unwrap();
    }

    fn flush(&self) {}
}

fn level_to_color(level: Level) -> Color {
    match level {
        Level::Info => Color::Green,
        Level::Warn => Color::Yellow,
        Level::Error => Color::Red,
        Level::Debug => Color::Cyan,
        Level::Trace => Color::Magenta,
    }
}

pub trait LogErr {
    fn log_err(&self) -> ();
}

impl LogErr for Result<(), anyhow::Error> {
    fn log_err(&self) -> () {
        match self {
            Err(e) => {
                warn!("{:?}", e)
            }
            Ok(()) => {}
        }
    }
}
