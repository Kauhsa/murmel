use deno_core::serde::Deserialize;

/** beats? milliseconds? dunno yet. */
pub type NoteDuration = f32;
pub type NoteValue = u8;

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Event {
    NoteOn { note: NoteValue },
    NoteOff { note: NoteValue },
    Break { duration: NoteDuration },
    Print { value: String },
}

impl Event {
    pub fn to_midi_msg(&self) -> Option<[u8; 3]> {
        const NOTE_ON_MSG: u8 = 0x90;
        const NOTE_OFF_MSG: u8 = 0x80;

        let velocity = 128u8;

        match self {
            Event::NoteOn { note } => Some([NOTE_ON_MSG, *note, velocity]),
            Event::NoteOff { note } => Some([NOTE_OFF_MSG, *note, velocity]),
            _ => None,
        }
    }
}
