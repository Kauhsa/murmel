use deno_core::serde::Deserialize;

/** beats? milliseconds? dunno yet. */
pub type NoteDuration = u32;
pub type NoteValue = u8;

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Event {
    NoteOn { note: NoteValue },
    NoteOff { note: NoteValue },
    Break { duration: NoteDuration },
    Print { value: String },
}
