import { getCurrencySymbol } from './formatValue'
// app/utils/computeStats.js
// Turns rows + detected columns into a plain stats object.
// All the maths happens here, in code, so the LLM never has to calculate anything.
// Nothing in here knows about fintech: every label and number comes from the data.

const TOP_N = 8 // how many items to keep per breakdown

// value at position q (0 to 1) of an ALREADY SORTED (ascending) array
function quantile(sorted, q) {
  if (sorted.length === 0) return null
  return sorted[Math.floor((sorted.length - 1) * q)]
}

// ["London", "Leeds", "London"] -> [{ label: "London", count: 2, share: 0.67 }, ...]
// total = what the share is out of (defaults to the list length)
function countValues(list, limit = TOP_N, total = list.length) {
  const counts = new Map()
  for (const item of list) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: count / total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// all non-empty values of a column as trimmed strings
function cleanValues(rows, columnName) {
  return rows
    .map(row => row[columnName])
    .filter(v => !isEmpty(v))
    .map(v => String(v).trim())
}

// the numbers behind the ranking column
function valueStats(rows, valueColumn, nameColumn) {
  // keep the name next to each number so we can say who is in the lead
  const entries = rows
    .map(row => ({ name: row[nameColumn], value: cleanNumber(row[valueColumn]) }))
    .filter(e => e.value !== null)

  if (entries.length === 0) return null

  const sorted = entries.map(e => e.value).sort((a, b) => a - b) // ascending
  const total = sorted.reduce((sum, n) => sum + n, 0)

  // top 10 share = how concentrated the money is at the top
  const topCount = Math.min(10, sorted.length)
  const topSum = sorted.slice(-topCount).reduce((sum, n) => sum + n, 0)

  const leader = entries.reduce((best, e) => (e.value > best.value ? e : best))
  // first raw cell of the value column, used to grab the currency symbol (£, $, ...)
  const firstRaw = rows.map(row => row[valueColumn]).find(v => !isEmpty(v))
  return {
    column: valueColumn,
        symbol: getCurrencySymbol(firstRaw),
    count: sorted.length,
    total,
    mean: total / sorted.length,
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    topCount,
    top10Share: total > 0 ? topSum / total : 0,
    quartiles: {
      q1: quantile(sorted, 0.25),
      q2: quantile(sorted, 0.5),
      q3: quantile(sorted, 0.75),
    },
    leader: { name: leader.name ?? null, value: leader.value },
  }
}

// "London", "Leeds", ... -> top counts
function categoryStats(rows, column) {
  return countValues(cleanValues(rows, column.name))
}

// "Payments; Banking" -> split on the delimiter, trim, count each tag separately.
// Each tag counts once per company, and share = "% of companies with this tag",
// so the shares can add up to more than 100% (a company can have several tags).
function multiStats(rows, column) {
  const cells = cleanValues(rows, column.name)
  const tags = cells.flatMap(cell => {
    const unique = new Set(cell.split(column.delimiter).map(t => t.trim()).filter(Boolean))
    return [...unique]
  })
  return countValues(tags, TOP_N, cells.length)
}

// main one: returns one object that the page, charts and Gemini prompt all read from
// roles = { nameColumn, rankColumn, valueColumn } (the user-confirmed ones)
export function computeStats(rows, columns, roles) {
  const stats = {
    rowCount: rows.length,
    value: roles.valueColumn
      ? valueStats(rows, roles.valueColumn, roles.nameColumn)
      : null,
    categories: [],
    multis: [],
  }

  for (const column of columns) {
    if (column.type === 'category') {
      // a column with only 1 distinct value (like Stage) says nothing, so skip it
      if (column.distinct < 2) continue
      stats.categories.push({ column: column.name, items: categoryStats(rows, column) })
    }

    if (column.type === 'multi') {
      const items = multiStats(rows, column)
      if (items.length < 2) continue
      stats.multis.push({ column: column.name, items })
    }
  }

  return stats
}