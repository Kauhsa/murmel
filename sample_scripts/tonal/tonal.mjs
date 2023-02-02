// src/utils.ts
var fillStr$1 = (s, n) => Array(Math.abs(n) + 1).join(s);
function deprecate(original, alternative, fn) {
  return function(...args) {
    console.warn(`${original} is deprecated. Use ${alternative}.`);
    return fn.apply(this, args);
  };
}

// src/named.ts
function isNamed(src) {
  return src !== null && typeof src === "object" && typeof src.name === "string" ? true : false;
}

// src/pitch.ts
function isPitch(pitch) {
  return pitch !== null && typeof pitch === "object" && typeof pitch.step === "number" && typeof pitch.alt === "number" ? true : false;
}
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
var STEPS_TO_OCTS = FIFTHS.map((fifths) => Math.floor(fifths * 7 / 12));
function encode(pitch) {
  const { step, alt, oct, dir = 1 } = pitch;
  const f = FIFTHS[step] + 7 * alt;
  if (oct === void 0) {
    return [dir * f];
  }
  const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
}
var FIFTHS_TO_STEPS = [3, 0, 4, 1, 5, 2, 6];
function decode(coord) {
  const [f, o, dir] = coord;
  const step = FIFTHS_TO_STEPS[unaltered(f)];
  const alt = Math.floor((f + 1) / 7);
  if (o === void 0) {
    return { step, alt, dir };
  }
  const oct = o + 4 * alt + STEPS_TO_OCTS[step];
  return { step, alt, oct, dir };
}
function unaltered(f) {
  const i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}

// src/note.ts
var NoNote = { empty: true, name: "", pc: "", acc: "" };
var cache$2 = /* @__PURE__ */ new Map();
var stepToLetter = (step) => "CDEFGAB".charAt(step);
var altToAcc = (alt) => alt < 0 ? fillStr$1("b", -alt) : fillStr$1("#", alt);
var accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
function note(src) {
  const cached = cache$2.get(src);
  if (cached) {
    return cached;
  }
  const value = typeof src === "string" ? parse$2(src) : isPitch(src) ? note(pitchName(src)) : isNamed(src) ? note(src.name) : NoNote;
  cache$2.set(src, value);
  return value;
}
var REGEX$5 = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
function tokenizeNote(str) {
  const m = REGEX$5.exec(str);
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}
function coordToNote(noteCoord) {
  return note(decode(noteCoord));
}
var mod = (n, m) => (n % m + m) % m;
var SEMI = [0, 2, 4, 5, 7, 9, 11];
function parse$2(noteName) {
  const tokens = tokenizeNote(noteName);
  if (tokens[0] === "" || tokens[3] !== "") {
    return NoNote;
  }
  const letter = tokens[0];
  const acc = tokens[1];
  const octStr = tokens[2];
  const step = (letter.charCodeAt(0) + 3) % 7;
  const alt = accToAlt(acc);
  const oct = octStr.length ? +octStr : void 0;
  const coord = encode({ step, alt, oct });
  const name = letter + acc + octStr;
  const pc = letter + acc;
  const chroma = (SEMI[step] + alt + 120) % 12;
  const height = oct === void 0 ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
  const midi = height >= 0 && height <= 127 ? height : null;
  const freq = oct === void 0 ? null : Math.pow(2, (height - 69) / 12) * 440;
  return {
    empty: false,
    acc,
    alt,
    chroma,
    coord,
    freq,
    height,
    letter,
    midi,
    name,
    oct,
    pc,
    step
  };
}
function pitchName(props) {
  const { step, alt, oct } = props;
  const letter = stepToLetter(step);
  if (!letter) {
    return "";
  }
  const pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
}

// src/interval.ts
var NoInterval = { empty: true, name: "", acc: "" };
var INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
var INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
var REGEX2 = new RegExp("^" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + "$");
function tokenizeInterval(str) {
  const m = REGEX2.exec(`${str}`);
  if (m === null) {
    return ["", ""];
  }
  return m[1] ? [m[1], m[2]] : [m[4], m[3]];
}
var cache2 = {};
function interval(src) {
  return typeof src === "string" ? cache2[src] || (cache2[src] = parse2(src)) : isPitch(src) ? interval(pitchName2(src)) : isNamed(src) ? interval(src.name) : NoInterval;
}
var SIZES = [0, 2, 4, 5, 7, 9, 11];
var TYPES = "PMMPPMM";
function parse2(str) {
  const tokens = tokenizeInterval(str);
  if (tokens[0] === "") {
    return NoInterval;
  }
  const num = +tokens[0];
  const q = tokens[1];
  const step = (Math.abs(num) - 1) % 7;
  const t = TYPES[step];
  if (t === "M" && q === "P") {
    return NoInterval;
  }
  const type = t === "M" ? "majorable" : "perfectable";
  const name = "" + num + q;
  const dir = num < 0 ? -1 : 1;
  const simple = num === 8 || num === -8 ? num : dir * (step + 1);
  const alt = qToAlt(type, q);
  const oct = Math.floor((Math.abs(num) - 1) / 7);
  const semitones = dir * (SIZES[step] + alt + 12 * oct);
  const chroma = (dir * (SIZES[step] + alt) % 12 + 12) % 12;
  const coord = encode({ step, alt, oct, dir });
  return {
    empty: false,
    name,
    num,
    q,
    step,
    alt,
    dir,
    type,
    simple,
    semitones,
    chroma,
    coord,
    oct
  };
}
function coordToInterval(coord, forceDescending) {
  const [f, o = 0] = coord;
  const isDescending = f * 7 + o * 12 < 0;
  const ivl = forceDescending || isDescending ? [-f, -o, -1] : [f, o, 1];
  return interval(decode(ivl));
}
function qToAlt(type, q) {
  return q === "M" && type === "majorable" || q === "P" && type === "perfectable" ? 0 : q === "m" && type === "majorable" ? -1 : /^A+$/.test(q) ? q.length : /^d+$/.test(q) ? -1 * (type === "perfectable" ? q.length : q.length + 1) : 0;
}
function pitchName2(props) {
  const { step, alt, oct = 0, dir } = props;
  if (!dir) {
    return "";
  }
  const calcNum = step + 1 + 7 * oct;
  const num = calcNum === 0 ? step + 1 : calcNum;
  const d = dir < 0 ? "-" : "";
  const type = TYPES[step] === "M" ? "majorable" : "perfectable";
  const name = d + num + altToQ(type, alt);
  return name;
}
function altToQ(type, alt) {
  if (alt === 0) {
    return type === "majorable" ? "M" : "P";
  } else if (alt === -1 && type === "majorable") {
    return "m";
  } else if (alt > 0) {
    return fillStr$1("A", alt);
  } else {
    return fillStr$1("d", type === "perfectable" ? alt : alt + 1);
  }
}

// src/distance.ts
function transpose$3(noteName, intervalName) {
  const note2 = note(noteName);
  const interval2 = interval(intervalName);
  if (note2.empty || interval2.empty) {
    return "";
  }
  const noteCoord = note2.coord;
  const intervalCoord = interval2.coord;
  const tr = noteCoord.length === 1 ? [noteCoord[0] + intervalCoord[0]] : [noteCoord[0] + intervalCoord[0], noteCoord[1] + intervalCoord[1]];
  return coordToNote(tr).name;
}
function distance$3(fromNote, toNote) {
  const from = note(fromNote);
  const to = note(toNote);
  if (from.empty || to.empty) {
    return "";
  }
  const fcoord = from.coord;
  const tcoord = to.coord;
  const fifths = tcoord[0] - fcoord[0];
  const octs = fcoord.length === 2 && tcoord.length === 2 ? tcoord[1] - fcoord[1] : -Math.floor(fifths * 7 / 12);
  const forceDescending = to.height === from.height && to.midi !== null && from.midi !== null && from.step > to.step;
  return coordToInterval([fifths, octs], forceDescending).name;
}

var Core = /*#__PURE__*/Object.freeze({
  __proto__: null,
  accToAlt: accToAlt,
  altToAcc: altToAcc,
  coordToInterval: coordToInterval,
  coordToNote: coordToNote,
  decode: decode,
  deprecate: deprecate,
  distance: distance$3,
  encode: encode,
  fillStr: fillStr$1,
  interval: interval,
  isNamed: isNamed,
  isPitch: isPitch,
  note: note,
  stepToLetter: stepToLetter,
  tokenizeInterval: tokenizeInterval,
  tokenizeNote: tokenizeNote,
  transpose: transpose$3
});

