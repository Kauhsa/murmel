export type Event =
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
