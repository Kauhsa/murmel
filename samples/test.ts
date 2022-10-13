type Event = {
    type: "NoteOn", note: number
} | {
    type: "Wait", duration: string
} | {
    type: "NoteOff", note: number
} | {
    type: "Marker"
}

const note = function* (note, duration): Generator<Event> {
    yield { type: "NoteOn", note };
    yield { type: "Wait", duration };
    yield { type: "NoteOff", note };
}

const generator = function* (): Generator<Event> {
    let base = 2;
    let dur = 100;

    while (true) {
        yield { type: 'Marker'}
        yield* note(base, dur);
        yield* note(base, dur);
        yield* note(base, dur);
        yield* note(base, dur);
    }
}

export default generator()