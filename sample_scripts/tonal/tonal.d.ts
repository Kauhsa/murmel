/**
 * Fill a string with a repeated character
 *
 * @param character
 * @param repetition
 */
declare const fillStr: (s: string, n: number) => string;
declare function deprecate<ResultFn extends (this: any, ...newArgs: any[]) => ReturnType<ResultFn>>(original: string, alternative: string, fn: ResultFn): (this: unknown, ...args: unknown[]) => ReturnType<ResultFn>;

interface Named {
    readonly name: string;
}
interface NamedFound {
    readonly empty: false;
}
interface NotFound extends Named {
    readonly empty: true;
    readonly name: "";
}
declare function isNamed(src: any): src is Named;

declare type Fifths = number;
declare type Octaves = number;
declare type Direction = 1 | -1;
declare type PitchClassCoordinates = [Fifths];
declare type NoteCoordinates = [Fifths, Octaves];
declare type IntervalCoordinates = [Fifths, Octaves, Direction];
declare type PitchCoordinates = PitchClassCoordinates | NoteCoordinates | IntervalCoordinates;
/**
 * Pitch properties
 *
 * - {number} step - The step number: 0 = C, 1 = D, ... 6 = B
 * - {number} alt - Number of alterations: -2 = 'bb', -1 = 'b', 0 = '', 1 = '#', ...
 * - {number} [oct] = The octave (undefined when is a coord class)
 * - {number} [dir] = Interval direction (undefined when is not an interval)
 */
interface Pitch {
    readonly step: number;
    readonly alt: number;
    readonly oct?: number;
    readonly dir?: Direction;
}
declare function isPitch(pitch: any): pitch is Pitch;
declare function encode(pitch: Pitch): PitchCoordinates;
declare function decode(coord: PitchCoordinates): Pitch;

declare type NoteWithOctave = string;
declare type PcName = string;
declare type NoteName = NoteWithOctave | PcName;
declare type NoteLiteral = NoteName | Pitch | Named;
interface Note extends Pitch, Named {
    readonly empty: boolean;
    readonly name: NoteName;
    readonly letter: string;
    readonly acc: string;
    readonly pc: PcName;
    readonly chroma: number;
    readonly height: number;
    readonly coord: PitchCoordinates;
    readonly midi: number | null;
    readonly freq: number | null;
}
interface NoNote extends Partial<Note> {
    empty: true;
    name: "";
    pc: "";
    acc: "";
}
declare const stepToLetter: (step: number) => string;
declare const altToAcc: (alt: number) => string;
declare const accToAlt: (acc: string) => number;
/**
 * Given a note literal (a note name or a note object), returns the Note object
 * @example
 * note('Bb4') // => { name: "Bb4", midi: 70, chroma: 10, ... }
 */
declare function note(src: NoteLiteral): Note | NoNote;
declare type NoteTokens = [string, string, string, string];
/**
 * @private
 */
declare function tokenizeNote(str: string): NoteTokens;
/**
 * @private
 */
declare function coordToNote(noteCoord: PitchCoordinates): Note;

declare type IntervalName = string;
declare type IntervalLiteral = IntervalName | Pitch | Named;
declare type Quality = "dddd" | "ddd" | "dd" | "d" | "m" | "M" | "P" | "A" | "AA" | "AAA" | "AAAA";
declare type Type = "perfectable" | "majorable";
interface Interval extends Pitch, Named {
    readonly empty: boolean;
    readonly name: IntervalName;
    readonly num: number;
    readonly q: Quality;
    readonly type: Type;
    readonly step: number;
    readonly alt: number;
    readonly dir: Direction;
    readonly simple: number;
    readonly semitones: number;
    readonly chroma: number;
    readonly coord: IntervalCoordinates;
    readonly oct: number;
}
interface NoInterval extends Partial<Interval> {
    readonly empty: true;
    readonly name: "";
    readonly acc: "";
}
declare type IntervalTokens = [string, string];
/**
 * @private
 */
declare function tokenizeInterval(str?: IntervalName): IntervalTokens;
/**
 * Get interval properties. It returns an object with:
 *
 * - name: the interval name
 * - num: the interval number
 * - type: 'perfectable' or 'majorable'
 * - q: the interval quality (d, m, M, A)
 * - dir: interval direction (1 ascending, -1 descending)
 * - simple: the simplified number
 * - semitones: the size in semitones
 * - chroma: the interval chroma
 *
 * @param {string} interval - the interval name
 * @return {Object} the interval properties
 *
 * @example
 * import { interval } from '@tonaljs/core'
 * interval('P5').semitones // => 7
 * interval('m3').type // => 'majorable'
 */
declare function interval(src: IntervalLiteral): Interval | NoInterval;
/**
 * @private
 *
 * forceDescending is used in the case of unison (#243)
 */
declare function coordToInterval(coord: PitchCoordinates, forceDescending?: boolean): Interval;

/**
 * Transpose a note by an interval.
 *
 * @param {string} note - the note or note name
 * @param {string} interval - the interval or interval name
 * @return {string} the transposed note name or empty string if not valid notes
 * @example
 * import { tranpose } from "@tonaljs/core"
 * transpose("d3", "3M") // => "F#3"
 * transpose("D", "3M") // => "F#"
 * ["C", "D", "E", "F", "G"].map(pc => transpose(pc, "M3)) // => ["E", "F#", "G#", "A", "B"]
 */
declare function transpose$2(noteName: NoteLiteral, intervalName: IntervalLiteral): NoteName;
/**
 * Find the interval distance between two notes or coord classes.
 *
 * To find distance between coord classes, both notes must be coord classes and
 * the interval is always ascending
 *
 * @param {Note|string} from - the note or note name to calculate distance from
 * @param {Note|string} to - the note or note name to calculate distance to
 * @return {string} the interval name or empty string if not valid notes
 *
 */
declare function distance$2(fromNote: NoteLiteral, toNote: NoteLiteral): IntervalName;

