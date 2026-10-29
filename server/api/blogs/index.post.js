export default defineEventHandler(async (event) => {
  // 1. Read the blog from the request body
  const blog = await readBody(event);

  // 2. Check that the blog has a slug
  if (!blog?.slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug'
    });
  }

  // 3. Save the blog
  await useStorage('blogs').setItem(blog.slug, blog);

  // 4. Return the slug
  return { slug: blog.slug };
});