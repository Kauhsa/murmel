const note = function* (note, duration) {
    yield { type: "NoteOn", note };
    yield { type: "Wait", duration };
    yield { type: "NoteOff", note };
}

const generator = function* () {
    let i = 0;

    while (true) {
        yield* note(i % 127, 100);
        i++;
    }
}

export default generator()