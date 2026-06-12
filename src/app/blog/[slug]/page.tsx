import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { getAllSlugs, getPostBySlug, getRelatedPosts, type BlogPost } from '@/lib/blog'

const SITE = 'https://vestochka.uk'

export const revalidate = 600

interface Params {
  slug: string
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Пост не найден' }

  const canonical = `${SITE}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const related = await getRelatedPosts(post.slug, 3)
  const canonical = `${SITE}/blog/${post.slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author, url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Весточка',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.ico` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  }

  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        // данные наши (frontmatter постов), не пользовательский ввод; экранируем < на случай </script>
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }}
      />
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
          <nav>
            <Link href="/blog">← Блог</Link>
          </nav>
        </div>
      </header>

      <article className="col">
        <div className="post-meta">
          {formatDate(post.date)} · {post.readingMinutes} мин
        </div>
        <h1 className="post-title">{post.title}</h1>
        <p className="post-desc">{post.description}</p>

        <div className="blog-body">
          <MDXRemote
            source={post.content}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>

        {post.tags.length > 0 && (
          <div className="tags" style={{ marginTop: 56 }}>
            {post.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <section className="related">
            <span className="eyebrow">Читайте также</span>
            <div className="related-list">
              {related.map((p) => (
                <RelatedCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        <footer className="post-cta">
          <p>
            Хотите пользоваться MAX из привычного Telegram?{' '}
            <Link href="/#start">Подключиться к Весточке →</Link>
          </p>
        </footer>
      </article>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function RelatedCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="related-card">
      <div className="post-meta">
        {formatDate(post.date)} · {post.readingMinutes} мин
      </div>
      <div className="related-title">{post.title}</div>
      <div className="related-desc">{post.description}</div>
    </Link>
  )
}
