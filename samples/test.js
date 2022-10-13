const note = function* (note, duration) {
    yield { type: "NoteOn", note };
    yield { type: "Wait", duration };
    yield { type: "NoteOff", note };
}

const generator = function* () {
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