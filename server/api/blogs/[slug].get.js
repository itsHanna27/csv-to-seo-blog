export default defineEventHandler(async (event) => {
  // 1. Get the slug from the URL
  const slug = getRouterParam(event, 'slug');

  // 2. Read the blog from storage
  const blog = await useStorage('blogs').getItem(slug);

  // 3. getItem returns null if it doesn't exist, so check for that
  if (!blog) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Blog not found'
    });
  }

  // 4. Return the blog
  return blog;
});