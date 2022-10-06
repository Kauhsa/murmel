use std::error::Error;

use deno_core::{op, Extension, JsRuntime, RuntimeOptions};

pub struct NoteGenerator {
    runtime: JsRuntime,
}

impl NoteGenerator {
    pub fn create() -> NoteGenerator {
        let ext = Extension::builder().ops(vec![queue::decl()]).build();

        let runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        NoteGenerator { runtime }
    }

    pub fn run(&mut self) -> Result<(), Box<dyn Error>> {
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
fn queue(nums: Vec<u8>) -> Result<(), deno_core::error::AnyError> {
    println!("{:?}", nums);
    Ok(())
}
