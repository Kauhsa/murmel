use crate::{event::Event, ts_module_loader::TypescriptModuleLoader};

use std::{path::Path, rc::Rc, time::Duration};

use anyhow::anyhow;
use deno_core::{
    serde_v8,
    url::Url,
    v8::{self, HandleScope},
    JsRuntime, ModuleId, RuntimeOptions,
};
use log::{debug, info};
use serde::Deserialize;
use tokio::runtime::Runtime;

pub struct EventGenerator {
    #[allow(dead_code)]
    async_runtime: Runtime,
    js_runtime: JsRuntime,
    module_id: ModuleId,
}

impl EventGenerator {
    pub fn create(entrypoint: &Path) -> anyhow::Result<EventGenerator> {
        let async_runtime = Runtime::new().unwrap();

        info!("Initializing JS runtime");

        let mut js_runtime = JsRuntime::new(RuntimeOptions {
            module_loader: Some(Rc::new(TypescriptModuleLoader)),
            ..Default::default()
        });

        info!(
            "Loading main module from path {}",
            entrypoint.to_string_lossy()
        );

        let module_id = load_main_module(async_runtime.handle(), &mut js_runtime, entrypoint)?;

        info!("Main module loaded");

        Ok(EventGenerator {
            js_runtime,
            async_runtime,
            module_id,
        })
    }

    pub fn request_notes(&mut self, until_duration: Duration) -> Result<Vec<Event>, anyhow::Error> {
        let module = self.js_runtime.get_module_namespace(self.module_id)?;
        let isolate = self.js_runtime.v8_isolate();
        let val = module.open(isolate);

        let scope = &mut self.js_runtime.handle_scope();
        let default_str = v8::String::new(scope, "default").unwrap();
        let default_export = val.get(scope, default_str.into()).unwrap();

        let mut dur = Duration::ZERO;

        let mut events = vec![];

        while dur < until_duration {
            let EventGeneratorResult { done, value } =
                call_generator_function(scope, default_export)?;

            if done {
                debug!("Iterable is empty");
                break;
            }

            match value {
                Some(event) => {
                    if let Event::Wait(wait_event) = &event {
                        dur += Duration::from_secs_f32(wait_event.duration / 1000.0)
                    }

                    events.push(event)
                }
                None => {
                    debug!("No event, even though iterable is done")
                }
            }
        }

        Ok(events)
    }
}

#[derive(Deserialize, Debug)]
struct EventGeneratorResult {
    pub value: Option<Event>,
    pub done: bool,
}

fn load_main_module(
    executor: &tokio::runtime::Handle,
    js_runtime: &mut JsRuntime,
    entrypoint: &Path,
) -> Result<ModuleId, anyhow::Error> {
    let url = Url::from_file_path(entrypoint).map_err(|()| {
        anyhow!(
            "Could not get URL from entrypoint {}",
            entrypoint.as_os_str().to_string_lossy()
        )
    })?;

    let future = async {
        let module_id = js_runtime.load_main_module(&url, None).await?;
        let eval = js_runtime.mod_evaluate(module_id);
        js_runtime.run_event_loop(true).await?;
        eval.await??;

        Ok::<ModuleId, anyhow::Error>(module_id)
    };

    let module_id = executor.block_on(future)?;
    Ok(module_id)
}

fn call_generator_function(
    scope: &mut HandleScope,
    iterable: v8::Local<v8::Value>,
) -> Result<EventGeneratorResult, anyhow::Error> {
    if iterable.is_undefined() || iterable.is_null() {
        return Err(anyhow!("Iterable was undefined or null"));
    }

    let next_str = v8::String::new(scope, "next").unwrap();

    let next_fn_value = iterable
        .to_object(scope)
        .ok_or_else(|| anyhow!("Expected iterable to be an object"))?
        .get(scope, next_str.into())
        .ok_or_else(|| anyhow!("Could not get key 'next' from iterable object"))?;

    let next_fn = v8::Local::<v8::Function>::try_from(next_fn_value)
        .map_err(|e| anyhow::Error::new(e).context("Excepted next() to be a function"))?;

    let result_value = next_fn
        .call(scope, iterable, &[])
        .ok_or_else(|| anyhow!("Calling next() failed"))?;

    let result = serde_v8::from_v8::<EventGeneratorResult>(scope, result_value)?;

    Ok(result)
}
