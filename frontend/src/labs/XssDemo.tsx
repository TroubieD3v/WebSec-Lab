import { useEffect, useState, type FormEvent } from 'react'
import { PlayCircle } from 'lucide-react'
import { SandboxPreview } from '../components/SandboxPreview'
import { Button, Card } from '../components/ui'
import { useI18n } from '../i18n'
import { LABS_ORIGIN } from '../services/api'
import type { DemoProps } from './types'

const PAYLOADS = ['<b>bold</b>', '<img src=x onerror=alert(1)>', '<script>alert(1)</script>']

export function XssDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('hello')
  const [src, setSrc] = useState<string | null>(null)

  // Switching mode invalidates the previous preview.
  useEffect(() => setSrc(null), [mode])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSrc(`${LABS_ORIGIN}/xss/${mode}/search?q=${encodeURIComponent(query)}&_=${Date.now()}`)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">{t('xss.label')}</span>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
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
          <span className="mb-1.5 block text-xs text-zinc-500">{t('xss.payloads')}</span>
          <div className="flex flex-wrap gap-2">
            {PAYLOADS.map((payload) => (
              <button
                key={payload}
                onClick={() => setQuery(payload)}
                className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 font-mono text-xs text-zinc-200 hover:bg-zinc-700"
              >
                {payload}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">{t('xss.note')}</p>
      </Card>
      <SandboxPreview src={src} labId="xss" onExecuted={onActivity} />
    </div>
  )
}
