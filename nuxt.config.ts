import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/sitemap'],
 css: ['~/assets/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
  storage: {
    blogs: { driver: 'fs', base: './server/data/blogs' }
  }
}
})