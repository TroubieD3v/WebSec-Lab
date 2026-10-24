import { useEffect, useState, type FormEvent } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { SandboxPreview } from '../components/SandboxPreview'
import { Button, Card, chipClass, fieldClass } from '../components/ui'
import { useI18n } from '../i18n'
import { LABS_ORIGIN, labRequest } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'stored-xss'
const PAYLOADS = ['<b>bold</b>', '<img src=x onerror=alert(1)>']
const input = fieldClass

export function StoredXssDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [author, setAuthor] = useState('Eve')
  const [text, setText] = useState('Great shop!')
  const [src, setSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const show = () => setSrc(`${LABS_ORIGIN}/${LAB}/${mode}/page?_=${Date.now()}`)

  // The guestbook is per mode and persists, so show the current one right away.
  useEffect(show, [mode])

  const post = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await labRequest(LAB, mode, {
        method: 'POST',
        path: 'comments',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text }),
      })
      show()
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await labRequest(LAB, mode, { method: 'DELETE', path: 'comments' })
      show()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-5 p-6">
        <form onSubmit={post} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('sxss.author')}</span>
            <input className={input} value={author} onChange={(e) => setAuthor(e.target.value)} data-testid="sxss-author" maxLength={40} autoComplete="off" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('sxss.text')}</span>
            <textarea className={input} rows={3} value={text} onChange={(e) => setText(e.target.value)} data-testid="sxss-text" maxLength={500} spellCheck={false} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" loading={busy} data-testid="sxss-post">
              {!busy && <Send className="size-4" aria-hidden />} {t('sxss.post')}
            </Button>
            <Button onClick={clear} disabled={busy} data-testid="sxss-clear">
              <Trash2 className="size-4" aria-hidden /> {t('sxss.clear')}
            </Button>
          </div>
        </form>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('xss.payloads')}</span>
          <div className="flex flex-wrap gap-2">
            {PAYLOADS.map((payload) => (
              <button
                type="button"
                key={payload}
                onClick={() => setText(payload)}
                className={`${chipClass} font-mono`}
              >
                {payload}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-subtle">{t('xss.note')}</p>
      </Card>
      <SandboxPreview src={src} labId={LAB} onActivity={onActivity} />
    </div>
  )
}
