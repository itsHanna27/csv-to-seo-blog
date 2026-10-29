export default defineEventHandler(async (event) => {
  // 1. read { topic, rows, columns, roles } from the body
  //    400 if topic or rows are missing
  const { topic, rows, columns, roles } = (await readBody(event)) ?? {}

  if (!topic?.trim() || !Array.isArray(rows) || rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing topic or rows' })
  }

  // 2. stats = computeStats(rows, columns, roles)
  const stats = computeStats(rows, columns, roles)

  // 3. fallback = fallbackCopy(stats, roles, topic)
  const fallback = fallbackCopy(stats, roles, topic)

  // 4. try Gemini, catch any error -> copy = fallback, source = 'fallback'
  let copy = fallback
  let source = 'fallback'
  let reason = ''

  try {
    const aiCopy = await askGemini(event, stats, roles, topic)

    // 5. validate the copy shape; if it's wrong -> use fallback
    if (isValidCopy(aiCopy)) {
      copy = aiCopy
      source = 'gemini'
    } else {
      reason = 'Gemini copy failed validation'
      console.warn(reason)
    }
  } catch (err) {
    reason = err.data?.error?.message || err.message
    console.warn('Gemini failed, using fallback:', reason)
  }

  // 6. blog = buildBlog(topic, rows, columns, roles, copy, source)
  const blog = buildBlog(topic, rows, columns, roles, copy, source)

  if (!blog.slug) {
    throw createError({ statusCode: 400, statusMessage: 'Topic needs letters or numbers' })
  }

  // 7. save it
  await useStorage('blogs').setItem(blog.slug, blog)

  // 8. return { slug: blog.slug }
  return { slug: blog.slug, copySource: source, reason }
})

// asks Gemini for the copy, returns the parsed JSON object
async function askGemini(event, stats, roles, topic) {
  const key = useRuntimeConfig(event).geminiApiKey
  if (!key) throw new Error('No Gemini key set')

  // only send the verified numbers, never the raw rows
  const facts = {
    rowCount: stats.rowCount,
    value: stats.value,
    categories: stats.categories,
    multis: stats.multis,
  }

  const prompt = `You write SEO blog copy for a ranked list of companies.
Topic: ${topic}
The list is ranked by: ${roles.valueColumn ?? 'rank'}

Verified statistics (JSON):
${JSON.stringify(facts)}

Rules:
- Use ONLY the figures above. Do not calculate, estimate or invent any numbers.
- Shares are fractions (0.78 = 78%). Write them as percentages.
- Category shares are out of the non-empty values in that column, which can be fewer than the total rows.
- Multi-value (multis) shares mean "% of companies with this tag" and can add up to more than 100%. Write them like "98% list X", never as a split.
- Money values are raw numbers in the symbol shown in value.symbol. Write them like £622.3m.
- Do not mention anything that isn't in the data.

Return JSON with exactly these keys:
{
  "title": string, under 60 characters,
  "metaDescription": string, 120 to 155 characters,
  "intro": string, 2 to 3 sentences,
  "headings": { "overview": string, "table": string, "insights": string, "faq": string },
  "faq": [ { "q": string, "a": string } ] (3 to 4 items, answers from the statistics only)
}`

  const res = await $fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    {
      method: 'POST',
      timeout: 60000, // give up after 60s so the fallback kicks in
      headers: { 'x-goog-api-key': key },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
    }
  )

  const text = res.candidates?.[0]?.content?.parts?.[0]?.text
  return JSON.parse(text)
}

// true only if the copy has every key in the right shape and sensible lengths
function isValidCopy(c) {
  const str = (v) => typeof v === 'string' && v.trim().length > 0
  if (!c || !str(c.title) || !str(c.metaDescription) || !str(c.intro)) return false

  const h = c.headings
  if (!h || !str(h.overview) || !str(h.table) || !str(h.insights) || !str(h.faq)) return false

  if (!Array.isArray(c.faq) || c.faq.length < 3 || c.faq.length > 4) return false
  if (!c.faq.every((item) => str(item?.q) && str(item?.a))) return false

  // a bit looser than the brief, since LLMs miscount characters
  if (c.title.length > 65) return false
  if (c.metaDescription.length < 100 || c.metaDescription.length > 165) return false

  return true
}