const note = function* (n, duration) {
    yield { type: "NoteOn", note: n };
    yield { type: "Wait", duration: duration };
    yield { type: "NoteOff", note: n };
}

const generator = function* () {
    while (true) {
        yield* note(40, 100)
        yield* note(41, 100)
        yield* note(42, 100)
    }
}

export default generator()