type Core_Direction = Direction;
type Core_Interval = Interval;
type Core_IntervalCoordinates = IntervalCoordinates;
type Core_IntervalLiteral = IntervalLiteral;
type Core_IntervalName = IntervalName;
type Core_Named = Named;
type Core_NamedFound = NamedFound;
type Core_NoInterval = NoInterval;
type Core_NoNote = NoNote;
type Core_NotFound = NotFound;
type Core_Note = Note;
type Core_NoteCoordinates = NoteCoordinates;
type Core_NoteLiteral = NoteLiteral;
type Core_NoteName = NoteName;
type Core_NoteWithOctave = NoteWithOctave;
type Core_PcName = PcName;
type Core_Pitch = Pitch;
type Core_PitchClassCoordinates = PitchClassCoordinates;
type Core_PitchCoordinates = PitchCoordinates;
declare const Core_accToAlt: typeof accToAlt;
declare const Core_altToAcc: typeof altToAcc;
declare const Core_coordToInterval: typeof coordToInterval;
declare const Core_coordToNote: typeof coordToNote;
declare const Core_decode: typeof decode;
declare const Core_deprecate: typeof deprecate;
declare const Core_encode: typeof encode;
declare const Core_fillStr: typeof fillStr;
declare const Core_interval: typeof interval;
declare const Core_isNamed: typeof isNamed;
declare const Core_isPitch: typeof isPitch;
declare const Core_note: typeof note;
declare const Core_stepToLetter: typeof stepToLetter;
declare const Core_tokenizeInterval: typeof tokenizeInterval;
declare const Core_tokenizeNote: typeof tokenizeNote;
declare namespace Core {
  export {
    Core_Direction as Direction,
    Core_Interval as Interval,
    Core_IntervalCoordinates as IntervalCoordinates,
    Core_IntervalLiteral as IntervalLiteral,
    Core_IntervalName as IntervalName,
    Core_Named as Named,
    Core_NamedFound as NamedFound,
    Core_NoInterval as NoInterval,
    Core_NoNote as NoNote,
    Core_NotFound as NotFound,
    Core_Note as Note,
    Core_NoteCoordinates as NoteCoordinates,
    Core_NoteLiteral as NoteLiteral,
    Core_NoteName as NoteName,
    Core_NoteWithOctave as NoteWithOctave,
    Core_PcName as PcName,
    Core_Pitch as Pitch,
    Core_PitchClassCoordinates as PitchClassCoordinates,
    Core_PitchCoordinates as PitchCoordinates,
    Core_accToAlt as accToAlt,
    Core_altToAcc as altToAcc,
    Core_coordToInterval as coordToInterval,
    Core_coordToNote as coordToNote,
    Core_decode as decode,
    Core_deprecate as deprecate,
    distance$2 as distance,
    Core_encode as encode,
    Core_fillStr as fillStr,
    Core_interval as interval,
    Core_isNamed as isNamed,
    Core_isPitch as isPitch,
    Core_note as note,
    Core_stepToLetter as stepToLetter,
    Core_tokenizeInterval as tokenizeInterval,
    Core_tokenizeNote as tokenizeNote,
    transpose$2 as transpose,
  };
}

/**
 * The properties of a pitch class set
 * @param {number} num - a number between 1 and 4095 (both included) that
 * uniquely identifies the set. It's the decimal number of the chrom.
 * @param {string} chroma - a string representation of the set: a 12-char string
 * with either "1" or "0" as characters, representing a pitch class or not
 * for the given position in the octave. For example, a "1" at index 0 means 'C',
 * a "1" at index 2 means 'D', and so on...
 * @param {string} normalized - the chroma but shifted to the first 1
 * @param {number} length - the number of notes of the pitch class set
 * @param {IntervalName[]} intervals - the intervals of the pitch class set
 * *starting from C*
 */
interface Pcset extends Named {
    readonly empty: boolean;
    readonly setNum: number;
    readonly chroma: PcsetChroma;
    readonly normalized: PcsetChroma;
    readonly intervals: IntervalName[];
}
declare type PcsetChroma = string;
declare type PcsetNum = number;
/**
 * A definition of a pitch class set. It could be:
 * - The pitch class set chroma (a 12-length string with only 1s or 0s)
 * - The pitch class set number (an integer between 1 and 4095)
 * - An array of note names
 * - An array of interval names
 */
declare type Set = Partial<Pcset> | PcsetChroma | PcsetNum | NoteName[] | IntervalName[];
/**
 * Get the pitch class set of a collection of notes or set number or chroma
 */
declare function get$8(src: Set): Pcset;
/**
 * Get a list of all possible pitch class sets (all possible chromas) *having
 * C as root*. There are 2048 different chromas. If you want them with another
 * note you have to transpose it
 *
 * @see http://allthescales.org/
 * @return {Array<PcsetChroma>} an array of possible chromas from '10000000000' to '11111111111'
 */
declare function chromas(): PcsetChroma[];
/**
 * Given a a list of notes or a pcset chroma, produce the rotations
 * of the chroma discarding the ones that starts with "0"
 *
 * This is used, for example, to get all the modes of a scale.
 *
 * @param {Array|string} set - the list of notes or pitchChr of the set
 * @param {boolean} normalize - (Optional, true by default) remove all
 * the rotations that starts with "0"
 * @return {Array<string>} an array with all the modes of the chroma
 *
 * @example
 * Pcset.modes(["C", "D", "E"]).map(Pcset.intervals)
 */
declare function modes(set: Set, normalize?: boolean): PcsetChroma[];
/**
 * Test if two pitch class sets are numentical
 *
 * @param {Array|string} set1 - one of the pitch class sets
 * @param {Array|string} set2 - the other pitch class set
 * @return {boolean} true if they are equal
 * @example
 * Pcset.isEqual(["c2", "d3"], ["c5", "d2"]) // => true
 */
declare function isEqual(s1: Set, s2: Set): boolean;
/**
 * Create a function that test if a collection of notes is a
 * subset of a given set
 *
 * The function is curryfied.
 *
 * @param {PcsetChroma|NoteName[]} set - the superset to test against (chroma or
 * list of notes)
 * @return{function(PcsetChroma|NoteNames[]): boolean} a function accepting a set
 * to test against (chroma or list of notes)
 * @example
 * const inCMajor = Pcset.isSubsetOf(["C", "E", "G"])
 * inCMajor(["e6", "c4"]) // => true
 * inCMajor(["e6", "c4", "d3"]) // => false
 */