// index.ts
var fillStr = (character, times) => Array(times + 1).join(character);
var REGEX$4 = /^(_{1,}|=|\^{1,}|)([abcdefgABCDEFG])([,']*)$/;
function tokenize$3(str) {
  const m = REGEX$4.exec(str);
  if (!m) {
    return ["", "", ""];
  }
  return [m[1], m[2], m[3]];
}
function abcToScientificNotation(str) {
  const [acc, letter, oct] = tokenize$3(str);
  if (letter === "") {
    return "";
  }
  let o = 4;
  for (let i = 0; i < oct.length; i++) {
    o += oct.charAt(i) === "," ? -1 : 1;
  }
  const a = acc[0] === "_" ? acc.replace(/_/g, "b") : acc[0] === "^" ? acc.replace(/\^/g, "#") : "";
  return letter.charCodeAt(0) > 96 ? letter.toUpperCase() + a + (o + 1) : letter + a + o;
}
function scientificToAbcNotation(str) {
  const n = note(str);
  if (n.empty || !n.oct && n.oct !== 0) {
    return "";
  }
  const { letter, acc, oct } = n;
  const a = acc[0] === "b" ? acc.replace(/b/g, "_") : acc.replace(/#/g, "^");
  const l = oct > 4 ? letter.toLowerCase() : letter;
  const o = oct === 5 ? "" : oct > 4 ? fillStr("'", oct - 5) : fillStr(",", 4 - oct);
  return a + l + o;
}
function transpose$2(note2, interval) {
  return scientificToAbcNotation(transpose$3(abcToScientificNotation(note2), interval));
}
function distance$2(from, to) {
  return distance$3(abcToScientificNotation(from), abcToScientificNotation(to));
}
var abc_notation_default = {
  abcToScientificNotation,
  scientificToAbcNotation,
  tokenize: tokenize$3,
  transpose: transpose$2,
  distance: distance$2
};

// index.ts
function ascR$1(b, n) {
  const a = [];
  for (; n--; a[n] = n + b)
    ;
  return a;
}
function descR$1(b, n) {
  const a = [];
  for (; n--; a[n] = b - n)
    ;
  return a;
}
function range$1(from, to) {
  return from < to ? ascR$1(from, to - from + 1) : descR$1(from, from - to + 1);
}
function rotate$1(times, arr) {
  const len = arr.length;
  const n = (times % len + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}
function compact$1(arr) {
  return arr.filter((n) => n === 0 || n);
}
function sortedNoteNames(notes) {
  const valid = notes.map((n) => note(n)).filter((n) => !n.empty);
  return valid.sort((a, b) => a.height - b.height).map((n) => n.name);
}
function sortedUniqNoteNames(arr) {
  return sortedNoteNames(arr).filter((n, i, a) => i === 0 || n !== a[i - 1]);
}
function shuffle$1(arr, rnd = Math.random) {
  let i;
  let t;
  let m = arr.length;
  while (m) {
    i = Math.floor(rnd() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}
function permutations$1(arr) {
  if (arr.length === 0) {
    return [[]];
  }
  return permutations$1(arr.slice(1)).reduce((acc, perm) => {
    return acc.concat(arr.map((e, pos) => {
      const newPerm = perm.slice();
      newPerm.splice(pos, 0, arr[0]);
      return newPerm;
    }));
  }, []);
}

var index$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  compact: compact$1,
  permutations: permutations$1,
  range: range$1,
  rotate: rotate$1,
  shuffle: shuffle$1,
  sortedNoteNames: sortedNoteNames,
  sortedUniqNoteNames: sortedUniqNoteNames
});

// index.ts
function ascR(b, n) {
  const a = [];
  for (; n--; a[n] = n + b)
    ;
  return a;
}
function descR(b, n) {
  const a = [];
  for (; n--; a[n] = b - n)
    ;
  return a;
}
function range(from, to) {
  return from < to ? ascR(from, to - from + 1) : descR(from, from - to + 1);
}
function rotate(times, arr) {
  const len = arr.length;
  const n = (times % len + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}
function compact(arr) {
  return arr.filter((n) => n === 0 || n);
}
function shuffle(arr, rnd = Math.random) {
  let i;
  let t;
  let m = arr.length;
  while (m) {
    i = Math.floor(rnd() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}
function permutations(arr) {
  if (arr.length === 0) {
    return [[]];
  }
  return permutations(arr.slice(1)).reduce((acc, perm) => {
    return acc.concat(arr.map((e, pos) => {
      const newPerm = perm.slice();
      newPerm.splice(pos, 0, arr[0]);
      return newPerm;
    }));
  }, []);
}
var collection_default = {
  compact,
  permutations,
  range,
  rotate,
  shuffle
};

// index.ts
var EmptyPcset = {
  empty: true,
  name: "",
  setNum: 0,
  chroma: "000000000000",
  normalized: "000000000000",
  intervals: []
};
var setNumToChroma = (num2) => Number(num2).toString(2);
var chromaToNumber = (chroma2) => parseInt(chroma2, 2);
var REGEX$3 = /^[01]{12}$/;
function isChroma(set) {
  return REGEX$3.test(set);
}
var isPcsetNum = (set) => typeof set === "number" && set >= 0 && set <= 4095;
var isPcset = (set) => set && isChroma(set.chroma);
var cache$1 = { [EmptyPcset.chroma]: EmptyPcset };
function get$a(src) {
  const chroma2 = isChroma(src) ? src : isPcsetNum(src) ? setNumToChroma(src) : Array.isArray(src) ? listToChroma(src) : isPcset(src) ? src.chroma : EmptyPcset.chroma;
  return cache$1[chroma2] = cache$1[chroma2] || chromaToPcset(chroma2);
}
var pcset = deprecate("Pcset.pcset", "Pcset.get", get$a);
var chroma$1 = (set) => get$a(set).chroma;
var intervals = (set) => get$a(set).intervals;
var num$1 = (set) => get$a(set).setNum;
var IVLS = [
  "1P",
  "2m",
  "2M",
  "3m",
  "3M",
  "4P",
  "5d",
  "5P",
  "6m",
  "6M",
  "7m",
  "7M"
];
function chromaToIntervals(chroma2) {
  const intervals2 = [];
  for (let i = 0; i < 12; i++) {
    if (chroma2.charAt(i) === "1")
      intervals2.push(IVLS[i]);
  }
  return intervals2;
}
function chromas() {
  return range(2048, 4095).map(setNumToChroma);
}
function modes$1(set, normalize = true) {
  const pcs = get$a(set);
  const binary = pcs.chroma.split("");
  return compact(binary.map((_, i) => {
    const r = rotate(i, binary);
    return normalize && r[0] === "0" ? null : r.join("");
  }));
}
function isEqual(s1, s2) {
  return get$a(s1).setNum === get$a(s2).setNum;
}
function isSubsetOf(set) {
  const s = get$a(set).setNum;
  return (notes) => {
    const o = get$a(notes).setNum;
    return s && s !== o && (o & s) === o;
  };
}
function isSupersetOf(set) {
  const s = get$a(set).setNum;
  return (notes) => {
    const o = get$a(notes).setNum;
    return s && s !== o && (o | s) === o;
  };
}
function isNoteIncludedIn(set) {
  const s = get$a(set);
  return (noteName) => {
    const n = note(noteName);
    return s && !n.empty && s.chroma.charAt(n.chroma) === "1";
  };
}
function filter(set) {
  const isIncluded = isNoteIncludedIn(set);
  return (notes) => {
    return notes.filter(isIncluded);
  };
}
var pcset_default = {
  get: get$a,
  chroma: chroma$1,
  num: num$1,
  intervals,
  chromas,
  isSupersetOf,
  isSubsetOf,
  isNoteIncludedIn,
  isEqual,
  filter,
  modes: modes$1,
  pcset
};
function chromaRotations(chroma2) {
  const binary = chroma2.split("");
  return binary.map((_, i) => rotate(i, binary).join(""));
}
function chromaToPcset(chroma2) {
  const setNum = chromaToNumber(chroma2);
  const normalizedNum = chromaRotations(chroma2).map(chromaToNumber).filter((n) => n >= 2048).sort()[0];
  const normalized = setNumToChroma(normalizedNum);
  const intervals2 = chromaToIntervals(chroma2);
  return {
    empty: false,
    name: "",
    setNum,
    chroma: chroma2,
    normalized,
    intervals: intervals2
  };
}
function listToChroma(set) {
  if (set.length === 0) {
    return EmptyPcset.chroma;
  }
  let pitch;
  const binary = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < set.length; i++) {
    pitch = note(set[i]);
    if (pitch.empty)
      pitch = interval(set[i]);
    if (!pitch.empty)
      binary[pitch.chroma] = 1;
  }
  return binary.join("");
}

// index.ts

// data.ts
var CHORDS = [
  ["1P 3M 5P", "major", "M ^  maj"],
  ["1P 3M 5P 7M", "major seventh", "maj7 \u0394 ma7 M7 Maj7 ^7"],
  ["1P 3M 5P 7M 9M", "major ninth", "maj9 \u03949 ^9"],
  ["1P 3M 5P 7M 9M 13M", "major thirteenth", "maj13 Maj13 ^13"],
  ["1P 3M 5P 6M", "sixth", "6 add6 add13 M6"],
  ["1P 3M 5P 6M 9M", "sixth/ninth", "6/9 69 M69"],
  ["1P 3M 6m 7M", "major seventh flat sixth", "M7b6 ^7b6"],
  [
    "1P 3M 5P 7M 11A",
    "major seventh sharp eleventh",
    "maj#4 \u0394#4 \u0394#11 M7#11 ^7#11 maj7#11"
  ],
  ["1P 3m 5P", "minor", "m min -"],
  ["1P 3m 5P 7m", "minor seventh", "m7 min7 mi7 -7"],
  [
    "1P 3m 5P 7M",
    "minor/major seventh",
    "m/ma7 m/maj7 mM7 mMaj7 m/M7 -\u03947 m\u0394 -^7"
  ],
  ["1P 3m 5P 6M", "minor sixth", "m6 -6"],
  ["1P 3m 5P 7m 9M", "minor ninth", "m9 -9"],
  ["1P 3m 5P 7M 9M", "minor/major ninth", "mM9 mMaj9 -^9"],
  ["1P 3m 5P 7m 9M 11P", "minor eleventh", "m11 -11"],
  ["1P 3m 5P 7m 9M 13M", "minor thirteenth", "m13 -13"],
  ["1P 3m 5d", "diminished", "dim \xB0 o"],
  ["1P 3m 5d 7d", "diminished seventh", "dim7 \xB07 o7"],
  ["1P 3m 5d 7m", "half-diminished", "m7b5 \xF8 -7b5 h7 h"],
  ["1P 3M 5P 7m", "dominant seventh", "7 dom"],
  ["1P 3M 5P 7m 9M", "dominant ninth", "9"],
  ["1P 3M 5P 7m 9M 13M", "dominant thirteenth", "13"],
  ["1P 3M 5P 7m 11A", "lydian dominant seventh", "7#11 7#4"],
  ["1P 3M 5P 7m 9m", "dominant flat ninth", "7b9"],
  ["1P 3M 5P 7m 9A", "dominant sharp ninth", "7#9"],
  ["1P 3M 7m 9m", "altered", "alt7"],
  ["1P 4P 5P", "suspended fourth", "sus4 sus"],
  ["1P 2M 5P", "suspended second", "sus2"],
  ["1P 4P 5P 7m", "suspended fourth seventh", "7sus4 7sus"],
  ["1P 5P 7m 9M 11P", "eleventh", "11"],
  [
    "1P 4P 5P 7m 9m",
    "suspended fourth flat ninth",
    "b9sus phryg 7b9sus 7b9sus4"
  ],
  ["1P 5P", "fifth", "5"],
  ["1P 3M 5A", "augmented", "aug + +5 ^#5"],
  ["1P 3m 5A", "minor augmented", "m#5 -#5 m+"],
  ["1P 3M 5A 7M", "augmented seventh", "maj7#5 maj7+5 +maj7 ^7#5"],
  [
    "1P 3M 5P 7M 9M 11A",
    "major sharp eleventh (lydian)",
    "maj9#11 \u03949#11 ^9#11"
  ],
  ["1P 2M 4P 5P", "", "sus24 sus4add9"],
  ["1P 3M 5A 7M 9M", "", "maj9#5 Maj9#5"],
  ["1P 3M 5A 7m", "", "7#5 +7 7+ 7aug aug7"],
  ["1P 3M 5A 7m 9A", "", "7#5#9 7#9#5 7alt"],
  ["1P 3M 5A 7m 9M", "", "9#5 9+"],
  ["1P 3M 5A 7m 9M 11A", "", "9#5#11"],
  ["1P 3M 5A 7m 9m", "", "7#5b9 7b9#5"],
  ["1P 3M 5A 7m 9m 11A", "", "7#5b9#11"],
  ["1P 3M 5A 9A", "", "+add#9"],
  ["1P 3M 5A 9M", "", "M#5add9 +add9"],
  ["1P 3M 5P 6M 11A", "", "M6#11 M6b5 6#11 6b5"],
  ["1P 3M 5P 6M 7M 9M", "", "M7add13"],
  ["1P 3M 5P 6M 9M 11A", "", "69#11"],
  ["1P 3m 5P 6M 9M", "", "m69 -69"],
  ["1P 3M 5P 6m 7m", "", "7b6"],
  ["1P 3M 5P 7M 9A 11A", "", "maj7#9#11"],
  ["1P 3M 5P 7M 9M 11A 13M", "", "M13#11 maj13#11 M13+4 M13#4"],
  ["1P 3M 5P 7M 9m", "", "M7b9"],
  ["1P 3M 5P 7m 11A 13m", "", "7#11b13 7b5b13"],
  ["1P 3M 5P 7m 13M", "", "7add6 67 7add13"],
  ["1P 3M 5P 7m 9A 11A", "", "7#9#11 7b5#9 7#9b5"],
  ["1P 3M 5P 7m 9A 11A 13M", "", "13#9#11"],
  ["1P 3M 5P 7m 9A 11A 13m", "", "7#9#11b13"],
  ["1P 3M 5P 7m 9A 13M", "", "13#9"],
  ["1P 3M 5P 7m 9A 13m", "", "7#9b13"],
  ["1P 3M 5P 7m 9M 11A", "", "9#11 9+4 9#4"],
  ["1P 3M 5P 7m 9M 11A 13M", "", "13#11 13+4 13#4"],
  ["1P 3M 5P 7m 9M 11A 13m", "", "9#11b13 9b5b13"],
  ["1P 3M 5P 7m 9m 11A", "", "7b9#11 7b5b9 7b9b5"],
  ["1P 3M 5P 7m 9m 11A 13M", "", "13b9#11"],
  ["1P 3M 5P 7m 9m 11A 13m", "", "7b9b13#11 7b9#11b13 7b5b9b13"],
  ["1P 3M 5P 7m 9m 13M", "", "13b9"],
  ["1P 3M 5P 7m 9m 13m", "", "7b9b13"],
  ["1P 3M 5P 7m 9m 9A", "", "7b9#9"],
  ["1P 3M 5P 9M", "", "Madd9 2 add9 add2"],
  ["1P 3M 5P 9m", "", "Maddb9"],
  ["1P 3M 5d", "", "Mb5"],
  ["1P 3M 5d 6M 7m 9M", "", "13b5"],
  ["1P 3M 5d 7M", "", "M7b5"],
  ["1P 3M 5d 7M 9M", "", "M9b5"],
  ["1P 3M 5d 7m", "", "7b5"],
  ["1P 3M 5d 7m 9M", "", "9b5"],
  ["1P 3M 7m", "", "7no5"],
  ["1P 3M 7m 13m", "", "7b13"],
  ["1P 3M 7m 9M", "", "9no5"],
  ["1P 3M 7m 9M 13M", "", "13no5"],
  ["1P 3M 7m 9M 13m", "", "9b13"],
  ["1P 3m 4P 5P", "", "madd4"],
  ["1P 3m 5P 6m 7M", "", "mMaj7b6"],
  ["1P 3m 5P 6m 7M 9M", "", "mMaj9b6"],
  ["1P 3m 5P 7m 11P", "", "m7add11 m7add4"],
  ["1P 3m 5P 9M", "", "madd9"],
  ["1P 3m 5d 6M 7M", "", "o7M7"],
  ["1P 3m 5d 7M", "", "oM7"],
  ["1P 3m 6m 7M", "", "mb6M7"],
  ["1P 3m 6m 7m", "", "m7#5"],
  ["1P 3m 6m 7m 9M", "", "m9#5"],
  ["1P 3m 5A 7m 9M 11P", "", "m11A"],
  ["1P 3m 6m 9m", "", "mb6b9"],
  ["1P 2M 3m 5d 7m", "", "m9b5"],
  ["1P 4P 5A 7M", "", "M7#5sus4"],
  ["1P 4P 5A 7M 9M", "", "M9#5sus4"],
  ["1P 4P 5A 7m", "", "7#5sus4"],
  ["1P 4P 5P 7M", "", "M7sus4"],
  ["1P 4P 5P 7M 9M", "", "M9sus4"],
  ["1P 4P 5P 7m 9M", "", "9sus4 9sus"],
  ["1P 4P 5P 7m 9M 13M", "", "13sus4 13sus"],
  ["1P 4P 5P 7m 9m 13m", "", "7sus4b9b13 7b9b13sus4"],
  ["1P 4P 7m 10m", "", "4 quartal"],
  ["1P 5P 7m 9m 11P", "", "11b9"]
];
var data_default$2 = CHORDS;

// index.ts
var NoChordType = {
  ...EmptyPcset,
  name: "",
  quality: "Unknown",
  intervals: [],
  aliases: []
};
var dictionary$1 = [];
var index$2 = {};
function get$9(type) {
  return index$2[type] || NoChordType;
}
var chordType = deprecate("ChordType.chordType", "ChordType.get", get$9);
function names$8() {
  return dictionary$1.map((chord) => chord.name).filter((x) => x);
}
function symbols() {
  return dictionary$1.map((chord) => chord.aliases[0]).filter((x) => x);
}
function keys$1() {
  return Object.keys(index$2);
}
function all$2() {
  return dictionary$1.slice();
}
var entries$2 = deprecate("ChordType.entries", "ChordType.all", all$2);
function removeAll$1() {
  dictionary$1 = [];
  index$2 = {};
}
function add$3(intervals, aliases, fullName) {
  const quality = getQuality(intervals);
  const chord = {
    ...get$a(intervals),
    name: fullName || "",
    quality,
    intervals,
    aliases
  };
  dictionary$1.push(chord);
  if (chord.name) {
    index$2[chord.name] = chord;
  }
  index$2[chord.setNum] = chord;
  index$2[chord.chroma] = chord;
  chord.aliases.forEach((alias) => addAlias$1(chord, alias));
}
function addAlias$1(chord, alias) {
  index$2[alias] = chord;
}
function getQuality(intervals) {
  const has = (interval) => intervals.indexOf(interval) !== -1;
  return has("5A") ? "Augmented" : has("3M") ? "Major" : has("5d") ? "Diminished" : has("3m") ? "Minor" : "Unknown";
}
data_default$2.forEach(([ivls, fullName, names2]) => add$3(ivls.split(" "), names2.split(" "), fullName));
dictionary$1.sort((a, b) => a.setNum - b.setNum);
var chord_type_default = {
  names: names$8,
  symbols,
  get: get$9,
  all: all$2,
  add: add$3,
  removeAll: removeAll$1,
  keys: keys$1,
  entries: entries$2,
  chordType
};

// index.ts
var namedSet = (notes) => {
  const pcToName = notes.reduce((record, n) => {
    const chroma = note(n).chroma;
    if (chroma !== void 0) {
      record[chroma] = record[chroma] || note(n).name;
    }
    return record;
  }, {});
  return (chroma) => pcToName[chroma];
};
function detect(source) {
  const notes = source.map((n) => note(n).pc).filter((x) => x);
  if (note.length === 0) {
    return [];
  }
  const found = findExactMatches(notes, 1);
  return found.filter((chord) => chord.weight).sort((a, b) => b.weight - a.weight).map((chord) => chord.name);
}
function findExactMatches(notes, weight) {
  const tonic = notes[0];
  const tonicChroma = note(tonic).chroma;
  const noteName = namedSet(notes);
  const allModes = modes$1(notes, false);
  const found = [];
  allModes.forEach((mode, index) => {
    const chordTypes = all$2().filter((chordType) => chordType.chroma === mode);
    chordTypes.forEach((chordType) => {
      const chordName = chordType.aliases[0];
      const baseNote = noteName(index);
      const isInversion = index !== tonicChroma;
      if (isInversion) {
        found.push({
          weight: 0.5 * weight,
          name: `${baseNote}${chordName}/${tonic}`
        });
      } else {
        found.push({ weight: 1 * weight, name: `${baseNote}${chordName}` });
      }
    });
  });
  return found;
}

// index.ts

// data.ts
var SCALES = [
  ["1P 2M 3M 5P 6M", "major pentatonic", "pentatonic"],
  ["1P 3M 4P 5P 7M", "ionian pentatonic"],
  ["1P 3M 4P 5P 7m", "mixolydian pentatonic", "indian"],
  ["1P 2M 4P 5P 6M", "ritusen"],
  ["1P 2M 4P 5P 7m", "egyptian"],
  ["1P 3M 4P 5d 7m", "neopolitan major pentatonic"],
  ["1P 3m 4P 5P 6m", "vietnamese 1"],
  ["1P 2m 3m 5P 6m", "pelog"],
  ["1P 2m 4P 5P 6m", "kumoijoshi"],
  ["1P 2M 3m 5P 6m", "hirajoshi"],
  ["1P 2m 4P 5d 7m", "iwato"],
  ["1P 2m 4P 5P 7m", "in-sen"],
  ["1P 3M 4A 5P 7M", "lydian pentatonic", "chinese"],
  ["1P 3m 4P 6m 7m", "malkos raga"],
  ["1P 3m 4P 5d 7m", "locrian pentatonic", "minor seven flat five pentatonic"],
  ["1P 3m 4P 5P 7m", "minor pentatonic", "vietnamese 2"],
  ["1P 3m 4P 5P 6M", "minor six pentatonic"],
  ["1P 2M 3m 5P 6M", "flat three pentatonic", "kumoi"],
  ["1P 2M 3M 5P 6m", "flat six pentatonic"],
  ["1P 2m 3M 5P 6M", "scriabin"],
  ["1P 3M 5d 6m 7m", "whole tone pentatonic"],
  ["1P 3M 4A 5A 7M", "lydian #5P pentatonic"],
  ["1P 3M 4A 5P 7m", "lydian dominant pentatonic"],
  ["1P 3m 4P 5P 7M", "minor #7M pentatonic"],
  ["1P 3m 4d 5d 7m", "super locrian pentatonic"],
  ["1P 2M 3m 4P 5P 7M", "minor hexatonic"],
  ["1P 2A 3M 5P 5A 7M", "augmented"],
  ["1P 2M 3m 3M 5P 6M", "major blues"],
  ["1P 2M 4P 5P 6M 7m", "piongio"],
  ["1P 2m 3M 4A 6M 7m", "prometheus neopolitan"],
  ["1P 2M 3M 4A 6M 7m", "prometheus"],
  ["1P 2m 3M 5d 6m 7m", "mystery #1"],
  ["1P 2m 3M 4P 5A 6M", "six tone symmetric"],
  ["1P 2M 3M 4A 5A 7m", "whole tone", "messiaen's mode #1"],
  ["1P 2m 4P 4A 5P 7M", "messiaen's mode #5"],
  ["1P 3m 4P 5d 5P 7m", "minor blues", "blues"],
  ["1P 2M 3M 4P 5d 6m 7m", "locrian major", "arabian"],
  ["1P 2m 3M 4A 5P 6m 7M", "double harmonic lydian"],
  ["1P 2M 3m 4P 5P 6m 7M", "harmonic minor"],
  [
    "1P 2m 2A 3M 4A 6m 7m",
    "altered",
    "super locrian",
    "diminished whole tone",
    "pomeroy"
  ],
  ["1P 2M 3m 4P 5d 6m 7m", "locrian #2", "half-diminished", "aeolian b5"],
  [
    "1P 2M 3M 4P 5P 6m 7m",
    "mixolydian b6",
    "melodic minor fifth mode",
    "hindu"
  ],
  ["1P 2M 3M 4A 5P 6M 7m", "lydian dominant", "lydian b7", "overtone"],
  ["1P 2M 3M 4A 5P 6M 7M", "lydian"],
  ["1P 2M 3M 4A 5A 6M 7M", "lydian augmented"],
  [
    "1P 2m 3m 4P 5P 6M 7m",
    "dorian b2",
    "phrygian #6",
    "melodic minor second mode"
  ],
  ["1P 2M 3m 4P 5P 6M 7M", "melodic minor"],
  ["1P 2m 3m 4P 5d 6m 7m", "locrian"],
  [
    "1P 2m 3m 4d 5d 6m 7d",
    "ultralocrian",
    "superlocrian bb7",
    "superlocrian diminished"
  ],
  ["1P 2m 3m 4P 5d 6M 7m", "locrian 6", "locrian natural 6", "locrian sharp 6"],
  ["1P 2A 3M 4P 5P 5A 7M", "augmented heptatonic"],
  [
    "1P 2M 3m 4A 5P 6M 7m",
    "dorian #4",
    "ukrainian dorian",
    "romanian minor",
    "altered dorian"
  ],
  ["1P 2M 3m 4A 5P 6M 7M", "lydian diminished"],
  ["1P 2m 3m 4P 5P 6m 7m", "phrygian"],
  ["1P 2M 3M 4A 5A 7m 7M", "leading whole tone"],
  ["1P 2M 3M 4A 5P 6m 7m", "lydian minor"],
  ["1P 2m 3M 4P 5P 6m 7m", "phrygian dominant", "spanish", "phrygian major"],
  ["1P 2m 3m 4P 5P 6m 7M", "balinese"],
  ["1P 2m 3m 4P 5P 6M 7M", "neopolitan major"],
  ["1P 2M 3m 4P 5P 6m 7m", "aeolian", "minor"],
  ["1P 2M 3M 4P 5P 6m 7M", "harmonic major"],
  ["1P 2m 3M 4P 5P 6m 7M", "double harmonic major", "gypsy"],
  ["1P 2M 3m 4P 5P 6M 7m", "dorian"],
  ["1P 2M 3m 4A 5P 6m 7M", "hungarian minor"],
  ["1P 2A 3M 4A 5P 6M 7m", "hungarian major"],
  ["1P 2m 3M 4P 5d 6M 7m", "oriental"],
  ["1P 2m 3m 3M 4A 5P 7m", "flamenco"],
  ["1P 2m 3m 4A 5P 6m 7M", "todi raga"],
  ["1P 2M 3M 4P 5P 6M 7m", "mixolydian", "dominant"],
  ["1P 2m 3M 4P 5d 6m 7M", "persian"],
  ["1P 2M 3M 4P 5P 6M 7M", "major", "ionian"],
  ["1P 2m 3M 5d 6m 7m 7M", "enigmatic"],
  [
    "1P 2M 3M 4P 5A 6M 7M",
    "major augmented",
    "major #5",
    "ionian augmented",
    "ionian #5"
  ],
  ["1P 2A 3M 4A 5P 6M 7M", "lydian #9"],
  ["1P 2m 2M 4P 4A 5P 6m 7M", "messiaen's mode #4"],
  ["1P 2m 3M 4P 4A 5P 6m 7M", "purvi raga"],
  ["1P 2m 3m 3M 4P 5P 6m 7m", "spanish heptatonic"],
  ["1P 2M 3M 4P 5P 6M 7m 7M", "bebop"],
  ["1P 2M 3m 3M 4P 5P 6M 7m", "bebop minor"],
  ["1P 2M 3M 4P 5P 5A 6M 7M", "bebop major"],
  ["1P 2m 3m 4P 5d 5P 6m 7m", "bebop locrian"],
  ["1P 2M 3m 4P 5P 6m 7m 7M", "minor bebop"],
  ["1P 2M 3m 4P 5d 6m 6M 7M", "diminished", "whole-half diminished"],
  ["1P 2M 3M 4P 5d 5P 6M 7M", "ichikosucho"],
  ["1P 2M 3m 4P 5P 6m 6M 7M", "minor six diminished"],
  [
    "1P 2m 3m 3M 4A 5P 6M 7m",
    "half-whole diminished",
    "dominant diminished",
    "messiaen's mode #2"
  ],
  ["1P 3m 3M 4P 5P 6M 7m 7M", "kafi raga"],
  ["1P 2M 3M 4P 4A 5A 6A 7M", "messiaen's mode #6"],
  ["1P 2M 3m 3M 4P 5d 5P 6M 7m", "composite blues"],
  ["1P 2M 3m 3M 4A 5P 6m 7m 7M", "messiaen's mode #3"],
  ["1P 2m 2M 3m 4P 4A 5P 6m 6M 7M", "messiaen's mode #7"],
  ["1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M", "chromatic"]
];
var data_default$1 = SCALES;

// index.ts
var NoScaleType = {
  ...EmptyPcset,
  intervals: [],
  aliases: []
};
var dictionary = [];
var index$1 = {};
function names$7() {
  return dictionary.map((scale) => scale.name);
}
function get$8(type) {
  return index$1[type] || NoScaleType;
}
var scaleType = deprecate("ScaleDictionary.scaleType", "ScaleType.get", get$8);
function all$1() {
  return dictionary.slice();
}
var entries$1 = deprecate("ScaleDictionary.entries", "ScaleType.all", all$1);
function keys() {
  return Object.keys(index$1);
}
function removeAll() {
  dictionary = [];
  index$1 = {};
}
function add$2(intervals, name, aliases = []) {
  const scale = { ...get$a(intervals), name, intervals, aliases };
  dictionary.push(scale);
  index$1[scale.name] = scale;
  index$1[scale.setNum] = scale;
  index$1[scale.chroma] = scale;
  scale.aliases.forEach((alias) => addAlias(scale, alias));
  return scale;
}
function addAlias(scale, alias) {
  index$1[alias] = scale;
}
data_default$1.forEach(([ivls, name, ...aliases]) => add$2(ivls.split(" "), name, aliases));
var scale_type_default = {
  names: names$7,
  get: get$8,
  all: all$1,
  add: add$2,
  removeAll,
  keys,
  entries: entries$1,
  scaleType
};

// index.ts
var NoChord = {
  empty: true,
  name: "",
  symbol: "",
  root: "",
  rootDegree: 0,
  type: "",
  tonic: null,
  setNum: NaN,
  quality: "Unknown",
  chroma: "",
  normalized: "",
  aliases: [],
  notes: [],
  intervals: []
};
var NUM_TYPES = /^(6|64|7|9|11|13)$/;
function tokenize$2(name) {
  const [letter, acc, oct, type] = tokenizeNote(name);
  if (letter === "") {
    return ["", name];
  }
  if (letter === "A" && type === "ug") {
    return ["", "aug"];
  }
  if (!type && (oct === "4" || oct === "5")) {
    return [letter + acc, oct];
  }
  if (NUM_TYPES.test(oct)) {
    return [letter + acc, oct + type];
  } else {
    return [letter + acc + oct, type];
  }
}
function get$7(src) {
  if (src === "") {
    return NoChord;
  }
  if (Array.isArray(src) && src.length === 2) {
    return getChord(src[1], src[0]);
  } else {
    const [tonic, type] = tokenize$2(src);
    const chord2 = getChord(type, tonic);
    return chord2.empty ? getChord(src) : chord2;
  }
}
function getChord(typeName, optionalTonic, optionalRoot) {
  const type = get$9(typeName);
  const tonic = note(optionalTonic || "");
  const root = note(optionalRoot || "");
  if (type.empty || optionalTonic && tonic.empty || optionalRoot && root.empty) {
    return NoChord;
  }
  const rootInterval = distance$3(tonic.pc, root.pc);
  const rootDegree = type.intervals.indexOf(rootInterval) + 1;
  if (!root.empty && !rootDegree) {
    return NoChord;
  }
  const intervals = Array.from(type.intervals);
  for (let i = 1; i < rootDegree; i++) {
    const num = intervals[0][0];
    const quality = intervals[0][1];
    const newNum = parseInt(num, 10) + 7;
    intervals.push(`${newNum}${quality}`);
    intervals.shift();
  }
  const notes = tonic.empty ? [] : intervals.map((i) => transpose$3(tonic, i));
  typeName = type.aliases.indexOf(typeName) !== -1 ? typeName : type.aliases[0];
  const symbol = `${tonic.empty ? "" : tonic.pc}${typeName}${root.empty || rootDegree <= 1 ? "" : "/" + root.pc}`;
  const name = `${optionalTonic ? tonic.pc + " " : ""}${type.name}${rootDegree > 1 && optionalRoot ? " over " + root.pc : ""}`;
  return {
    ...type,
    name,
    symbol,
    type: type.name,
    root: root.name,
    intervals,
    rootDegree,
    tonic: tonic.name,
    notes
  };
}
var chord = deprecate("Chord.chord", "Chord.get", get$7);
function transpose$1(chordName, interval) {
  const [tonic, type] = tokenize$2(chordName);
  if (!tonic) {
    return chordName;
  }
  return transpose$3(tonic, interval) + type;
}
function chordScales(name) {
  const s = get$7(name);
  const isChordIncluded = isSupersetOf(s.chroma);
  return all$1().filter((scale) => isChordIncluded(scale.chroma)).map((scale) => scale.name);
}
function extended$1(chordName) {
  const s = get$7(chordName);
  const isSuperset = isSupersetOf(s.chroma);
  return all$2().filter((chord2) => isSuperset(chord2.chroma)).map((chord2) => s.tonic + chord2.aliases[0]);
}
function reduced$1(chordName) {
  const s = get$7(chordName);
  const isSubset = isSubsetOf(s.chroma);
  return all$2().filter((chord2) => isSubset(chord2.chroma)).map((chord2) => s.tonic + chord2.aliases[0]);
}
var chord_default = {
  getChord,
  get: get$7,
  detect,
  chordScales,
  extended: extended$1,
  reduced: reduced$1,
  tokenize: tokenize$2,
  transpose: transpose$1,
  chord
};

// data.ts
var DATA = [
  [
    0.125,
    "dl",
    ["large", "duplex longa", "maxima", "octuple", "octuple whole"]
  ],
  [0.25, "l", ["long", "longa"]],
  [0.5, "d", ["double whole", "double", "breve"]],
  [1, "w", ["whole", "semibreve"]],
  [2, "h", ["half", "minim"]],
  [4, "q", ["quarter", "crotchet"]],
  [8, "e", ["eighth", "quaver"]],
  [16, "s", ["sixteenth", "semiquaver"]],
  [32, "t", ["thirty-second", "demisemiquaver"]],
  [64, "sf", ["sixty-fourth", "hemidemisemiquaver"]],
  [128, "h", ["hundred twenty-eighth"]],
  [256, "th", ["two hundred fifty-sixth"]]
];
var data_default = DATA;

// index.ts
var VALUES = [];
data_default.forEach(([denominator, shorthand, names2]) => add$1(denominator, shorthand, names2));
var NoDuration = {
  empty: true,
  name: "",
  value: 0,
  fraction: [0, 0],
  shorthand: "",
  dots: "",
  names: []
};
function names$6() {
  return VALUES.reduce((names2, duration) => {
    duration.names.forEach((name) => names2.push(name));
    return names2;
  }, []);
}
function shorthands() {
  return VALUES.map((dur) => dur.shorthand);
}
var REGEX$2 = /^([^.]+)(\.*)$/;
function get$6(name) {
  const [_, simple, dots] = REGEX$2.exec(name) || [];
  const base = VALUES.find((dur) => dur.shorthand === simple || dur.names.includes(simple));
  if (!base) {
    return NoDuration;
  }
  const fraction2 = calcDots(base.fraction, dots.length);
  const value2 = fraction2[0] / fraction2[1];
  return { ...base, name, dots, value: value2, fraction: fraction2 };
}
var value = (name) => get$6(name).value;
var fraction = (name) => get$6(name).fraction;
var duration_value_default = { names: names$6, shorthands, get: get$6, value, fraction };
function add$1(denominator, shorthand, names2) {
  VALUES.push({
    empty: false,
    dots: "",
    name: "",
    value: 1 / denominator,
    fraction: denominator < 1 ? [1 / denominator, 1] : [1, denominator],
    shorthand,
    names: names2
  });
}
function calcDots(fraction2, dots) {
  const pow = Math.pow(2, dots);
  let numerator = fraction2[0] * pow;
  let denominator = fraction2[1] * pow;
  const base = numerator;
  for (let i = 0; i < dots; i++) {
    numerator += base / Math.pow(2, i + 1);
  }
  while (numerator % 2 === 0 && denominator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  return [numerator, denominator];
}

// index.ts
function names$5() {
  return "1P 2M 3M 4P 5P 6m 7m".split(" ");
}
var get$5 = interval;
var name$1 = (name2) => interval(name2).name;
var semitones = (name2) => interval(name2).semitones;
var quality = (name2) => interval(name2).q;
var num = (name2) => interval(name2).num;
function simplify$1(name2) {
  const i = interval(name2);
  return i.empty ? "" : i.simple + i.q;
}
function invert(name2) {
  const i = interval(name2);
  if (i.empty) {
    return "";
  }
  const step = (7 - i.step) % 7;
  const alt = i.type === "perfectable" ? -i.alt : -(i.alt + 1);
  return interval({ step, alt, oct: i.oct, dir: i.dir }).name;
}
var IN = [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7];
var IQ = "P m M m M P d P m M m M".split(" ");
function fromSemitones(semitones2) {
  const d = semitones2 < 0 ? -1 : 1;
  const n = Math.abs(semitones2);
  const c = n % 12;
  const o = Math.floor(n / 12);
  return d * (IN[c] + 7 * o) + IQ[c];
}
var distance$1 = distance$3;
var add = combinator((a, b) => [a[0] + b[0], a[1] + b[1]]);
var addTo = (interval) => (other) => add(interval, other);
var substract = combinator((a, b) => [a[0] - b[0], a[1] - b[1]]);
function transposeFifths$1(interval, fifths) {
  const ivl = get$5(interval);
  if (ivl.empty)
    return "";
  const [nFifths, nOcts, dir] = ivl.coord;
  return coordToInterval([nFifths + fifths, nOcts, dir]).name;
}
var interval_default = {
  names: names$5,
  get: get$5,
  name: name$1,
  num,
  semitones,
  quality,
  fromSemitones,
  distance: distance$1,
  invert,
  simplify: simplify$1,
  add,
  addTo,
  substract,
  transposeFifths: transposeFifths$1
};
function combinator(fn) {
  return (a, b) => {
    const coordA = interval(a).coord;
    const coordB = interval(b).coord;
    if (coordA && coordB) {
      const coord = fn(coordA, coordB);
      return coordToInterval(coord).name;
    }
  };
}

// index.ts
function isMidi(arg) {
  return +arg >= 0 && +arg <= 127;
}
function toMidi(note$1) {
  if (isMidi(note$1)) {
    return +note$1;
  }
  const n = note(note$1);
  return n.empty ? null : n.midi;
}
function midiToFreq(midi, tuning = 440) {
  return Math.pow(2, (midi - 69) / 12) * tuning;
}
var L2 = Math.log(2);
var L440 = Math.log(440);
function freqToMidi(freq) {
  const v = 12 * (Math.log(freq) - L440) / L2 + 69;
  return Math.round(v * 100) / 100;
}
var SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
var FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
function midiToNoteName(midi, options = {}) {
  if (isNaN(midi) || midi === -Infinity || midi === Infinity)
    return "";
  midi = Math.round(midi);
  const pcs = options.sharps === true ? SHARPS : FLATS;
  const pc = pcs[midi % 12];
  if (options.pitchClass) {
    return pc;
  }
  const o = Math.floor(midi / 12) - 1;
  return pc + o;
}
var midi_default = { isMidi, toMidi, midiToFreq, midiToNoteName, freqToMidi };

// index.ts
var NAMES$2 = ["C", "D", "E", "F", "G", "A", "B"];
var toName = (n) => n.name;
var onlyNotes = (array) => array.map(note).filter((n) => !n.empty);
function names$4(array) {
  if (array === void 0) {
    return NAMES$2.slice();
  } else if (!Array.isArray(array)) {
    return [];
  } else {
    return onlyNotes(array).map(toName);
  }
}
var get$4 = note;
var name = (note) => get$4(note).name;
var pitchClass = (note) => get$4(note).pc;
var accidentals = (note) => get$4(note).acc;
var octave = (note) => get$4(note).oct;
var midi = (note) => get$4(note).midi;
var freq = (note) => get$4(note).freq;
var chroma = (note) => get$4(note).chroma;
function fromMidi(midi2) {
  return midiToNoteName(midi2);
}
function fromFreq(freq2) {
  return midiToNoteName(freqToMidi(freq2));
}
function fromFreqSharps(freq2) {
  return midiToNoteName(freqToMidi(freq2), { sharps: true });
}
function fromMidiSharps(midi2) {
  return midiToNoteName(midi2, { sharps: true });
}
var transpose = transpose$3;
var tr = transpose$3;
var transposeBy = (interval) => (note) => transpose(note, interval);
var trBy = transposeBy;
var transposeFrom = (note) => (interval) => transpose(note, interval);
var trFrom = transposeFrom;
function transposeFifths(noteName, fifths) {
  const note = get$4(noteName);
  if (note.empty) {
    return "";
  }
  const [nFifths, nOcts] = note.coord;
  const transposed = nOcts === void 0 ? coordToNote([nFifths + fifths]) : coordToNote([nFifths + fifths, nOcts]);
  return transposed.name;
}
var trFifths = transposeFifths;
var ascending = (a, b) => a.height - b.height;
var descending = (a, b) => b.height - a.height;
function sortedNames(notes, comparator) {
  comparator = comparator || ascending;
  return onlyNotes(notes).sort(comparator).map(toName);
}
function sortedUniqNames(notes) {
  return sortedNames(notes, ascending).filter((n, i, a) => i === 0 || n !== a[i - 1]);
}
var simplify = (noteName) => {
  const note = get$4(noteName);
  if (note.empty) {
    return "";
  }
  return midiToNoteName(note.midi || note.chroma, {
    sharps: note.alt > 0,
    pitchClass: note.midi === null
  });
};
function enharmonic(noteName, destName) {
  const src = get$4(noteName);
  if (src.empty) {
    return "";
  }
  const dest = get$4(destName || midiToNoteName(src.midi || src.chroma, {
    sharps: src.alt < 0,
    pitchClass: true
  }));
  if (dest.empty || dest.chroma !== src.chroma) {
    return "";
  }
  if (src.oct === void 0) {
    return dest.pc;
  }
  const srcChroma = src.chroma - src.alt;
  const destChroma = dest.chroma - dest.alt;
  const destOctOffset = srcChroma > 11 || destChroma < 0 ? -1 : srcChroma < 0 || destChroma > 11 ? 1 : 0;
  const destOct = src.oct + destOctOffset;
  return dest.pc + destOct;
}
var note_default = {
  names: names$4,
  get: get$4,
  name,
  pitchClass,
  accidentals,
  octave,
  midi,
  ascending,
  descending,
  sortedNames,
  sortedUniqNames,
  fromMidi,
  fromMidiSharps,
  freq,
  fromFreq,
  fromFreqSharps,
  chroma,
  transpose,
  tr,
  transposeBy,
  trBy,
  transposeFrom,
  trFrom,
  transposeFifths,
  trFifths,
  simplify,
  enharmonic
};

// index.ts
var NoRomanNumeral = { empty: true, name: "", chordType: "" };
var cache = {};
function get$3(src) {
  return typeof src === "string" ? cache[src] || (cache[src] = parse$1(src)) : typeof src === "number" ? get$3(NAMES$1[src] || "") : isPitch(src) ? fromPitch(src) : isNamed(src) ? get$3(src.name) : NoRomanNumeral;
}
var romanNumeral = deprecate("RomanNumeral.romanNumeral", "RomanNumeral.get", get$3);
function names$3(major = true) {
  return (major ? NAMES$1 : NAMES_MINOR).slice();
}
function fromPitch(pitch) {
  return get$3(altToAcc(pitch.alt) + NAMES$1[pitch.step]);
}
var REGEX$1 = /^(#{1,}|b{1,}|x{1,}|)(IV|I{1,3}|VI{0,2}|iv|i{1,3}|vi{0,2})([^IViv]*)$/;
function tokenize$1(str) {
  return REGEX$1.exec(str) || ["", "", "", ""];
}
var ROMANS = "I II III IV V VI VII";
var NAMES$1 = ROMANS.split(" ");
var NAMES_MINOR = ROMANS.toLowerCase().split(" ");
function parse$1(src) {
  const [name, acc, roman, chordType] = tokenize$1(src);
  if (!roman) {
    return NoRomanNumeral;
  }
  const upperRoman = roman.toUpperCase();
  const step = NAMES$1.indexOf(upperRoman);
  const alt = accToAlt(acc);
  const dir = 1;
  return {
    empty: false,
    name,
    roman,
    interval: interval({ step, alt, dir }).name,
    acc,
    chordType,
    alt,
    step,
    major: roman === upperRoman,
    oct: 0,
    dir
  };
}
var roman_numeral_default = {
  names: names$3,
  get: get$3,
  romanNumeral
};

// index.ts
var Empty = Object.freeze([]);
var NoKey = {
  type: "major",
  tonic: "",
  alteration: 0,
  keySignature: ""
};
var NoKeyScale = {
  tonic: "",
  grades: Empty,
  intervals: Empty,
  scale: Empty,
  chords: Empty,
  chordsHarmonicFunction: Empty,
  chordScales: Empty
};
var NoMajorKey = {
  ...NoKey,
  ...NoKeyScale,
  type: "major",
  minorRelative: "",
  scale: Empty,
  secondaryDominants: Empty,
  secondaryDominantsMinorRelative: Empty,
  substituteDominants: Empty,
  substituteDominantsMinorRelative: Empty
};
var NoMinorKey = {
  ...NoKey,
  type: "minor",
  relativeMajor: "",
  natural: NoKeyScale,
  harmonic: NoKeyScale,
  melodic: NoKeyScale
};
var mapScaleToType = (scale, list, sep = "") => list.map((type, i) => `${scale[i]}${sep}${type}`);
function keyScale(grades, chords, harmonicFunctions, chordScales) {
  return (tonic) => {
    const intervals = grades.map((gr) => get$3(gr).interval || "");
    const scale = intervals.map((interval) => transpose$3(tonic, interval));
    return {
      tonic,
      grades,
      intervals,
      scale,
      chords: mapScaleToType(scale, chords),
      chordsHarmonicFunction: harmonicFunctions.slice(),
      chordScales: mapScaleToType(scale, chordScales, " ")
    };
  };
}
var distInFifths = (from, to) => {
  const f = note(from);
  const t = note(to);
  return f.empty || t.empty ? 0 : t.coord[0] - f.coord[0];
};
var MajorScale = keyScale("I II III IV V VI VII".split(" "), "maj7 m7 m7 maj7 7 m7 m7b5".split(" "), "T SD T SD D T D".split(" "), "major,dorian,phrygian,lydian,mixolydian,minor,locrian".split(","));
var NaturalScale = keyScale("I II bIII IV V bVI bVII".split(" "), "m7 m7b5 maj7 m7 m7 maj7 7".split(" "), "T SD T SD D SD SD".split(" "), "minor,locrian,major,dorian,phrygian,lydian,mixolydian".split(","));
var HarmonicScale = keyScale("I II bIII IV V bVI VII".split(" "), "mMaj7 m7b5 +maj7 m7 7 maj7 o7".split(" "), "T SD T SD D SD D".split(" "), "harmonic minor,locrian 6,major augmented,lydian diminished,phrygian dominant,lydian #9,ultralocrian".split(","));
var MelodicScale = keyScale("I II bIII IV V VI VII".split(" "), "m6 m7 +maj7 7 7 m7b5 m7b5".split(" "), "T SD T SD D  ".split(" "), "melodic minor,dorian b2,lydian augmented,lydian dominant,mixolydian b6,locrian #2,altered".split(","));
function majorKey(tonic) {
  const pc = note(tonic).pc;
  if (!pc)
    return NoMajorKey;
  const keyScale2 = MajorScale(pc);
  const alteration = distInFifths("C", pc);
  const romanInTonic = (src) => {
    const r = get$3(src);
    if (r.empty)
      return "";
    return transpose$3(tonic, r.interval) + r.chordType;
  };
  return {
    ...keyScale2,
    type: "major",
    minorRelative: transpose$3(pc, "-3m"),
    alteration,
    keySignature: altToAcc(alteration),
    secondaryDominants: "- VI7 VII7 I7 II7 III7 -".split(" ").map(romanInTonic),
    secondaryDominantsMinorRelative: "- IIIm7b5 IV#m7 Vm7 VIm7 VIIm7b5 -".split(" ").map(romanInTonic),
    substituteDominants: "- bIII7 IV7 bV7 bVI7 bVII7 -".split(" ").map(romanInTonic),
    substituteDominantsMinorRelative: "- IIIm7 Im7 IIbm7 VIm7 IVm7 -".split(" ").map(romanInTonic)
  };
}
function minorKey(tnc) {
  const pc = note(tnc).pc;
  if (!pc)
    return NoMinorKey;
  const alteration = distInFifths("C", pc) - 3;
  return {
    type: "minor",
    tonic: pc,
    relativeMajor: transpose$3(pc, "3m"),
    alteration,
    keySignature: altToAcc(alteration),
    natural: NaturalScale(pc),
    harmonic: HarmonicScale(pc),
    melodic: MelodicScale(pc)
  };
}
function majorTonicFromKeySignature(sig) {
  if (typeof sig === "number") {
    return transposeFifths("C", sig);
  } else if (typeof sig === "string" && /^b+|#+$/.test(sig)) {
    return transposeFifths("C", accToAlt(sig));
  }
  return null;
}
var key_default = { majorKey, majorTonicFromKeySignature, minorKey };

// index.ts
var MODES = [
  [0, 2773, 0, "ionian", "", "Maj7", "major"],
  [1, 2902, 2, "dorian", "m", "m7"],
  [2, 3418, 4, "phrygian", "m", "m7"],
  [3, 2741, -1, "lydian", "", "Maj7"],
  [4, 2774, 1, "mixolydian", "", "7"],
  [5, 2906, 3, "aeolian", "m", "m7", "minor"],
  [6, 3434, 5, "locrian", "dim", "m7b5"]
];
var NoMode = {
  ...EmptyPcset,
  name: "",
  alt: 0,
  modeNum: NaN,
  triad: "",
  seventh: "",
  aliases: []
};
var modes = MODES.map(toMode);
var index = {};
modes.forEach((mode2) => {
  index[mode2.name] = mode2;
  mode2.aliases.forEach((alias) => {
    index[alias] = mode2;
  });
});
function get$2(name) {
  return typeof name === "string" ? index[name.toLowerCase()] || NoMode : name && name.name ? get$2(name.name) : NoMode;
}
var mode = deprecate("Mode.mode", "Mode.get", get$2);
function all() {
  return modes.slice();
}
var entries = deprecate("Mode.mode", "Mode.all", all);
function names$2() {
  return modes.map((mode2) => mode2.name);
}
function toMode(mode2) {
  const [modeNum, setNum, alt, name, triad, seventh, alias] = mode2;
  const aliases = alias ? [alias] : [];
  const chroma = Number(setNum).toString(2);
  const intervals = get$8(name).intervals;
  return {
    empty: false,
    intervals,
    modeNum,
    chroma,
    normalized: chroma,
    name,
    setNum,
    alt,
    triad,
    seventh,
    aliases
  };
}
function notes(modeName, tonic) {
  return get$2(modeName).intervals.map((ivl) => transpose$3(tonic, ivl));
}
function chords(chords2) {
  return (modeName, tonic) => {
    const mode2 = get$2(modeName);
    if (mode2.empty)
      return [];
    const triads2 = rotate(mode2.modeNum, chords2);
    const tonics = mode2.intervals.map((i) => transpose$3(tonic, i));
    return triads2.map((triad, i) => tonics[i] + triad);
  };
}
var triads = chords(MODES.map((x) => x[4]));
var seventhChords = chords(MODES.map((x) => x[5]));
function distance(destination, source) {
  const from = get$2(source);
  const to = get$2(destination);
  if (from.empty || to.empty)
    return "";
  return simplify$1(transposeFifths$1("1P", to.alt - from.alt));
}
function relativeTonic(destination, source, tonic) {
  return transpose$3(tonic, distance(destination, source));
}
var mode_default = {
  get: get$2,
  names: names$2,
  all,
  distance,
  relativeTonic,
  notes,
  triads,
  seventhChords,
  entries,
  mode
};

// index.ts
function fromRomanNumerals(tonic, chords) {
  const romanNumerals = chords.map(get$3);
  return romanNumerals.map((rn) => transpose$3(tonic, interval(rn)) + rn.chordType);
}
function toRomanNumerals(tonic, chords) {
  return chords.map((chord) => {
    const [note, chordType] = tokenize$2(chord);
    const intervalName = distance$3(tonic, note);
    const roman = get$3(interval(intervalName));
    return roman.name + chordType;
  });
}
var progression_default = { fromRomanNumerals, toRomanNumerals };

// index.ts
function numeric(notes) {
  const midi = compact(notes.map(toMidi));
  if (!notes.length || midi.length !== notes.length) {
    return [];
  }
  return midi.reduce((result, note) => {
    const last = result[result.length - 1];
    return result.concat(range(last, note).slice(1));
  }, [midi[0]]);
}
function chromatic(notes, options) {
  return numeric(notes).map((midi) => midiToNoteName(midi, options));
}
var range_default = { numeric, chromatic };

// index.ts
var NoScale = {
  empty: true,
  name: "",
  type: "",
  tonic: null,
  setNum: NaN,
  chroma: "",
  normalized: "",
  aliases: [],
  notes: [],
  intervals: []
};
function tokenize(name) {
  if (typeof name !== "string") {
    return ["", ""];
  }
  const i = name.indexOf(" ");
  const tonic = note(name.substring(0, i));
  if (tonic.empty) {
    const n = note(name);
    return n.empty ? ["", name] : [n.name, ""];
  }
  const type = name.substring(tonic.name.length + 1);
  return [tonic.name, type.length ? type : ""];
}
var names$1 = names$7;
function get$1(src) {
  const tokens = Array.isArray(src) ? src : tokenize(src);
  const tonic = note(tokens[0]).name;
  const st = get$8(tokens[1]);
  if (st.empty) {
    return NoScale;
  }
  const type = st.name;
  const notes = tonic ? st.intervals.map((i) => transpose$3(tonic, i)) : [];
  const name = tonic ? tonic + " " + type : type;
  return { ...st, name, type, tonic, notes };
}
var scale = deprecate("Scale.scale", "Scale.get", get$1);
function scaleChords(name) {
  const s = get$1(name);
  const inScale = isSubsetOf(s.chroma);
  return all$2().filter((chord) => inScale(chord.chroma)).map((chord) => chord.aliases[0]);
}
function extended(name) {
  const s = get$1(name);
  const isSuperset = isSupersetOf(s.chroma);
  return all$1().filter((scale2) => isSuperset(scale2.chroma)).map((scale2) => scale2.name);
}
function reduced(name) {
  const isSubset = isSubsetOf(get$1(name).chroma);
  return all$1().filter((scale2) => isSubset(scale2.chroma)).map((scale2) => scale2.name);
}
function scaleNotes(notes) {
  const pcset = notes.map((n) => note(n).pc).filter((x) => x);
  const tonic = pcset[0];
  const scale2 = sortedUniqNames(pcset);
  return rotate(scale2.indexOf(tonic), scale2);
}
function modeNames(name) {
  const s = get$1(name);
  if (s.empty) {
    return [];
  }
  const tonics = s.tonic ? s.notes : s.intervals;
  return modes$1(s.chroma).map((chroma, i) => {
    const modeName = get$1(chroma).name;
    return modeName ? [tonics[i], modeName] : ["", ""];
  }).filter((x) => x[0]);
}
function getNoteNameOf(scale2) {
  const names2 = Array.isArray(scale2) ? scaleNotes(scale2) : get$1(scale2).notes;
  const chromas = names2.map((name) => note(name).chroma);
  return (noteOrMidi) => {
    const currNote = typeof noteOrMidi === "number" ? note(fromMidi(noteOrMidi)) : note(noteOrMidi);
    const height = currNote.height;
    if (height === void 0)
      return void 0;
    const chroma = height % 12;
    const position = chromas.indexOf(chroma);
    if (position === -1)
      return void 0;
    return enharmonic(currNote.name, names2[position]);
  };
}
function rangeOf(scale2) {
  const getName = getNoteNameOf(scale2);
  return (fromNote, toNote) => {
    const from = note(fromNote).height;
    const to = note(toNote).height;
    if (from === void 0 || to === void 0)
      return [];
    return range(from, to).map(getName).filter((x) => x);
  };
}
var scale_default = {
  get: get$1,
  names: names$1,
  extended,
  modeNames,
  reduced,
  scaleChords,
  scaleNotes,
  tokenize,
  rangeOf,
  scale
};

// index.ts
var NONE = {
  empty: true,
  name: "",
  upper: void 0,
  lower: void 0,
  type: void 0,
  additive: []
};
var NAMES = ["4/4", "3/4", "2/4", "2/2", "12/8", "9/8", "6/8", "3/8"];
function names() {
  return NAMES.slice();
}
var REGEX = /^(\d?\d(?:\+\d)*)\/(\d)$/;
var CACHE = /* @__PURE__ */ new Map();
function get(literal) {
  const cached = CACHE.get(literal);
  if (cached) {
    return cached;
  }
  const ts = build(parse(literal));
  CACHE.set(literal, ts);
  return ts;
}
function parse(literal) {
  if (typeof literal === "string") {
    const [_, up2, low] = REGEX.exec(literal) || [];
    return parse([up2, low]);
  }
  const [up, down] = literal;
  const denominator = +down;
  if (typeof up === "number") {
    return [up, denominator];
  }
  const list = up.split("+").map((n) => +n);
  return list.length === 1 ? [list[0], denominator] : [list, denominator];
}
var time_signature_default = { names, parse, get };
function build([up, down]) {
  const upper = Array.isArray(up) ? up.reduce((a, b) => a + b, 0) : up;
  const lower = down;
  if (upper === 0 || lower === 0) {
    return NONE;
  }
  const name = Array.isArray(up) ? `${up.join("+")}/${down}` : `${up}/${down}`;
  const additive = Array.isArray(up) ? up : [];
  const type = lower === 4 || lower === 2 ? "simple" : lower === 8 && upper % 3 === 0 ? "compound" : "irregular";
  return {
    empty: false,
    name,
    type,
    upper,
    lower,
    additive
  };
}

// index.ts
var Tonal = Core;
var PcSet = pcset_default;
var ChordDictionary = chord_type_default;
var ScaleDictionary = scale_type_default;

export { abc_notation_default as AbcNotation, index$3 as Array, chord_default as Chord, ChordDictionary, chord_type_default as ChordType, collection_default as Collection, Core, duration_value_default as DurationValue, interval_default as Interval, key_default as Key, midi_default as Midi, mode_default as Mode, note_default as Note, PcSet, pcset_default as Pcset, progression_default as Progression, range_default as Range, roman_numeral_default as RomanNumeral, scale_default as Scale, ScaleDictionary, scale_type_default as ScaleType, time_signature_default as TimeSignature, Tonal, accToAlt, altToAcc, coordToInterval, coordToNote, decode, deprecate, distance$3 as distance, encode, fillStr$1 as fillStr, interval, isNamed, isPitch, note, stepToLetter, tokenizeInterval, tokenizeNote, transpose$3 as transpose };
