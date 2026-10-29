<script setup>
import Papa from 'papaparse'

useHead({ title: 'Generate a blog' })

// ---- state ----
const rows = ref([])          // parsed CSV rows
const columns = ref([])       // from detectColumns()
const roles = ref({ nameColumn: null, rankColumn: null, valueColumn: null })
const fileName = ref('')
const topic = ref('')
const dragging = ref(false)
const loading = ref(false)
const error = ref('')

// icon for each detected column type (Font Awesome)
const typeIcons = {
  date: 'fa-calendar',
  number: 'fa-hashtag',
  currency: 'fa-sterling-sign',
  multi: 'fa-tags',
  category: 'fa-layer-group',
  text: 'fa-align-left',
  empty: 'fa-ban',
}

// ---- dropdown options for the "confirm columns" step ----
const nameOptions = computed(() => columns.value)
const rankOptions = computed(() => columns.value.filter(c => c.type === 'number'))
const valueOptions = computed(() =>
  columns.value.filter(c => c.type === 'number' || c.type === 'currency')
)

const previewColumns = computed(() => columns.value.slice(0, 5))
const previewRows = computed(() => rows.value.slice(0, 5))
const canGenerate = computed(() => rows.value.length > 0 && topic.value.trim() && !loading.value)

// ---- loading a CSV (shared by upload, drag and drop, and the sample button) ----
function loadRows(parsedRows, name) {
  if (!parsedRows.length) {
    error.value = 'That CSV has no rows. Check the file and try again.'
    return
  }
  error.value = ''
  rows.value = parsedRows
  fileName.value = name
  columns.value = detectColumns(parsedRows)
  roles.value = suggestRoles(columns.value, parsedRows) // best guess, user can change it
}

function handleFile(file) {
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.csv')) {
    error.value = 'Please choose a .csv file.'
    return
  }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => loadRows(result.data, file.name),
    error: () => { error.value = 'Could not read that file.' },
  })
}

function onPick(e) {
  handleFile(e.target.files[0])
}

function onDrop(e) {
  dragging.value = false
  handleFile(e.dataTransfer.files[0])
}

async function useSample() {
  const text = await $fetch('/samples/fintech.csv', { responseType: 'text' })
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  loadRows(data, 'fintech.csv (sample)')
  if (!topic.value) topic.value = 'UK fintech companies'
}

function reset() {
  rows.value = []
  columns.value = []
  fileName.value = ''
  error.value = ''
}

// ---- send to the server, then go to the finished blog ----
async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/generate', {
      method: 'POST',
      body: {
        topic: topic.value.trim(),
        rows: rows.value,
        columns: columns.value,
        roles: roles.value,
      },
    })
    await navigateTo('/blog/' + res.slug)
  } catch (err) {
    error.value = err.data?.message || err.statusMessage || err.message
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-12 text-slate-900">
    <!-- header -->
    <header class="mb-10">
      <h1 class="text-3xl font-bold">
        <i class="fa-solid fa-wand-magic-sparkles mr-2 text-blue-600"></i>
        Generate a blog
      </h1>
      <p class="mt-2 text-slate-600">
        Upload a ranked list as a CSV and get an SEO blog post with stats, a table and an FAQ.
      </p>
    </header>

    <!-- error banner -->
    <div
      v-if="error"
      class="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
    >
      <i class="fa-solid fa-circle-exclamation mt-1"></i>
      <p>{{ error }}</p>
    </div>

    <!-- STEP 1: upload -->
    <section class="mb-8">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm text-white">1</span>
        Upload your CSV
      </h2>

      <label
        v-if="!rows.length"
        class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition"
        :class="dragging ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-blue-600'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <i class="fa-solid fa-file-csv mb-3 text-4xl text-blue-600"></i>
        <span class="font-medium">Drag a CSV here, or click to browse</span>
        <span class="mt-1 text-sm text-slate-500">First row must be the column names</span>
        <input type="file" accept=".csv" class="hidden" @change="onPick" />
      </label>

      <div
        v-else
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-circle-check text-xl text-blue-600"></i>
          <div>
            <p class="font-medium">{{ fileName }}</p>
            <p class="text-sm text-slate-500">{{ rows.length }} rows, {{ columns.length }} columns</p>
          </div>
        </div>
        <button class="text-sm text-slate-500 hover:text-red-600" @click="reset">
          <i class="fa-solid fa-xmark mr-1"></i>Remove
        </button>
      </div>

      <button
        v-if="!rows.length"
        class="mt-3 text-sm text-blue-700 hover:underline"
        @click="useSample"
      >
        <i class="fa-solid fa-flask mr-1"></i>No CSV handy? Try the sample (UK fintech)
      </button>
    </section>

    <!-- STEP 2: topic + confirm columns -->
    <template v-if="rows.length">
      <section class="mb-8">
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm text-white">2</span>
          Name your topic
        </h2>
        <input
          v-model="topic"
          type="text"
          placeholder="e.g. UK fintech companies"
          class="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <p class="mt-1 text-sm text-slate-500">
          This becomes the blog title and the URL, e.g. /blog/uk-fintech-companies
        </p>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm text-white">3</span>
          Confirm your columns
        </h2>

        <!-- what we detected -->
        <div class="mb-4 flex flex-wrap gap-2">
          <span
            v-for="col in columns"
            :key="col.name"
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
          >
            <i class="fa-solid text-blue-600" :class="typeIcons[col.type] || 'fa-question'"></i>
            {{ col.name }}
            <span class="text-slate-400">{{ col.type }}</span>
          </span>
        </div>
<br>
        <!-- role pickers (pre-filled by suggestRoles, user can override) -->
        <div class="grid gap-4 sm:grid-cols-3">
          <label class="block">
            <span class="mb-1 block text-sm font-medium">
              <i class="fa-solid fa-building mr-1 text-blue-600"></i>Name column
            </span>
            <select v-model="roles.nameColumn" class="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option :value="null">None</option>
              <option v-for="c in nameOptions" :key="c.name" :value="c.name">{{ c.name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-sm font-medium">
              <i class="fa-solid fa-ranking-star mr-1 text-blue-600"></i>Rank column
            </span>
            <select v-model="roles.rankColumn" class="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option :value="null">None</option>
              <option v-for="c in rankOptions" :key="c.name" :value="c.name">{{ c.name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-sm font-medium">
              <i class="fa-solid fa-chart-simple mr-1 text-blue-600"></i>Ranked by (value)
            </span>
            <select v-model="roles.valueColumn" class="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option :value="null">None</option>
              <option v-for="c in valueOptions" :key="c.name" :value="c.name">{{ c.name }}</option>
            </select>
          </label>
        </div>

        <!-- quick preview so she can sanity-check the data -->
        <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th v-for="col in previewColumns" :key="col.name" class="whitespace-nowrap px-3 py-2 font-medium">
                  {{ col.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in previewRows" :key="i" class="border-t border-slate-100">
                <td v-for="col in previewColumns" :key="col.name" class="max-w-[14rem] truncate px-3 py-2">
                  {{ row[col.name] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-1 text-sm text-slate-500">Showing the first 5 rows and up to 5 columns.</p>
      </section>

      <!-- generate button -->
      <button
        :disabled="!canGenerate"
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="generate"
      >
        <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-wand-magic-sparkles"></i>
        {{ loading ? 'Writing your blog...' : 'Generate blog' }}
      </button>
      <p v-if="loading" class="mt-2 text-center text-sm text-slate-500">
        This can take up to a minute while Gemini writes the copy.
      </p>
    </template>
  </main>
</template>