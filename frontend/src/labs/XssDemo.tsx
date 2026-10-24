import { useState, type FormEvent } from 'react'
import { PlayCircle } from 'lucide-react'
import { SandboxPreview } from '../components/SandboxPreview'
import { Button, Card, chipClass, fieldClass } from '../components/ui'
import { useI18n } from '../i18n'
import { LABS_ORIGIN } from '../services/api'
import type { DemoProps } from './types'

const PAYLOADS = ['<b>bold</b>', '<img src=x onerror=alert(1)>', '<script>alert(1)</script>']

export function XssDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('hello')
  // A preview belongs to the mode it was rendered in; switching mode hides it.
  const [preview, setPreview] = useState<{ mode: string; url: string } | null>(null)
  const src = preview && preview.mode === mode ? preview.url : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setPreview({ mode, url: `${LABS_ORIGIN}/xss/${mode}/search?q=${encodeURIComponent(query)}&_=${Date.now()}` })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-5 p-6">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('xss.label')}</span>
            <input
              className={fieldClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="xss-input"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <Button type="submit" variant="primary" data-testid="xss-render">
            <PlayCircle className="size-4" aria-hidden /> {t('xss.render')}
          </Button>
        </form>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('xss.payloads')}</span>
          <div className="flex flex-wrap gap-2">
            {PAYLOADS.map((payload) => (
              <button
                type="button"
                key={payload}
                onClick={() => setQuery(payload)}
                className={`${chipClass} font-mono`}
              >
                {payload}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-subtle">{t('xss.note')}</p>
      </Card>
      <SandboxPreview src={src} labId="xss" onActivity={onActivity} />
    </div>
  )
}
