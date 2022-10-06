use crate::note::Note;

use std::{error::Error, sync::mpsc::Sender};

use deno_core::{op, Extension, JsRuntime, OpState, RuntimeOptions};

pub struct NoteGenerator {
    runtime: JsRuntime,
}

const INIT_SCRIPT: &str = r#"
    const generator = function* () {
        let i = 0;

        while (i < 5) {
            yield [i];
            i += 1;
        }
    }

    const iterator = generator()

    globalThis.next = () => {
        let { value, done } = iterator.next()
    
        if (!done) {
            Deno.core.ops.queue(value)
        }
    }
"#;

const ITERATE: &str = r#"  
    globalThis.next()
"#;

impl NoteGenerator {
    pub fn create(sender: Sender<Note>) -> Result<NoteGenerator, Box<dyn Error>> {
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

        runtime.execute_script("<create>", INIT_SCRIPT)?;

        Ok(NoteGenerator { runtime })
    }

    pub fn request_notes(&mut self) -> Result<(), Box<dyn Error>> {
        self.runtime.execute_script("<request_notes>", ITERATE)?;
        Ok(())
    }
}

#[op]
fn queue(state: &mut OpState, note: Note) -> Result<(), deno_core::error::AnyError> {
    let sender = state.borrow::<Sender<Note>>();
    sender.send(note)?;
    Ok(())
}
