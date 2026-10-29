<script setup>

import Papa from 'papaparse'

const status = ref('Running...')

onMounted(async () => {
  const text = await $fetch('/samples/fintech.csv', { responseType: 'text' })
  const { data: rows } = Papa.parse(text, { header: true, skipEmptyLines: true })

  const columns = detectColumns(rows)
  console.log('first row:', rows[0])
  console.table(columns)

  const roles = suggestRoles(columns, rows)
  console.log(roles)

  const stats = computeStats(rows, columns, roles)
  console.log(JSON.stringify(stats, null, 2))

  console.log('symbol:', stats.value.symbol)
  console.log(JSON.stringify(fallbackCopy(stats, roles, 'UK fintech companies'), null, 2))

  const blog = buildBlog('UK fintech companies', rows, columns, roles, fallbackCopy(stats, roles, 'UK fintech companies'), 'fallback')
  console.log(blog.slug, blog.stats.rowCount, Object.keys(blog))

  status.value = 'Calling /api/generate...'
  try {
    const res = await $fetch('/api/generate', { method: 'POST', body: { topic: 'UK fintech companies', rows, columns, roles } })
    console.log('generate:', res)
    status.value = 'DONE: ' + JSON.stringify(res)
   } catch (err) {
    console.error('GENERATE BROKE:', err)
    status.value = 'BROKE: ' + (err.data?.message || err.statusMessage || err.message)
  }
})
</script>

<template>
  <div class="p-8">
    <p>Open the browser console (F12)</p>
    <p class="mt-4 font-mono text-lg">{{ status }}</p>
  </div>
</template>