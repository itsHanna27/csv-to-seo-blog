<template>
  <div>
    <nav class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="text-lg font-extrabold text-indigo-700">
          <i class="fa-solid fa-ranking-star mr-2"></i>RankBlog
        </NuxtLink>
        <NuxtLink
          to="/generate"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Generate a blog
        </NuxtLink>
      </div>
    </nav>
    <NuxtPage />
  </div>
</template>