use deno_core::serde::Deserialize;

pub type Ticks = u32;
pub type NoteValue = u8;
pub type Bpm = u16;

// some highly composable number.
pub const TICKS_PER_BEAT: Ticks = 55440;

#[derive(Deserialize, Debug)]
pub struct ChangeBpm {
    pub bpm: Bpm,
}

#[derive(Deserialize, Debug)]
pub struct NoteOn {
    pub note: NoteValue,
}

impl NoteOn {
    pub fn to_midi_msg(&self) -> [u8; 3] {
        [0x90, self.note, 127u8]
    }
}

#[derive(Deserialize, Debug)]
pub struct NoteOff {
    pub note: NoteValue,
}

impl NoteOff {
    pub fn to_midi_msg(&self) -> [u8; 3] {
        [0x80, self.note, 127u8]
    }
}

#[derive(Deserialize, Debug)]
pub struct AllNotesOff {}

impl AllNotesOff {
    pub fn to_midi_msg(&self) -> [u8; 3] {
        [0xB0, 0, 0]
    }
}

#[derive(Deserialize, Debug)]
pub struct Wait {
    pub ticks: Ticks,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Event {
    NoteOn(NoteOn),
    NoteOff(NoteOff),
    Wait(Wait),
    AllNotesOff(AllNotesOff),
    ChangeBpm(ChangeBpm),
    Print { value: String },
    Marker,
}