declare function isSubsetOf(set: Set): (notes: Set | Pcset) => boolean | 0;
/**
 * Create a function that test if a collection of notes is a
 * superset of a given set (it contains all notes and at least one more)
 *
 * @param {Set} set - an array of notes or a chroma set string to test against
 * @return {(subset: Set): boolean} a function that given a set
 * returns true if is a subset of the first one
 * @example
 * const extendsCMajor = Pcset.isSupersetOf(["C", "E", "G"])
 * extendsCMajor(["e6", "a", "c4", "g2"]) // => true
 * extendsCMajor(["c6", "e4", "g3"]) // => false
 */
declare function isSupersetOf(set: Set): (notes: Set) => boolean | 0;
/**
 * Test if a given pitch class set includes a note
 *
 * @param {Array<string>} set - the base set to test against
 * @param {string} note - the note to test
 * @return {boolean} true if the note is included in the pcset
 *
 * Can be partially applied
 *
 * @example
 * const isNoteInCMajor = isNoteIncludedIn(['C', 'E', 'G'])
 * isNoteInCMajor('C4') // => true
 * isNoteInCMajor('C#4') // => false
 */
declare function isNoteIncludedIn(set: Set): (noteName: NoteName) => boolean;
/**
 * Filter a list with a pitch class set
 *
 * @param {Array|string} set - the pitch class set notes
 * @param {Array|string} notes - the note list to be filtered
 * @return {Array} the filtered notes
 *
 * @example
 * Pcset.filter(["C", "D", "E"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "d2", "c3", "d3" ])
 * Pcset.filter(["C2"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "c3" ])
 */
declare function filter(set: Set): (notes: NoteName[]) => string[];
declare const _default$g: {
    get: typeof get$8;
    chroma: (set: Set) => string;
    num: (set: Set) => number;
    intervals: (set: Set) => string[];
    chromas: typeof chromas;
    isSupersetOf: typeof isSupersetOf;
    isSubsetOf: typeof isSubsetOf;
    isNoteIncludedIn: typeof isNoteIncludedIn;
    isEqual: typeof isEqual;
    filter: typeof filter;
    modes: typeof modes;
    pcset: (this: unknown, ...args: unknown[]) => Pcset;
};

/**
 * Properties for a scale in the scale dictionary. It's a pitch class set
 * properties with the following additional information:
 * - name: the scale name
 * - aliases: alternative list of names
 * - intervals: an array of interval names
 */
interface ScaleType extends Pcset {
    readonly name: string;
    readonly aliases: string[];
}
declare type ScaleTypeName = string | PcsetChroma | PcsetNum;
declare function names$7(): string[];
/**
 * Given a scale name or chroma, return the scale properties
 *
 * @param {string} type - scale name or pitch class set chroma
 * @example
 * import { get } from 'tonaljs/scale-type'
 * get('major') // => { name: 'major', ... }
 */
declare function get$7(type: ScaleTypeName): ScaleType;
/**
 * Return a list of all scale types
 */
declare function all$2(): ScaleType[];
/**
 * Keys used to reference scale types
 */
declare function keys$1(): string[];
/**
 * Clear the dictionary
 */
declare function removeAll$1(): void;
/**
 * Add a scale into dictionary
 * @param intervals
 * @param name
 * @param aliases
 */
declare function add$1(intervals: string[], name: string, aliases?: string[]): ScaleType;
declare const _default$f: {
    names: typeof names$7;
    get: typeof get$7;
    all: typeof all$2;
    add: typeof add$1;
    removeAll: typeof removeAll$1;
    keys: typeof keys$1;
    entries: (this: unknown, ...args: unknown[]) => ScaleType[];
    scaleType: (this: unknown, ...args: unknown[]) => ScaleType;
};

declare type ChordQuality = "Major" | "Minor" | "Augmented" | "Diminished" | "Unknown";
interface ChordType extends Pcset {
    name: string;
    quality: ChordQuality;
    aliases: string[];
}
declare type ChordTypeName = string | PcsetChroma | PcsetNum;
/**
 * Given a chord name or chroma, return the chord properties
 * @param {string} source - chord name or pitch class set chroma
 * @example
 * import { get } from 'tonaljs/chord-type'
 * get('major') // => { name: 'major', ... }
 */
declare function get$6(type: ChordTypeName): ChordType;
/**
 * Get all chord (long) names
 */
declare function names$6(): string[];
/**
 * Get all chord symbols
 */
declare function symbols(): string[];
/**
 * Keys used to reference chord types
 */
declare function keys(): string[];
/**
 * Return a list of all chord types
 */
declare function all$1(): ChordType[];
/**
 * Clear the dictionary
 */
declare function removeAll(): void;
/**
 * Add a chord to the dictionary.
 * @param intervals
 * @param aliases
 * @param [fullName]
 */
declare function add(intervals: string[], aliases: string[], fullName?: string): void;
declare const _default$e: {
    names: typeof names$6;
    symbols: typeof symbols;
    get: typeof get$6;
    all: typeof all$1;
    add: typeof add;
    removeAll: typeof removeAll;
    keys: typeof keys;
    entries: (this: unknown, ...args: unknown[]) => ChordType[];
    chordType: (this: unknown, ...args: unknown[]) => ChordType;
};

declare type AbcTokens = [string, string, string];
declare function tokenize$2(str: string): AbcTokens;
/**
 * Convert a (string) note in ABC notation into a (string) note in scientific notation
 *
 * @example
 * abcToScientificNotation("c") // => "C5"
 */
declare function abcToScientificNotation(str: string): string;
/**
 * Convert a (string) note in scientific notation into a (string) note in ABC notation
 *
 * @example
 * scientificToAbcNotation("C#4") // => "^C"
 */
