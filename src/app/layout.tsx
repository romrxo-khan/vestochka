import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const DESCRIPTION =
  'Сообщения из MAX приходят в привычный Telegram. Отвечайте текстом, голосом, фото и кружками — не устанавливая MAX на телефон.'

export const metadata: Metadata = {
  metadataBase: new URL('https://vestochka.uk'),
  title: 'Весточка — MAX в вашем Telegram',
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  other: { '1plat': '2011' }, // верификация магазина 1plat (RU-эквайринг)
  openGraph: {
    title: 'Весточка — MAX в вашем Telegram',
    description: DESCRIPTION,
    url: 'https://vestochka.uk',
    siteName: 'Весточка',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Весточка — MAX в вашем Telegram',
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Весточка',
    url: 'https://vestochka.uk',
    description: DESCRIPTION,
    logo: 'https://vestochka.uk/favicon.ico',
  }

  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  )
}
