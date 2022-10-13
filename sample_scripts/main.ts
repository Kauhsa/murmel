type Event =
    | {
          type: 'NoteOn'
          note: number
      }
    | {
          type: 'Wait'
          duration: number
      }
    | {
          type: 'NoteOff'
          note: number
      }
    | {
          type: 'Marker'
      }

const note = function* (note: number, duration: number): Generator<Event> {
    yield { type: 'NoteOn', note }
    yield { type: 'Wait', duration }
    yield { type: 'NoteOff', note }
}

const generator = function* (): Generator<Event> {
    let base = 3
    let dur = 100

    while (true) {
        yield { type: 'Marker' }
        yield* note(base, dur)
        yield* note(base, dur)
        yield* note(base, dur)
        yield* note(base, dur)
    }
}

export default generator()