declare function scientificToAbcNotation(str: string): string;
declare function transpose$1(note: string, interval: string): string;
declare function distance$1(from: string, to: string): string;
declare const _default$d: {
    abcToScientificNotation: typeof abcToScientificNotation;
    scientificToAbcNotation: typeof scientificToAbcNotation;
    tokenize: typeof tokenize$2;
    transpose: typeof transpose$1;
    distance: typeof distance$1;
};

/**
 * Creates a numeric range
 *
 * @param {number} from
 * @param {number} to
 * @return {Array<number>}
 *
 * @example
 * range(-2, 2) // => [-2, -1, 0, 1, 2]
 * range(2, -2) // => [2, 1, 0, -1, -2]
 */
declare function range$1(from: number, to: number): number[];
/**
 * Rotates a list a number of times. It"s completly agnostic about the
 * contents of the list.
 *
 * @param {Integer} times - the number of rotations
 * @param {Array} array
 * @return {Array} the rotated array
 *
 * @example
 * rotate(1, [1, 2, 3]) // => [2, 3, 1]
 */
declare function rotate$1<T>(times: number, arr: T[]): T[];
/**
 * Return a copy of the array with the null values removed
 * @function
 * @param {Array} array
 * @return {Array}
 *
 * @example
 * compact(["a", "b", null, "c"]) // => ["a", "b", "c"]
 */
declare function compact$1(arr: any[]): any[];
/**
 * Sort an array of notes in ascending order. Pitch classes are listed
 * before notes. Any string that is not a note is removed.
 *
 * @param {string[]} notes
 * @return {string[]} sorted array of notes
 *
 * @example
 * sortedNoteNames(['c2', 'c5', 'c1', 'c0', 'c6', 'c'])
 * // => ['C', 'C0', 'C1', 'C2', 'C5', 'C6']
 * sortedNoteNames(['c', 'F', 'G', 'a', 'b', 'h', 'J'])
 * // => ['C', 'F', 'G', 'A', 'B']
 */
declare function sortedNoteNames(notes: string[]): string[];
/**
 * Get sorted notes with duplicates removed. Pitch classes are listed
 * before notes.
 *
 * @function
 * @param {string[]} array
 * @return {string[]} unique sorted notes
 *
 * @example
 * Array.sortedUniqNoteNames(['a', 'b', 'c2', '1p', 'p2', 'c2', 'b', 'c', 'c3' ])
 * // => [ 'C', 'A', 'B', 'C2', 'C3' ]
 */
declare function sortedUniqNoteNames(arr: string[]): string[];
/**
 * Randomizes the order of the specified array in-place, using the Fisher–Yates shuffle.
 *
 * @function
 * @param {Array} array
 * @return {Array} the array shuffled
 *
 * @example
 * shuffle(["C", "D", "E", "F"]) // => [...]
 */
declare function shuffle$1(arr: any[], rnd?: () => number): any[];
/**
 * Get all permutations of an array
 *
 * @param {Array} array - the array
 * @return {Array<Array>} an array with all the permutations
 * @example
 * permutations(["a", "b", "c"])) // =>
 * [
 *   ["a", "b", "c"],
 *   ["b", "a", "c"],
 *   ["b", "c", "a"],
 *   ["a", "c", "b"],
 *   ["c", "a", "b"],
 *   ["c", "b", "a"]
 * ]
 */
declare function permutations$1(arr: any[]): any[];

declare const index_d_sortedNoteNames: typeof sortedNoteNames;
declare const index_d_sortedUniqNoteNames: typeof sortedUniqNoteNames;
declare namespace index_d {
  export {
    compact$1 as compact,
    permutations$1 as permutations,
    range$1 as range,
    rotate$1 as rotate,
    shuffle$1 as shuffle,
    index_d_sortedNoteNames as sortedNoteNames,
    index_d_sortedUniqNoteNames as sortedUniqNoteNames,
  };
}

declare function detect(source: string[]): string[];

declare type ChordName = string;
declare type ChordNameTokens = [string, string];
interface Chord extends ChordType {
    tonic: string | null;
    type: string;
    root: string;
    rootDegree: number;
    symbol: string;
    notes: NoteName[];
}
/**
 * Tokenize a chord name. It returns an array with the tonic and chord type
 * If not tonic is found, all the name is considered the chord name.
 *
 * This function does NOT check if the chord type exists or not. It only tries
 * to split the tonic and chord type.
 *
 * @function
 * @param {string} name - the chord name
 * @return {Array} an array with [tonic, type]
 * @example
 * tokenize("Cmaj7") // => [ "C", "maj7" ]
 * tokenize("C7") // => [ "C", "7" ]
 * tokenize("mMaj7") // => [ null, "mMaj7" ]
 * tokenize("Cnonsense") // => [ null, "nonsense" ]
 */
declare function tokenize$1(name: string): ChordNameTokens;
/**
 * Get a Chord from a chord name.
 */
declare function get$5(src: ChordName | ChordNameTokens): Chord;
/**
 * Get chord properties
 *
 * @param typeName - the chord type name
 * @param [tonic] - Optional tonic
 * @param [root]  - Optional root (requires a tonic)
 */
declare function getChord(typeName: string, optionalTonic?: string, optionalRoot?: string): Chord;
/**
 * Transpose a chord name
 *
 * @param {string} chordName - the chord name
 * @return {string} the transposed chord
 *
 * @example
 * transpose('Dm7', 'P4') // => 'Gm7
 */
declare function transpose(chordName: string, interval: string): string;
/**
 * Get all scales where the given chord fits
 *
 * @example
 * chordScales('C7b9')
 * // => ["phrygian dominant", "flamenco", "spanish heptatonic", "half-whole diminished", "chromatic"]
 */
declare function chordScales(name: string): string[];
/**
 * Get all chords names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @example
 * extended("CMaj7")
 * // => [ 'Cmaj#4', 'Cmaj7#9#11', 'Cmaj9', 'CM7add13', 'Cmaj13', 'Cmaj9#11', 'CM13#11', 'CM7b9' ]
 */
declare function extended$1(chordName: string): string[];
/**
 * Find all chords names that are a subset of the given one
 * (has less notes but all from the given chord)
 *
 * @example
 */
