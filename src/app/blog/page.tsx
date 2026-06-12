import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

const DESC =
  'Как оставаться на связи с близкими в России: про мессенджеры, приватность и жизнь между странами.'

export const metadata: Metadata = {
  title: 'Блог — Весточка',
  description: DESC,
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Блог — Весточка', description: DESC, url: '/blog', type: 'website' },
}

export const revalidate = 600

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts()

  return (
    <div className="wrap">
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
          <nav>
            <Link href="/">На главную</Link>
          </nav>
        </div>
      </header>

      <main className="col">
        <span className="eyebrow">Блог</span>
        <h1 className="blog-h1">Связь без границ</h1>
        <p className="blog-lead">{DESC}</p>

        {posts.length === 0 ? (
          <p style={{ color: 'var(--soft)' }}>Пока постов нет.</p>
        ) : (
          <ul className="blog-list">
            {posts.map((post) => (
              <li key={post.slug} className="blog-item">
                <Link href={`/blog/${post.slug}`}>
                  <div className="post-meta">
                    {formatDate(post.date)} · {post.readingMinutes} мин
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.description}</p>
                  {post.tags.length > 0 && (
                    <div className="tags">
                      {post.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
