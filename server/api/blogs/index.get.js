// Lists every saved blog as a small summary (no rows) for the landing page.
export default defineEventHandler(async () => {
  const storage = useStorage('blogs')
  const keys = await storage.getKeys()

  const blogs = await Promise.all(
    keys.map(async (key) => {
      const blog = await storage.getItem(key)
      if (!blog) return null
      return {
        slug: blog.slug,
        title: blog.copy?.title ?? blog.topic,
        description: blog.copy?.metaDescription ?? '',
        createdAt: blog.createdAt,
        copySource: blog.copySource,
        rowCount: blog.stats?.rowCount ?? 0,
        total: blog.stats?.value?.total ?? null,
        symbol: blog.stats?.value?.symbol ?? '',
      }
    })
  )

  // newest first
  return blogs
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})