declare function reduced$1(chordName: string): string[];
declare const _default$c: {
    getChord: typeof getChord;
    get: typeof get$5;
    detect: typeof detect;
    chordScales: typeof chordScales;
    extended: typeof extended$1;
    reduced: typeof reduced$1;
    tokenize: typeof tokenize$1;
    transpose: typeof transpose;
    chord: (this: unknown, ...args: unknown[]) => Chord;
};

/**
 * Creates a numeric range
 *
 * @param {number} from
 * @param {number} to
 * @return {Array<number>}
 *
 * @example
 * range(-2, 2) // => [-2, -1, 0, 1, 2]
 * range(2, -2) // => [2, 1, 0, -1, -2]
 */
declare function range(from: number, to: number): number[];
/**
 * Rotates a list a number of times. It"s completly agnostic about the
 * contents of the list.
 *
 * @param {Integer} times - the number of rotations
 * @param {Array} collection
 * @return {Array} the rotated collection
 *
 * @example
 * rotate(1, [1, 2, 3]) // => [2, 3, 1]
 */
declare function rotate<T>(times: number, arr: T[]): T[];
/**
 * Return a copy of the collection with the null values removed
 * @function
 * @param {Array} collection
 * @return {Array}
 *
 * @example
 * compact(["a", "b", null, "c"]) // => ["a", "b", "c"]
 */
declare function compact(arr: any[]): any[];
/**
 * Randomizes the order of the specified collection in-place, using the Fisher–Yates shuffle.
 *
 * @function
 * @param {Array} collection
 * @return {Array} the collection shuffled
 *
 * @example
 * shuffle(["C", "D", "E", "F"]) // => [...]
 */
declare function shuffle(arr: any[], rnd?: () => number): any[];
/**
 * Get all permutations of an collection
 *
 * @param {Array} collection - the collection
 * @return {Array<Array>} an collection with all the permutations
 * @example
 * permutations(["a", "b", "c"])) // =>
 * [
 *   ["a", "b", "c"],
 *   ["b", "a", "c"],
 *   ["b", "c", "a"],
 *   ["a", "c", "b"],
 *   ["c", "a", "b"],
 *   ["c", "b", "a"]
 * ]
 */
declare function permutations(arr: any[]): any[];
declare const _default$b: {
    compact: typeof compact;
    permutations: typeof permutations;
    range: typeof range;
    rotate: typeof rotate;
    shuffle: typeof shuffle;
};

declare type Fraction = [number, number];
interface DurationValue {
    empty: boolean;
    value: number;
    name: string;
    fraction: Fraction;
    shorthand: string;
    dots: string;
    names: string[];
}
declare function names$5(): string[];
declare function shorthands(): string[];
declare function get$4(name: string): DurationValue;
declare const _default$a: {
    names: typeof names$5;
    shorthands: typeof shorthands;
    get: typeof get$4;
    value: (name: string) => number;
    fraction: (name: string) => Fraction;
};

/**
 * Get the natural list of names
 */
declare function names$4(): IntervalName[];
/**
 * Get the simplified version of an interval.
 *
 * @function
 * @param {string} interval - the interval to simplify
 * @return {string} the simplified interval
 *
 * @example
 * Interval.simplify("9M") // => "2M"
 * Interval.simplify("2M") // => "2M"
 * Interval.simplify("-2M") // => "7m"
 * ["8P", "9M", "10M", "11P", "12P", "13M", "14M", "15P"].map(Interval.simplify)
 * // => [ "8P", "2M", "3M", "4P", "5P", "6M", "7M", "8P" ]
 */
declare function simplify(name: IntervalName): IntervalName;
/**
 * Get the inversion (https://en.wikipedia.org/wiki/Inversion_(music)#Intervals)
 * of an interval.
 *
 * @function
 * @param {string} interval - the interval to invert in interval shorthand
 * notation or interval array notation
 * @return {string} the inverted interval
 *
 * @example
 * Interval.invert("3m") // => "6M"
 * Interval.invert("2M") // => "7m"
 */
declare function invert(name: IntervalName): IntervalName;
/**
 * Get interval name from semitones number. Since there are several interval
 * names for the same number, the name it's arbitrary, but deterministic.
 *
 * @param {Integer} num - the number of semitones (can be negative)
 * @return {string} the interval name
 * @example
 * Interval.fromSemitones(7) // => "5P"
 * Interval.fromSemitones(-7) // => "-5P"
 */
declare function fromSemitones(semitones: number): IntervalName;
declare function transposeFifths$1(interval: IntervalName, fifths: number): IntervalName;
declare const _default$9: {
    names: typeof names$4;
    get: typeof interval;
    name: (name: string) => string;
    num: (name: string) => number | undefined;
    semitones: (name: string) => number | undefined;
    quality: (name: string) => ("dddd" | "ddd" | "dd" | "d" | "m" | "M" | "P" | "A" | "AA" | "AAA" | "AAAA") | undefined;
    fromSemitones: typeof fromSemitones;
    distance: typeof distance$2;
    invert: typeof invert;
    simplify: typeof simplify;
    add: (a: string, b: string) => string | undefined;
    addTo: (interval: string) => (other: string) => string | undefined;
    substract: (a: string, b: string) => string | undefined;
    transposeFifths: typeof transposeFifths$1;
};

interface Key {
    readonly type: "major" | "minor";
    readonly tonic: string;
    readonly alteration: number;
    readonly keySignature: string;
}
interface KeyScale {
    readonly tonic: string;
    readonly grades: readonly string[];
    readonly intervals: readonly string[];
    readonly scale: readonly string[];
    readonly chords: readonly string[];
    readonly chordsHarmonicFunction: readonly string[];
    readonly chordScales: readonly string[];
}
interface MajorKey extends Key, KeyScale {
    readonly type: "major";
    readonly minorRelative: string;
    readonly scale: readonly string[];
    readonly secondaryDominants: readonly string[];
    readonly secondaryDominantsMinorRelative: readonly string[];
    readonly substituteDominants: readonly string[];
    readonly substituteDominantsMinorRelative: readonly string[];
}
interface MinorKey extends Key {
    readonly type: "minor";
    readonly relativeMajor: string;
    readonly natural: KeyScale;
    readonly harmonic: KeyScale;
    readonly melodic: KeyScale;
}
/**
 * Get a major key properties in a given tonic
 * @param tonic
 */
