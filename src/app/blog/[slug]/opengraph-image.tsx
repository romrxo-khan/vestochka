import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAllSlugs, getPostBySlug } from '@/lib/blog'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  const title = post?.title ?? 'Весточка'

  const [extrabold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'src/fonts/Manrope-ExtraBold.woff')),
    readFile(join(process.cwd(), 'src/fonts/Manrope-Medium.woff')),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: 72,
          fontFamily: 'Manrope',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#0d1b2a' }}>
          Весточка<span style={{ color: '#1d6ff2' }}>.</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: '#0d1b2a',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: '#5c6b7e' }}>
          vestochka.uk · MAX в вашем Telegram
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Manrope', data: extrabold, weight: 800, style: 'normal' },
        { name: 'Manrope', data: medium, weight: 500, style: 'normal' },
      ],
    },
  )
}
