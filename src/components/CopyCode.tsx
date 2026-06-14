'use client'

import { useState } from 'react'

/** Код-чип, который копируется по нажатию (ник бота, команда). */
export default function CopyCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <code
      className="copy-code"
      title="Нажмите, чтобы скопировать"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* буфер недоступен */
        }
      }}
    >
      {text}
      {copied ? ' ✓' : ''}
    </code>
  )
}