declare function majorKey(tonic: string): MajorKey;
/**
 * Get minor key properties in a given tonic
 * @param tonic
 */
declare function minorKey(tnc: string): MinorKey;
/**
 * Given a key signature, returns the tonic of the major key
 * @param sigature
 * @example
 * majorTonicFromKeySignature('###') // => 'A'
 */
declare function majorTonicFromKeySignature(sig: string | number): string | null;
declare const _default$8: {
    majorKey: typeof majorKey;
    majorTonicFromKeySignature: typeof majorTonicFromKeySignature;
    minorKey: typeof minorKey;
};

declare type Midi = number;
declare function isMidi(arg: any): arg is Midi;
/**
 * Get the note midi number (a number between 0 and 127)
 *
 * It returns undefined if not valid note name
 *
 * @function
 * @param {string|number} note - the note name or midi number
 * @return {Integer} the midi number or undefined if not valid note
 * @example
 * import { toMidi } from '@tonaljs/midi'
 * toMidi("C4") // => 60
 * toMidi(60) // => 60
 * toMidi('60') // => 60
 */
declare function toMidi(note: NoteName | number): number | null;
/**
 * Get the frequency in hertzs from midi number
 *
 * @param {number} midi - the note midi number
 * @param {number} [tuning = 440] - A4 tuning frequency in Hz (440 by default)
 * @return {number} the frequency or null if not valid note midi
 * @example
 * import { midiToFreq} from '@tonaljs/midi'
 * midiToFreq(69) // => 440
 */
declare function midiToFreq(midi: number, tuning?: number): number;
/**
 * Get the midi number from a frequency in hertz. The midi number can
 * contain decimals (with two digits precission)
 *
 * @param {number} frequency
 * @return {number}
 * @example
 * import { freqToMidi} from '@tonaljs/midi'
 * freqToMidi(220)); //=> 57
 * freqToMidi(261.62)); //=> 60
 * freqToMidi(261)); //=> 59.96
 */
declare function freqToMidi(freq: number): number;
interface ToNoteNameOptions {
    pitchClass?: boolean;
    sharps?: boolean;
}
/**
 * Given a midi number, returns a note name. The altered notes will have
 * flats unless explicitly set with the optional `useSharps` parameter.
 *
 * @function
 * @param {number} midi - the midi note number
 * @param {Object} options = default: `{ sharps: false, pitchClass: false }`
 * @param {boolean} useSharps - (Optional) set to true to use sharps instead of flats
 * @return {string} the note name
 * @example
 * import { midiToNoteName } from '@tonaljs/midi'
 * midiToNoteName(61) // => "Db4"
 * midiToNoteName(61, { pitchClass: true }) // => "Db"
 * midiToNoteName(61, { sharps: true }) // => "C#4"
 * midiToNoteName(61, { pitchClass: true, sharps: true }) // => "C#"
 * // it rounds to nearest note
 * midiToNoteName(61.7) // => "D4"
 */
declare function midiToNoteName(midi: number, options?: ToNoteNameOptions): string;
declare const _default$7: {
    isMidi: typeof isMidi;
    toMidi: typeof toMidi;
    midiToFreq: typeof midiToFreq;
    midiToNoteName: typeof midiToNoteName;
    freqToMidi: typeof freqToMidi;
};

interface Mode extends Pcset {
    readonly name: string;
    readonly modeNum: number;
    readonly alt: number;
    readonly triad: string;
    readonly seventh: string;
    readonly aliases: string[];
}
declare type ModeLiteral = string | Named;
/**
 * Get a Mode by it's name
 *
 * @example
 * get('dorian')
 * // =>
 * // {
 * //   intervals: [ '1P', '2M', '3m', '4P', '5P', '6M', '7m' ],
 * //   modeNum: 1,
 * //   chroma: '101101010110',
 * //   normalized: '101101010110',
 * //   name: 'dorian',
 * //   setNum: 2902,
 * //   alt: 2,
 * //   triad: 'm',
 * //   seventh: 'm7',
 * //   aliases: []
 * // }
 */
declare function get$3(name: ModeLiteral): Mode;
/**
 * Get a list of all modes
 */
declare function all(): Mode[];
/**
 * Get a list of all mode names
 */
declare function names$3(): string[];
declare function notes(modeName: ModeLiteral, tonic: NoteName): string[];
declare function distance(destination: ModeLiteral, source: ModeLiteral): string;
declare function relativeTonic(destination: ModeLiteral, source: ModeLiteral, tonic: NoteName): string;
declare const _default$6: {
    get: typeof get$3;
    names: typeof names$3;
    all: typeof all;
    distance: typeof distance;
    relativeTonic: typeof relativeTonic;
    notes: typeof notes;
    triads: (modeName: ModeLiteral, tonic: string) => string[];
    seventhChords: (modeName: ModeLiteral, tonic: string) => string[];
    entries: (this: unknown, ...args: unknown[]) => Mode[];
    mode: (this: unknown, ...args: unknown[]) => Mode;
};

/**
 * Return the natural note names without octave
 * @function
 * @example
 * Note.names(); // => ["C", "D", "E", "F", "G", "A", "B"]
 */
declare function names$2(array?: any[]): string[];
/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 *
 * @function
 * @param {number} midi - the midi note number
 * @return {string} the note name
 * @example
 * Note.fromMidi(61) // => "Db4"
 * Note.fromMidi(61.7) // => "D4"
 */
declare function fromMidi(midi: number): string;
/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 */
declare function fromFreq(freq: number): string;
/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 */
declare function fromFreqSharps(freq: number): string;
/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 *
 * @function
 * @param {number} midi - the midi note number
 * @return {string} the note name
 * @example
 * Note.fromMidiSharps(61) // => "C#4"
 */
