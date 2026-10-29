// Pulls a currency symbol off a raw value like "£622,301,270" -> "£"
// Returns '' if there isn't one (plain numbers, empty cells)
export function getCurrencySymbol(raw) {
  if (raw == null) return ''
  const match = String(raw).trim().match(/^[^\d\s.,-]+/)
  return match ? match[0] : ''
}

// 622301270 -> "£622.3m", 4100000 -> "£4.1m", 850 -> "£850"
export function formatValue(n, symbol = '') {
  if (n == null || Number.isNaN(n)) return ''

  const abs = Math.abs(n)
  const units = [
    [1e9, 'b'],
    [1e6, 'm'],
    [1e3, 'k'],
  ]

  for (const [size, suffix] of units) {
    if (abs >= size) return `${symbol}${tidy(n / size)}${suffix}`
  }
  return `${symbol}${tidy(n)}`
}

// 1 decimal place, but drop a trailing ".0" (4.0 -> "4")
function tidy(x) {
  return x.toFixed(1).replace(/\.0$/, '')
}