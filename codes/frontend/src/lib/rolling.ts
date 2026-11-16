// A figure split for the odometer: every digit is a column of its own, placed by its distance from the right, so the ones stay the ones
// when a figure grows a digit on the left and only the digits that change move. Everything between digits (a colon, a point, a unit,
// a word) stays whole as one run of text, so a script that joins its letters keeps them joined. Pure, so a test can read it.

/** Which way a changed digit slides: up when the figure grows or time moves on, down when it shrinks. */
export type RollDir = 'up' | 'down'

/** One digit: its own column. `changed` it differs from the digit that stood there; `grew` it is new (the figure got longer, or a word gave way to it). */
export type DigitColumn = { kind: 'digit'; key: string; char: string; changed: boolean; grew: boolean; dir: RollDir }
/** A run of anything that is not a digit: it never moves. */
export type TextColumn = { kind: 'text'; key: string; text: string }
export type RollColumn = DigitColumn | TextColumn

/** A decimal digit of any script (Latin, Bengali, Arabic-Indic…), never a letter, a mark or a separator. */
export const isDigit = (char: string): boolean => /^\p{Nd}$/u.test(char)

/** The digits of a text, joined: what its size is read from. */
const digitsOf = (text: string): string => [...text].filter(isDigit).join('')

/** Up when `next` has more digits or the same count with a larger value, down when fewer or smaller; up when nothing tells (or no `prev`). */
export function trendOf(prev: string | null, next: string): RollDir {
  if (prev === null) return 'up'
  const before = digitsOf(prev),
    after = digitsOf(next)
  if (after.length !== before.length) return after.length > before.length ? 'up' : 'down'
  return after < before ? 'down' : 'up'
}

/**
 * The columns of `text`, read against the figure it replaces (`prev`, null for the first). `forward` fixes the direction at up: a clock or an
 * uptime only ever moves on, even when 59 turns to 00. Columns are keyed by their place from the right.
 */
export function rollColumns(text: string, prev: string | null = null, forward = false): RollColumn[] {
  const chars = [...text],
    before = prev === null ? [] : [...prev]
  const dir = forward ? 'up' : trendOf(prev, text)
  const columns: RollColumn[] = []
  let run = ''
  const flush = (place: number) => {
    if (run) columns.push({ kind: 'text', key: `t${place}`, text: run })
    run = ''
  }
  chars.forEach((char, at) => {
    const place = chars.length - at
    if (!isDigit(char)) {
      run += char
      return
    }
    flush(place + 1)
    const was = before.at(-place)
    columns.push({
      kind: 'digit',
      key: `d${place}`,
      char,
      changed: was !== undefined && isDigit(was) && was !== char,
      grew: prev !== null && (was === undefined || !isDigit(was)),
      dir,
    })
  })
  flush(1)
  return columns
}
