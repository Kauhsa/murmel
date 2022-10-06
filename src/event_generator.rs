use crate::event::Event;

use std::error::Error;

use crossbeam_channel::Sender;
use deno_core::{op, Extension, JsRuntime, OpState, RuntimeOptions};
use log::debug;

pub struct EventGenerator {
    runtime: JsRuntime,
}

const INIT_SCRIPT: &str = r#"
    const note = function* (n, duration) {
        yield { type: "NoteOn", note: n };
        yield { type: "Break", duration: duration };
        yield { type: "NoteOff", note: n };
    } 

    const generator = function* () {
        while (true) {
            yield* note(40, 100)
            yield* note(41, 100)
            yield* note(42, 100)
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
    pub fn create(sender: Sender<Event>) -> anyhow::Result<EventGenerator> {
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
fn queue(state: &mut OpState, event: Event) -> anyhow::Result<()> {
    let sender = state.borrow::<Sender<Event>>();
    sender.send(event).map_err(anyhow::Error::msg)?;
    Ok(())
}
