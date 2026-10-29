import { formatValue } from './formatValue'
// Safety net if Gemini dies mid-demo.
// Everything comes from stats / roles / topic, nothing industry-specific typed in here.
export function fallbackCopy(stats, roles, topic) {
  const n = stats.rowCount
  const valueColumn = stats.value?.column ?? roles?.valueColumn ?? null
  const symbol = stats.value?.symbol ?? ''
  const fmt = (x) => formatValue(x, symbol)

  const total = stats.value?.total != null ? fmt(stats.value.total) : null
  const median = stats.value?.median != null ? fmt(stats.value.median) : null
  const leader = stats.value?.leader?.name ?? null
  const leaderValue = stats.value?.leader?.value != null ? fmt(stats.value.leader.value) : null

  // Region-style line from the first category's top item, e.g. "78% are based in London"
  const topItem = stats.categories?.[0]?.items?.[0]
  const region = topItem
    ? `${Math.round(topItem.share * 100)}% are based in ${topItem.label}`
    : null

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const lc = (s) => s.toLowerCase()

  // ---- title (under ~60 chars) ----
  let title = valueColumn
    ? `Top ${n} ${topic}: Ranked by ${valueColumn}`
    : `Top ${n} ${topic}`
  if (title.length > 60) title = `Top ${n} ${topic}`

  // ---- metaDescription (120-155 chars) ----
  let metaDescription = `Explore the top ${n} ${topic}`
  if (total && valueColumn) metaDescription += `, with ${total} ${lc(valueColumn)} combined`
  metaDescription += '.'
  if (region) metaDescription += ` ${cap(region)}.`
  if (metaDescription.length < 120) metaDescription += ' Ranked, charted and explained.'
  if (metaDescription.length > 155) {
    metaDescription = metaDescription.slice(0, 152).replace(/\s+\S*$/, '') + '...'
  }

  // ---- intro (2-3 sentences, skip anything with missing data) ----
  const sentences = [
    `This list ranks ${n} ${topic}${valueColumn ? ` by ${lc(valueColumn)}` : ''}.`,
        total ? `Together they total ${total}.` : null,
    leader
      ? `${leader} is ranked first${leaderValue ? ` at ${leaderValue}` : ''}${median ? `, while the median is ${median}` : ''}.`
      : median
        ? `The median is ${median}.`
        : null,
  ].filter(Boolean)
  const intro = sentences.slice(0, 3).join(' ')

  // ---- headings ----
  const headings = {
    overview: `${cap(topic)} at a glance`,
    table: `Full ranking of ${topic}`,
    insights: `Key insights on ${topic}`,
    faq: `${cap(topic)}: frequently asked questions`,
  }

  // ---- faq (3-4 items, built from stats only) ----
  const faqCandidates = [
    { q: `How many ${topic} are in this list?`, a: `There are ${n} ${topic} in this ranking.` },
    leader && {
      q: `Who is ranked first?`,
      a: `${leader} is ranked first${leaderValue ? ` with ${leaderValue}` : ''}.`,
    },
    median && valueColumn && {
      q: `What is the median ${lc(valueColumn)}?`,
      a: `The median is ${median}${total ? `, and the total across all ${n} is ${total}` : ''}.`,
    },
    region && { q: `Where are most of them based?`, a: `${cap(region)}.` },
  ].filter(Boolean)
  const faq = faqCandidates.slice(0, 4)

  return { title, metaDescription, intro, headings, faq }
}