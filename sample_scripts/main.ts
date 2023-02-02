import { Event, TICKS_PER_BEAT } from './murmel-std'
import { Note, Scale, Chord } from './tonal/tonal.mjs'

const note = function* (note: number, ticks: number): Generator<Event> {
    yield { type: 'NoteOn', note }
    yield { type: 'Wait', ticks }
    yield { type: 'NoteOff', note }
}

const generator = function* (): Generator<Event> {
    let chromatic = Scale.get('C4 chromatic').notes
    let i = 0

    yield { type: 'ChangeBpm', bpm: 140 }

    while (true) {
        yield { type: 'Marker' }
        yield { type: 'Print', value: 'New iteration!' }

        for (let a = 0; a < 12; a++) {
            let current = chromatic[i % chromatic.length]
            let chord = Chord.getChord('minor', current)

            yield { type: 'Print', value: chord.symbol }

            for (let i = 0; i < 4; i++) {
                for (const n of chord.notes) {
                    yield* note(Note.midi(n)!, TICKS_PER_BEAT / 4)
                }
            }

            i += 5 // advance in fifths
        }
    }
}

const res: Iterator<Event> = generator()

export default res
