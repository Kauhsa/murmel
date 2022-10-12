const note = function* (note, duration) {
    yield { type: "NoteOn", note };
    yield { type: "Wait", duration };
    yield { type: "NoteOff", note };
}

const generator = function* () {
    let base = 20;
    let dur = 250;

    while (true) {
        yield { type: 'Marker'}
        yield* note(base, dur);
        yield* note(base, dur);
        yield* note(base, dur);
        yield* note(base, dur);
    }
}

export default generator()