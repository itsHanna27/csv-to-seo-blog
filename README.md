# CSV to SEO Blog

Upload a ranked CSV and get a server-rendered, SEO-optimised blog page, with no manual rewriting and no rebuilding. Built with Nuxt 4.

The fintech dataset is just a sample. Nothing in the code or template is hardcoded for fintech, so a healthtech, cleantech or AI CSV works the same way.

## How it works

1. **Upload** a CSV on `/generate` (drag and drop, click to browse, or use the built-in sample). It is parsed in the browser with Papa Parse.
2. **Detect columns.** `detectColumns` classifies each column (number, currency, category, multi-value tags, text) by looking at the *values*, not the header names. `suggestRoles` then guesses which column is the name, the rank and the value the list is ranked by.
3. **Confirm.** You name the topic (e.g. "UK fintech companies"), check the detected roles in three dropdowns, and preview the first rows.
4. **Compute stats in code.** `computeStats` works out the total, mean, median, top-10 share, leader, and category and tag breakdowns. All the maths happens here.
5. **Generate copy.** The verified stats (never the raw rows) are sent to Gemini, which returns the title, meta description, intro, headings and FAQ as JSON.
6. **Validate, or fall back.** The response is checked for the right keys, shapes and lengths. If Gemini errors, times out or returns the wrong shape, `fallbackCopy` writes the copy from the same stats instead. Every blog records which one wrote it (`copySource`).
7. **Save and publish.** `buildBlog` assembles one JSON object, it is saved with Nitro storage, and you are redirected to `/blog/[slug]`. Every blog uses the same template.

## Features

- Responsive blog page: hero, stat cards, insights, full ranking table and FAQ
- Server-rendered content, with a unique `<title>`, meta description and Open Graph tags per blog
- Upload flow with drag and drop, a column confirmation step and a data preview
- Currency symbol is read from the data, so a `$` or `€` dataset works too
- Keeps working when the Gemini free tier is rate-limited, thanks to the fallback copy

## Tech used

- [Nuxt 4](https://nuxt.com) (Vue 3, Nitro)
- Tailwind CSS v4
- [Papa Parse](https://www.papaparse.com) for CSV parsing
- Google Gemini API (`gemini-3.5-flash-lite`, free tier)
- Nitro storage (filesystem driver) for saved blogs
- Font Awesome for icons
- `@nuxtjs/sitemap`

## Setup

```bash
git clone <git clone https://github.com/itsHanna27/csv-to-seo-blog.git>
cd csv-to-seo-blog
npm install
```

Create a `.env` file in the project root:

```
NUXT_GEMINI_API_KEY=your-key-here
```

Get a free key at https://aistudio.google.com. Then:

```bash
npm run dev
```

Open http://localhost:3000 and go to **Generate a blog**. Upload a CSV (or click the sample link), name the topic, confirm the columns and hit **Generate blog**.

If no key is set, the app still works and uses the fallback copy.

## Project structure

```
app/
  app.vue                  navbar and page wrapper
  assets/main.css          Tailwind import
  pages/
    index.vue              landing page and list of recent blogs
    generate.vue           upload, confirm columns and generate
    blog/[slug].vue        the shared blog template
shared/utils/              code used by both the browser and the server
  detectColumns.js         column type detection and role suggestions
  computeStats.js          all the numbers
  formatValue.js           currency symbol and £622.3m-style formatting
  fallbackCopy.js          code-written copy, used when Gemini fails
  buildBlog.js             builds the JSON object that gets saved
server/
  api/generate.post.js     stats, Gemini call, validation, fallback, save
  api/blogs/index.get.js   list all blogs
  api/blogs/index.post.js  save a blog
  api/blogs/[slug].get.js  read one blog
  data/blogs/              saved blog JSON (gitignored)
public/
  samples/fintech.csv      sample dataset
  robots.txt
```

## Design decisions

- **Code does the maths, the LLM does the words.** Every figure is computed in code and passed to the prompt as verified numbers. The prompt tells the model not to calculate or invent anything. This stops made-up statistics.
- **Fallback copy.** A free API can fail mid-demo. The fallback keeps the page working and records that it was used.
- **Validation before saving.** LLMs break format rules, so the copy is checked before it is trusted.
- **Value-based column detection.** New datasets need no code changes, and the user can override the guess.
- **One JSON file per blog.** Simple to read and debug. Because it goes through Nitro storage, moving to a KV store for hosting is a config change, not a rewrite.

## Handling awkward data

- A column with only one distinct value (like Stage, which is "Seed" on every row) is skipped from the stats.
- Category shares are out of the non-empty values in that column, which can be fewer than the total rows.
- Multi-value columns (like Industries) count each tag once per company, so shares can add up to more than 100%. They are written as "98% list X", never as a split.