declare function fromMidiSharps(midi: number): string;
/**
 * Transpose a note by a number of perfect fifths.
 *
 * @function
 * @param {string} note - the note name
 * @param {number} fifhts - the number of fifths
 * @return {string} the transposed note name
 *
 * @example
 * import { transposeFifths } from "@tonaljs/note"
 * transposeFifths("G4", 1) // => "D"
 * [0, 1, 2, 3, 4].map(fifths => transposeFifths("C", fifths)) // => ["C", "G", "D", "A", "E"]
 */
declare function transposeFifths(noteName: NoteName, fifths: number): NoteName;
declare type NoteComparator = (a: Note, b: Note) => number;
declare function sortedNames(notes: any[], comparator?: NoteComparator): string[];
declare function sortedUniqNames(notes: any[]): string[];
/**
 * Get enharmonic of a note
 *
 * @function
 * @param {string} note
 * @param [string] - [optional] Destination pitch class
 * @return {string} the enharmonic note name or '' if not valid note
 * @example
 * Note.enharmonic("Db") // => "C#"
 * Note.enharmonic("C") // => "C"
 * Note.enharmonic("F2","E#") // => "E#2"
 */
declare function enharmonic(noteName: string, destName?: string): string;
declare const _default$5: {
    names: typeof names$2;
    get: typeof note;
    name: (note: NoteLiteral) => string;
    pitchClass: (note: NoteLiteral) => string;
    accidentals: (note: NoteLiteral) => string;
    octave: (note: NoteLiteral) => number | undefined;
    midi: (note: NoteLiteral) => number | null | undefined;
    ascending: NoteComparator;
    descending: NoteComparator;
    sortedNames: typeof sortedNames;
    sortedUniqNames: typeof sortedUniqNames;
    fromMidi: typeof fromMidi;
    fromMidiSharps: typeof fromMidiSharps;
    freq: (note: NoteLiteral) => number | null | undefined;
    fromFreq: typeof fromFreq;
    fromFreqSharps: typeof fromFreqSharps;
    chroma: (note: NoteLiteral) => number | undefined;
    transpose: typeof transpose$2;
    tr: typeof transpose$2;
    transposeBy: (interval: string) => (note: string) => string;
    trBy: (interval: string) => (note: string) => string;
    transposeFrom: (note: string) => (interval: string) => string;
    trFrom: (note: string) => (interval: string) => string;
    transposeFifths: typeof transposeFifths;
    trFifths: typeof transposeFifths;
    simplify: (noteName: string | Pitch) => string;
    enharmonic: typeof enharmonic;
};

/**
 * Given a tonic and a chord list expressed with roman numeral notation
 * returns the progression expressed with leadsheet chords symbols notation
 * @example
 * fromRomanNumerals("C", ["I", "IIm7", "V7"]);
 * // => ["C", "Dm7", "G7"]
 */
declare function fromRomanNumerals(tonic: NoteLiteral, chords: string[]): string[];
/**
 * Given a tonic and a chord list with leadsheet symbols notation,
 * return the chord list with roman numeral notation
 * @example
 * toRomanNumerals("C", ["CMaj7", "Dm7", "G7"]);
 * // => ["IMaj7", "IIm7", "V7"]
 */
declare function toRomanNumerals(tonic: NoteLiteral, chords: string[]): string[];
declare const _default$4: {
    fromRomanNumerals: typeof fromRomanNumerals;
    toRomanNumerals: typeof toRomanNumerals;
};

/**
 * Create a numeric range. You supply a list of notes or numbers and it will
 * be connected to create complex ranges.
 *
 * @param {Array} notes - the list of notes or midi numbers used
 * @return {Array} an array of numbers or empty array if not valid parameters
 *
 * @example
 * numeric(["C5", "C4"]) // => [ 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 ]
 * // it works midi notes
 * numeric([10, 5]) // => [ 10, 9, 8, 7, 6, 5 ]
 * // complex range
 * numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 */
declare function numeric(notes: (string | number)[]): number[];
/**
 * Create a range of chromatic notes. The altered notes will use flats.
 *
 * @function
 * @param {Array} notes - the list of notes or midi note numbers to create a range from
 * @param {Object} options - The same as `midiToNoteName` (`{ sharps: boolean, pitchClass: boolean }`)
 * @return {Array} an array of note names
 *
 * @example
 * Range.chromatic(["C2, "E2", "D2"]) // => ["C2", "Db2", "D2", "Eb2", "E2", "Eb2", "D2"]
 * // with sharps
 * Range.chromatic(["C2", "C3"], { sharps: true }) // => [ "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3" ]
 */
declare function chromatic(notes: (string | number)[], options?: ToNoteNameOptions): string[];
declare const _default$3: {
    numeric: typeof numeric;
    chromatic: typeof chromatic;
};

interface RomanNumeral extends Pitch, Named {
    readonly empty: boolean;
    readonly roman: string;
    readonly interval: string;
    readonly acc: string;
    readonly chordType: string;
    readonly major: boolean;
    readonly dir: 1;
}
interface NoRomanNumeral extends Partial<RomanNumeral> {
    readonly empty: true;
    readonly name: "";
    readonly chordType: "";
}
/**
 * Get properties of a roman numeral string
 *
 * @function
 * @param {string} - the roman numeral string (can have type, like: Imaj7)
 * @return {Object} - the roman numeral properties
 * @param {string} name - the roman numeral (tonic)
 * @param {string} type - the chord type
 * @param {string} num - the number (1 = I, 2 = II...)
 * @param {boolean} major - major or not
 *
 * @example
 * romanNumeral("VIIb5") // => { name: "VII", type: "b5", num: 7, major: true }
 */
declare function get$2(src: any): RomanNumeral | NoRomanNumeral;
/**
 * Get roman numeral names
 *
 * @function
 * @param {boolean} [isMajor=true]
 * @return {Array<String>}
 *
 * @example
 * names() // => ["I", "II", "III", "IV", "V", "VI", "VII"]
 */
