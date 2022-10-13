import { Event } from './stdlib'
import { Note } from './tonal/tonal.js'

const note = function* (note: number, duration: number): Generator<Event> {
    yield { type: 'NoteOn', note }
    yield { type: 'Wait', duration }
    yield { type: 'NoteOff', note }
}

const generator = function* (): Generator<Event> {
    let base = Note.midi('C4')!
    let dur = 250

    while (true) {
        yield { type: 'Marker' }
        yield* note(base, dur)
        yield* note(base, dur)
        yield* note(base, dur)
        yield* note(base, dur)
    }
}

const res: Iterator<Event> = generator()

export default res
