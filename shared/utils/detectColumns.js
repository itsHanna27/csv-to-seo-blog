// app/utils/detectColumns.js
// Looks at parsed CSV rows and works out what kind of data each column holds.
// Nothing in here knows about fintech: it only looks at the values, so it works on any CSV.

const EMPTY_VALUES = new Set(['', 'n/a', 'na', 'nan', 'null', 'undefined', 'none', '-', '--'])
const MULTI_DELIMITERS = [';', '|']
const SAMPLE_SIZE = 50
const MATCH_THRESHOLD = 0.8 // how much of the sample must match before we trust a type

// 2024-03-01, 01/03/2024, 1 Mar 2024, Mar 1, 2024
// all need 3 parts, so a range like "5-9" is never mistaken for a date
const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/,
  /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/,
  /^\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}$/,
  /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/,
]

const RANK_HEADER = /^(rank|ranking|position|pos|no\.?|#)$/i
const NAME_HEADER = /^(name|company|company name|organi[sz]ation|business|brand|firm|title)$/i

// "£1,200,000" -> 1200000, anything that isn't a number -> null
export function cleanNumber(value) {
  // 1. make it a trimmed string (value might be undefined/null)
  const str = String(value ?? '').trim()

  // 2. remove ONLY these characters: £ $ € , % and spaces
  const cleaned = str.replace(/[£$€,%\s]/g, '')

  // 3. does what's left look like a number?
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null

  // 4. yes -> return it as a real number
  return Number(cleaned)
}

// true for "", "N/A", "-", null, undefined...
export function isEmpty(value) {
  if (value === null || value === undefined) return true
  return EMPTY_VALUES.has(String(value).trim().toLowerCase())
}

function looksLikeDate(value) {
  const str = String(value).trim()
  return DATE_PATTERNS.some(pattern => pattern.test(str))
}

// pick ~50 values spread evenly through the column (not just the first 50,
// because files are often sorted and the top rows aren't representative)
function sampleEvenly(values, size = SAMPLE_SIZE) {
  if (values.length <= size) return values
  const step = values.length / size
  return Array.from({ length: size }, (_, i) => values[Math.floor(i * step)])
}

// cells like "Payments; Banking; Lending". Returns the delimiter, or null.
// Tag lists reuse the same few tokens a lot (low distinct ratio),
// prose that happens to contain a ";" almost never does.
function detectMulti(sample) {
  for (const delimiter of MULTI_DELIMITERS) {
    const withDelimiter = sample.filter(v => v.includes(delimiter))
    if (withDelimiter.length / sample.length < 0.3) continue

    const tokens = sample.flatMap(v => v.split(delimiter).map(t => t.trim()).filter(Boolean))
    const distinct = new Set(tokens).size
    if (distinct >= 2 && distinct / tokens.length <= 0.5) return delimiter
  }
  return null
}

// the funnel for ONE column. values = all non-empty values as trimmed strings
function detectType(values) {
  if (values.length === 0) return { type: 'empty' }

  const sample = sampleEvenly(values)
  const share = test => sample.filter(test).length / sample.length

  // 1. date
  if (share(looksLikeDate) >= MATCH_THRESHOLD) return { type: 'date' }

  // 2. number / currency
  if (share(v => cleanNumber(v) !== null) >= MATCH_THRESHOLD) {
    const hasSymbol = share(v => /[£$€]/.test(v)) >= 0.5
    return { type: hasSymbol ? 'currency' : 'number' }
  }

  // 3. multi-value ("A; B; C")
  const delimiter = detectMulti(sample)
  if (delimiter) return { type: 'multi', delimiter }

  // 4. category: lots of repeats and short values (uses the whole column, not just the sample)
  const distinct = new Set(values).size
  const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length
  if (distinct / values.length <= 0.5 && avgLength <= 40) return { type: 'category' }

  // 5. anything else
  return { type: 'text' }
}

// main one: rows (from Papa Parse, header: true) -> [{ name, type, nonEmpty, distinct, delimiter? }]
export function detectColumns(rows) {
  if (!rows || rows.length === 0) return []

  return Object.keys(rows[0])
    .filter(name => name && !name.startsWith('__')) // ignore Papa Parse's __parsed_extra
    .map(name => {
      const values = rows
        .map(row => row[name])
        .filter(v => !isEmpty(v))
        .map(v => String(v).trim())

      const { type, delimiter } = detectType(values)
      const column = { name, type, nonEmpty: values.length, distinct: new Set(values).size }
      if (delimiter) column.delimiter = delimiter
      return column
    })
}

// best-guess defaults for the "confirm your columns" step. User can override.
// returns { nameColumn, rankColumn, valueColumn } (column names, or null)
export function suggestRoles(columns, rows) {
  const numbers = columns.filter(c => c.type === 'number')
  const texts = columns.filter(c => c.type === 'text')

  const numbersIn = name => rows.map(r => cleanNumber(r[name])).filter(n => n !== null)

  // rank = header says so, or values are exactly 1..n with no repeats
  const isSequence = name => {
    const nums = numbersIn(name)
    return (
      nums.length === rows.length &&
      new Set(nums).size === nums.length &&
      nums.every(n => Number.isInteger(n) && n >= 1 && n <= nums.length)
    )
  }
  const rankColumn =
    numbers.find(c => RANK_HEADER.test(c.name.trim())) ??
    numbers.find(c => isSequence(c.name)) ??
    null

  // name = header says so, or first text column that is all-unique and short (not a description)
  const avgLength = name => {
    const vals = rows.map(r => String(r[name] ?? '')).filter(Boolean)
    return vals.reduce((sum, v) => sum + v.length, 0) / (vals.length || 1)
  }
  const nameColumn =
    texts.find(c => NAME_HEADER.test(c.name.trim())) ??
    texts.find(c => c.distinct === c.nonEmpty && avgLength(c.name) <= 60) ??
    texts[0] ??
    null

  // value = what the list is ranked by: first currency column, else a number column
  // that isn't the rank and isn't a year (1900-2100 whole numbers)
  const isYearLike = name => numbersIn(name).every(n => Number.isInteger(n) && n >= 1900 && n <= 2100)
  const valueColumn =
    columns.find(c => c.type === 'currency') ??
    numbers.find(c => c.name !== rankColumn?.name && !isYearLike(c.name)) ??
    null

  return {
    nameColumn: nameColumn?.name ?? null,
    rankColumn: rankColumn?.name ?? null,
    valueColumn: valueColumn?.name ?? null,
  }
}