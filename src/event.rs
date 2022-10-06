use deno_core::serde::Deserialize;

// beats? dunno.
pub type Duration = u32;

// notes
pub type Note = u8;

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Event {
    NoteOn { note: Note },
    NoteOff { note: Note },
    Break { duration: Duration },
}
