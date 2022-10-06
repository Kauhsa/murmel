use crate::event::Event;

use std::{error::Error, sync::mpsc::Sender};

use deno_core::{op, Extension, JsRuntime, OpState, RuntimeOptions};
use log::debug;

pub struct EventGenerator {
    runtime: JsRuntime,
}

const INIT_SCRIPT: &str = r#"
    const generator = function* () {
        let i = 0;

        while (true) {
            let n = i % 200;
            yield { type: "NoteOn", note: n };
            yield { type: "Break", duration: 100 };
            yield { type: "NoteOff", note: n };
            yield { type: "Break", duration: 100 };
            i += 1;
        }
    }

    const iterator = generator()

    globalThis.requestNotes = (untilDuration) => {
        let currentDuration = 0;

        if (typeof untilDuration !== 'number') {
            throw new Exception("untilDuration needs to be number")
        }

        while (currentDuration < untilDuration) {
            let { value, done } = iterator.next()

            if (done) {
                break
            }

            if (value.type === "Break") {
                currentDuration += value.duration
            }

            Deno.core.ops.queue(value)
        }        
    }
"#;

impl EventGenerator {
    pub fn create(sender: Sender<Event>) -> Result<EventGenerator, Box<dyn Error>> {
        debug!("Creating EventGenerator");

        let ext = Extension::builder()
            .ops(vec![queue::decl()])
            .state(move |state| {
                state.put(sender.clone());
                Ok(())
            })
            .build();

        let mut runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        debug!("Running init script");

        runtime.execute_script("<create>", INIT_SCRIPT)?;

        debug!("Creation done");

        Ok(EventGenerator { runtime })
    }

    pub fn request_notes(&mut self, until_duration: u32) -> Result<(), Box<dyn Error>> {
        debug!("Requesting notes for {} ms", until_duration);

        let code = format!("globalThis.requestNotes({})", until_duration);

        self.runtime
            .execute_script("<request_notes>", code.as_str())?;

        Ok(())
    }
}

#[op]
fn queue(state: &mut OpState, event: Event) -> Result<(), deno_core::error::AnyError> {
    let sender = state.borrow::<Sender<Event>>();
    sender.send(event)?;
    Ok(())
}
