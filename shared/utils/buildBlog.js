import { computeStats } from './computeStats.js'
// Builds the one JSON object that gets saved and served for a blog.
// Stores finished results only, so the blog page never recomputes anything.

// "UK fintech companies!" -> "uk-fintech-companies"
function makeSlug(topic) {
  return topic
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, "")
  .trim()
  .replace(/\s+/g, "-");

}


export function buildBlog(topic, rows, columns, roles, copy, copySource) {
  const slug = makeSlug(topic);
  const createdAt = new Date().toISOString();
  const stats = computeStats(rows, columns, roles);

  return {
    slug,
    topic,
    createdAt,
    copySource,
    copy,
    roles,
    columns,
    stats,
    rows
  };
}