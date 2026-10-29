<script setup>
const slug = useRoute().params.slug
const { data: blog, error } = await useFetch(`/api/blogs/${slug}`)

if (error.value || !blog.value) {
  throw createError({ statusCode: 404, statusMessage: 'Blog not found', fatal: true })
}

const { copy, stats, roles, rows, topic } = blog.value
const symbol = stats.value?.symbol ?? ''

useSeoMeta({
  title: copy.title,
  description: copy.metaDescription,
  ogTitle: copy.title,
  ogDescription: copy.metaDescription,
})
useHead({ htmlAttrs: { lang: 'en' } })

// stat cards: only show a card if the data exists
const cards = [
  stats.value && { icon: 'fa-chart-column', label: `Total ${stats.value.column}`, value: formatValue(stats.value.total, symbol) },
  stats.value && { icon: 'fa-scale-balanced', label: 'Median', value: formatValue(stats.value.median, symbol) },
  stats.value && { icon: 'fa-trophy', label: `Top ${stats.value.topCount} share`, value: `${Math.round(stats.value.top10Share * 100)}%` },
  { icon: 'fa-list-ol', label: topic, value: stats.rowCount },
].filter(Boolean)

// columns shown in the table: name + everything that isn't long text
const tableCols = blog.value.columns.filter(
  c => c.type !== 'text' || c.name === roles.nameColumn
)

// generic insight lines, built only from stats
const insights = [
  stats.value && `The top ${stats.value.topCount} hold ${Math.round(stats.value.top10Share * 100)}% of the total ${stats.value.column.toLowerCase()}.`,
  stats.value && `The median is ${formatValue(stats.value.median, symbol)}, against a mean of ${formatValue(stats.value.mean, symbol)}${stats.value.mean > stats.value.median ? ', so a few large values pull the average up' : ''}.`,
  stats.categories[0]?.items[0] && `${Math.round(stats.categories[0].items[0].share * 100)}% have ${stats.categories[0].column.toLowerCase()} "${stats.categories[0].items[0].label}".`,
  stats.multis[0]?.items[0] && `${Math.round(stats.multis[0].items[0].share * 100)}% list "${stats.multis[0].items[0].label}" under ${stats.multis[0].column.toLowerCase()}.`,
].filter(Boolean)
</script>

<template>
  <div class="min-h-[calc(100vh-57px)] bg-slate-50 text-slate-900">
    <!-- hero -->
    <header class="bg-gradient-to-br from-indigo-700 to-violet-600 text-white">
      <div class="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <p class="text-sm font-medium uppercase tracking-widest text-indigo-200">
          <i class="fa-solid fa-ranking-star mr-2"></i>{{ topic }}
        </p>
        <h1 class="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{{ copy.title }}</h1>
        <p class="mt-5 max-w-3xl text-base text-indigo-100 sm:text-lg">{{ copy.intro }}</p>
      </div>
    </header>

    <main class="mx-auto max-w-5xl space-y-14 px-4 py-10">
      <!-- stat cards -->
      <section>
        <h2 class="text-2xl font-bold sm:text-3xl">
          <i class="fa-solid fa-chart-pie mr-2 text-indigo-600"></i>{{ copy.headings.overview }}
        </h2>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div v-for="c in cards" :key="c.label" class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <i :class="['fa-solid', c.icon]"></i>
            </div>
            <div class="mt-3 text-2xl font-extrabold text-indigo-700 sm:text-3xl">{{ c.value }}</div>
            <div class="mt-1 text-sm text-slate-500">{{ c.label }}</div>
          </div>
        </div>
      </section>

      <!-- insights -->
      <section v-if="insights.length">
        <h2 class="text-2xl font-bold sm:text-3xl">
          <i class="fa-solid fa-lightbulb mr-2 text-indigo-600"></i>{{ copy.headings.insights }}
        </h2>
        <ul class="mt-5 space-y-3">
          <li v-for="line in insights" :key="line" class="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <i class="fa-solid fa-circle-check mt-1 text-indigo-500"></i>
            <span>{{ line }}</span>
          </li>
        </ul>
      </section>

      <!-- table -->
      <section>
        <h2 class="text-2xl font-bold sm:text-3xl">
          <i class="fa-solid fa-table-list mr-2 text-indigo-600"></i>{{ copy.headings.table }}
        </h2>
        <div class="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th v-for="col in tableCols" :key="col.name" class="px-4 py-3 font-semibold">{{ col.name }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(row, i) in rows" :key="i" class="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50">
                <td
                  v-for="col in tableCols"
                  :key="col.name"
                  class="px-4 py-2.5"
                  :class="col.name === roles.nameColumn ? 'font-semibold' : 'text-slate-700'"
                >
                  {{ row[col.name] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- faq -->
      <section>
        <h2 class="text-2xl font-bold sm:text-3xl">
          <i class="fa-solid fa-circle-question mr-2 text-indigo-600"></i>{{ copy.headings.faq }}
        </h2>
        <div class="mt-5 space-y-3">
          <details v-for="item in copy.faq" :key="item.q" class="group rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:content-none">
              {{ item.q }}
              <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition group-open:rotate-180"></i>
            </summary>
            <p class="mt-2 text-slate-700">{{ item.a }}</p>
          </details>
        </div>
      </section>
    </main>
  </div>
</template>