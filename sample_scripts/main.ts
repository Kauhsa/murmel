import { TICKS_PER_BEAT, Event } from './murmel-std'
import { Note } from './tonal/tonal.js'

const note = function* (note: number, beats: number): Generator<Event> {
    yield { type: 'NoteOn', note }
    yield { type: 'Wait', ticks: beats * TICKS_PER_BEAT }
    yield { type: 'NoteOff', note }
}

const generator = function* (): Generator<Event> {
    let base = Note.midi('C1')!
    let bpm = 120

    while (true) {
        yield { type: 'ChangeBpm', bpm }
        yield { type: 'Marker' }
        yield* note(base, 0.25)
        yield* note(base, 0.25)
        yield* note(base, 0.25)
        yield* note(base, 0.25)
        bpm++
    }
}

const res: Iterator<Event> = generator()

export default res
