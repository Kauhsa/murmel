const note = function* (note, duration) {
    yield { type: "NoteOn", note };
    yield { type: "Wait", duration };
    yield { type: "NoteOff", note };
}

const generator = function* () {
    let base = 1;

    while (true) {
        yield { type: 'Marker'}
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
        yield* note(base, 100);
    }
}

export default generator()