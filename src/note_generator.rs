use crate::note::Note;

use std::{error::Error, sync::mpsc::Sender};

use deno_core::{op, Extension, JsRuntime, OpState, RuntimeOptions};

pub struct NoteGenerator {
    runtime: JsRuntime,
}

impl NoteGenerator {
    pub fn create(sender: Sender<Note>) -> NoteGenerator {
        let ext = Extension::builder()
            .ops(vec![queue::decl()])
            .state(move |state| {
                state.put(sender.clone());
                Ok(())
            })
            .build();

        let runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        NoteGenerator { runtime }
    }

    pub fn request_notes(&mut self) -> Result<(), Box<dyn Error>> {
        let script: &str = r#"
            Deno.core.ops.queue([1, 2, 3, 99, -1000]);
            Deno.core.ops.queue([1, 2, 3, 99, -1000]);
            Deno.core.ops.queue([1, 2, 3, 99, -1000]);
            Deno.core.ops.queue([1, 2, 3, 99, -1000]);
        "#;

        self.runtime.execute_script("<run>", script)?;

        Ok(())
    }
}

#[op]
fn queue(state: &mut OpState, note: Note) -> Result<(), deno_core::error::AnyError> {
    let sender = state.borrow::<Sender<Note>>();
    sender.send(note)?;
    Ok(())
}
