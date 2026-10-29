<script setup>
useSeoMeta({
  title: 'CSV to SEO Blog Generator',
  description: 'Turn any ranked CSV into an SEO blog post with verified stats, a table and an FAQ.',
})

// list of saved blogs (runs on the server first, so it's in the page HTML for SEO)
const { data: blogs } = await useFetch('/api/blogs', { default: () => [] })

const steps = [
  { icon: 'fa-file-csv', title: 'Upload a CSV', text: 'Any ranked list works: companies, products, places, anything with a name and a value.' },
  { icon: 'fa-table-columns', title: 'Confirm the columns', text: 'We detect names, ranks and values for you. You just check the guesses.' },
  { icon: 'fa-wand-magic-sparkles', title: 'Get a blog post', text: 'Stats are calculated in code, then AI writes the copy from those verified numbers.' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <main class="bg-linear-to-b from-indigo-50/70 via-white to-white text-slate-900">
    <!-- hero -->
    <section class="mx-auto max-w-3xl px-6 py-20 text-center">
      <span class="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">
        <i class="fa-solid fa-bolt"></i> CSV in, SEO blog out
      </span>
      <h1 class="text-4xl font-bold leading-tight sm:text-5xl">
        Turn any ranked list into a ready-to-publish blog post
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-lg text-slate-600">
        Upload a CSV and get a title, meta description, stats, a ranking table and an FAQ, all built from your real numbers.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink
          to="/generate"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i> Generate a blog
        </NuxtLink>
        <a
          href="#recent"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-semibold transition hover:border-indigo-600 hover:text-indigo-600"
        >
          <i class="fa-solid fa-arrow-down"></i> See examples
        </a>
      </div>
    </section>

    <!-- how it works -->
    <section class="border-y border-slate-200 bg-slate-50">
      <div class="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-xl text-white">
            <i class="fa-solid" :class="step.icon"></i>
          </div>
          <h2 class="font-semibold">{{ i + 1 }}. {{ step.title }}</h2>
          <p class="mt-2 text-sm text-slate-600">{{ step.text }}</p>
        </div>
      </div>
    </section>

    <!-- recent blogs -->
    <section id="recent" class="mx-auto max-w-5xl px-6 py-16">
      <h2 class="mb-6 flex items-center gap-2 text-2xl font-bold">
        <i class="fa-solid fa-newspaper text-indigo-600"></i> Recent blogs
      </h2>

      <!-- empty state -->
      <div
        v-if="!blogs.length"
        class="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center text-slate-500"
      >
        <i class="fa-solid fa-inbox mb-3 text-3xl"></i>
        <p>No blogs yet. <NuxtLink to="/generate" class="font-medium text-indigo-600 hover:underline">Generate your first one</NuxtLink>.</p>
      </div>

      <!-- cards -->
      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="blog in blogs"
          :key="blog.slug"
          :to="'/blog/' + blog.slug"
          class="group flex flex-col rounded-xl border border-slate-200 p-5 transition hover:border-indigo-600 hover:shadow-md"
        >
          <h3 class="font-semibold group-hover:text-indigo-600">{{ blog.title }}</h3>
          <p class="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{{ blog.description }}</p>

          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span><i class="fa-solid fa-list-ol mr-1"></i>{{ blog.rowCount }} rows</span>
            <span v-if="blog.total !== null">
              <i class="fa-solid fa-coins mr-1"></i>{{ formatValue(blog.total, blog.symbol) }}
            </span>
            <span><i class="fa-regular fa-calendar mr-1"></i>{{ formatDate(blog.createdAt) }}</span>
            <span v-if="blog.copySource === 'gemini'" class="text-indigo-600">
              <i class="fa-solid fa-robot mr-1"></i>AI copy
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>