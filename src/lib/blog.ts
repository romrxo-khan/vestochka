import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

/**
 * Файловый блог. Посты — MDX в `src/content/blog/*.mdx` с frontmatter:
 *
 *   ---
 *   title: "Заголовок поста"
 *   slug: "zagolovok-posta"        # имя файла без .mdx, если не указан
 *   description: "1-2 предложения — идёт в <meta description> и в список"
 *   date: "2026-06-12"             # ISO; управляет сортировкой
 *   author: "Команда Весточки"     # опционально
 *   tags: ["тег-один", "тег-два"]  # опционально
 *   draft: false                   # опционально; черновики не видны в проде
 *   ---
 *
 * Добавить пост = положить файл в `src/content/blog/`. Регистрация не нужна.
 */

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  draft: boolean
  content: string
  readingMinutes: number
}

interface FrontMatter {
  title?: string
  slug?: string
  description?: string
  date?: string
  author?: string
  tags?: string[]
  draft?: boolean
}

async function readPostFile(filename: string): Promise<BlogPost | null> {
  if (!filename.endsWith('.mdx') && !filename.endsWith('.md')) return null

  const raw = await fs.readFile(path.join(BLOG_DIR, filename), 'utf-8')
  const { data, content } = matter(raw)
  const fm = data as FrontMatter
  if (!fm.title) return null

  const slug = (fm.slug || filename.replace(/\.mdx?$/, '')).toLowerCase()
  const stat = readingTime(content)

  return {
    slug,
    title: fm.title,
    description: fm.description || '',
    date: fm.date || '1970-01-01',
    author: fm.author || 'Команда Весточки',
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    draft: Boolean(fm.draft),
    content,
    readingMinutes: Math.max(1, Math.round(stat.minutes)),
  }
}

let cachedAllPosts: BlogPost[] | null = null
const IS_DEV = process.env.NODE_ENV !== 'production'

/** Посты — новые сверху. Черновики видны в dev, скрыты в проде. */
export async function getAllPosts(): Promise<BlogPost[]> {
  if (!IS_DEV && cachedAllPosts) return cachedAllPosts

  let entries: string[] = []
  try {
    entries = await fs.readdir(BLOG_DIR)
  } catch {
    if (!IS_DEV) cachedAllPosts = []
    return []
  }

  const loaded = await Promise.all(entries.map(readPostFile))
  const posts = loaded
    .filter((p): p is BlogPost => p !== null && (IS_DEV || !p.draft))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!IS_DEV) cachedAllPosts = posts
  return posts
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const all = await getAllPosts()
  return all.find((p) => p.slug === slug) ?? null
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await getAllPosts()
  return all.map((p) => p.slug)
}

/** До `limit` похожих постов: сначала по общим тегам, затем по свежести. Внутренние ссылки — дешёвый SEO. */
export async function getRelatedPosts(slug: string, limit = 3): Promise<BlogPost[]> {
  const all = await getAllPosts()
  const self = all.find((p) => p.slug === slug)
  if (!self) return []
  const selfTags = new Set(self.tags.map((t) => t.toLowerCase()))

  return all
    .filter((p) => p.slug !== slug)
    .map((p) => ({ post: p, shared: p.tags.filter((t) => selfTags.has(t.toLowerCase())).length }))
    .sort((a, b) => (b.shared !== a.shared ? b.shared - a.shared : b.post.date.localeCompare(a.post.date)))
    .slice(0, limit)
    .map((x) => x.post)
}
