export type Event =
    | {
          type: 'NoteOn'
          note: number
      }
    | {
          type: 'Wait'
          ticks: number
      }
    | {
          type: 'NoteOff'
          note: number
      }
    | {
          type: 'Marker'
      }
    | {
          type: 'ChangeBpm'
          bpm: number
      }
    | {
          type: 'Print'
          value: string
      }

export const TICKS_PER_BEAT = 55440