declare function names$1(major?: boolean): string[];
declare const _default$2: {
    names: typeof names$1;
    get: typeof get$2;
    romanNumeral: (this: unknown, ...args: unknown[]) => RomanNumeral | NoRomanNumeral;
};

declare type ScaleName = string;
declare type ScaleNameTokens = [string, string];
interface Scale extends ScaleType {
    tonic: string | null;
    type: string;
    notes: NoteName[];
}
/**
 * Given a string with a scale name and (optionally) a tonic, split
 * that components.
 *
 * It retuns an array with the form [ name, tonic ] where tonic can be a
 * note name or null and name can be any arbitrary string
 * (this function doesn"t check if that scale name exists)
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array} an array [tonic, name]
 * @example
 * tokenize("C mixolydean") // => ["C", "mixolydean"]
 * tokenize("anything is valid") // => ["", "anything is valid"]
 * tokenize() // => ["", ""]
 */
declare function tokenize(name: ScaleName): ScaleNameTokens;
/**
 * Get a Scale from a scale name.
 */
declare function get$1(src: ScaleName | ScaleNameTokens): Scale;
/**
 * Get all chords that fits a given scale
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array<string>} - the chord names
 *
 * @example
 * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
 */
declare function scaleChords(name: string): string[];
/**
 * Get all scales names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 * @example
 * extended("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
 */
declare function extended(name: string): string[];
/**
 * Find all scales names that are a subset of the given one
 * (has less notes but all from the given scale)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 *
 * @example
 * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
 */
declare function reduced(name: string): string[];
/**
 * Given an array of notes, return the scale: a pitch class set starting from
 * the first note of the array
 *
 * @function
 * @param {string[]} notes
 * @return {string[]} pitch classes with same tonic
 * @example
 * scaleNotes(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
 * scaleNotes(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
 */
declare function scaleNotes(notes: NoteName[]): string[];
declare type ScaleMode = [string, string];
/**
 * Find mode names of a scale
 *
 * @function
 * @param {string} name - scale name
 * @example
 * modeNames("C pentatonic") // => [
 *   ["C", "major pentatonic"],
 *   ["D", "egyptian"],
 *   ["E", "malkos raga"],
 *   ["G", "ritusen"],
 *   ["A", "minor pentatonic"]
 * ]
 */
declare function modeNames(name: string): ScaleMode[];
declare function rangeOf(scale: string | string[]): (fromNote: string, toNote: string) => (string | undefined)[];
declare const _default$1: {
    get: typeof get$1;
    names: typeof names$7;
    extended: typeof extended;
    modeNames: typeof modeNames;
    reduced: typeof reduced;
    scaleChords: typeof scaleChords;
    scaleNotes: typeof scaleNotes;
    tokenize: typeof tokenize;
    rangeOf: typeof rangeOf;
    scale: (this: unknown, ...args: unknown[]) => Scale;
};

declare type TimeSignatureLiteral = string | [number, number] | [string, string];
declare type ParsedTimeSignature = [number | number[], number];
declare type ValidTimeSignature = {
    readonly empty: false;
    readonly name: string;
    readonly upper: number | number[];
    readonly lower: number;
    readonly type: "simple" | "compound" | "irregular";
    readonly additive: number[];
};
declare type InvalidTimeSignature = {
    readonly empty: true;
    readonly name: "";
    readonly upper: undefined;
    readonly lower: undefined;
    readonly type: undefined;
    readonly additive: [];
};
declare type TimeSignature = ValidTimeSignature | InvalidTimeSignature;
declare function names(): string[];
declare function get(literal: TimeSignatureLiteral): TimeSignature;
declare function parse(literal: TimeSignatureLiteral): ParsedTimeSignature;
declare const _default: {
    names: typeof names;
    parse: typeof parse;
    get: typeof get;
};

declare const Tonal: typeof Core;
declare const PcSet: {
    get: typeof get$8;
    chroma: (set: Set) => string;
    num: (set: Set) => number;
    intervals: (set: Set) => string[];
    chromas: typeof chromas;
    isSupersetOf: typeof isSupersetOf;
    isSubsetOf: typeof isSubsetOf;
    isNoteIncludedIn: typeof isNoteIncludedIn;
    isEqual: typeof isEqual;
    filter: typeof filter;
    modes: typeof modes;
    pcset: (this: unknown, ...args: unknown[]) => Pcset;
};
declare const ChordDictionary: {
    names: typeof names$6;
    symbols: typeof symbols;
    get: typeof get$6;
    all: typeof all$1;
    add: typeof add;
    removeAll: typeof removeAll;
    keys: typeof keys;
    entries: (this: unknown, ...args: unknown[]) => ChordType[];
    chordType: (this: unknown, ...args: unknown[]) => ChordType;
};
declare const ScaleDictionary: {
    names: typeof names$7;
    get: typeof get$7;
    all: typeof all$2;
    add: typeof add$1;
    removeAll: typeof removeAll$1;
    keys: typeof keys$1;
    entries: (this: unknown, ...args: unknown[]) => ScaleType[];
    scaleType: (this: unknown, ...args: unknown[]) => ScaleType;
};

export { _default$d as AbcNotation, index_d as Array, _default$c as Chord, ChordDictionary, _default$e as ChordType, _default$b as Collection, Core, Direction, _default$a as DurationValue, _default$9 as Interval, IntervalCoordinates, IntervalLiteral, IntervalName, _default$8 as Key, _default$7 as Midi, _default$6 as Mode, Named, NamedFound, NoInterval, NoNote, NotFound, _default$5 as Note, NoteCoordinates, NoteLiteral, NoteName, NoteWithOctave, PcName, PcSet, _default$g as Pcset, Pitch, PitchClassCoordinates, PitchCoordinates, _default$4 as Progression, _default$3 as Range, _default$2 as RomanNumeral, _default$1 as Scale, ScaleDictionary, _default$f as ScaleType, _default as TimeSignature, Tonal, accToAlt, altToAcc, coordToInterval, coordToNote, decode, deprecate, distance$2 as distance, encode, fillStr, interval, isNamed, isPitch, note, stepToLetter, tokenizeInterval, tokenizeNote, transpose$2 as transpose };
