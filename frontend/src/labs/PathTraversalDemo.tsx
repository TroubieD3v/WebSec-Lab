import { useState, type FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { Badge, Button, Card, CodeBlock, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson, type LabResponse } from '../services/api'
import type { DemoProps } from './types'

const DOCS = ['welcome.txt', 'faq.txt', 'guides/start.txt']
const DOCS_ROOT = '/srv/app/public/docs'

interface FileResult {
  name?: string
  resolved?: string
  content?: string
  detail?: string
}

export function PathTraversalDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [name, setName] = useState('welcome.txt')
  const [last, setLast] = useState<LabResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const open = async (value: string) => {
    setBusy(true)
    try {
      setLast(await labRequest('path-traversal', mode, { method: 'GET', path: `files?name=${encodeURIComponent(value)}` }))
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void open(name)
  }

  const data = last ? ((tryJson(last.body) ?? {}) as FileResult) : undefined
  const escaped = last?.status === 200 && data?.resolved && !data.resolved.startsWith(`${DOCS_ROOT}/`)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">{t('path.file')}</span>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="path-input"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <Button type="submit" variant="primary" loading={busy} data-testid="path-open">
            {!busy && <FileText className="size-4" aria-hidden />} {t('path.open')}
          </Button>
        </form>
        <div>
          <span className="mb-1.5 block text-xs text-zinc-500">{t('path.known')}</span>
          <div className="flex flex-wrap gap-2">
            {DOCS.map((doc) => (
              <button
                key={doc}
                onClick={() => setName(doc)}
                className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 font-mono text-xs text-zinc-200 hover:bg-zinc-700"
              >
                {doc}
              </button>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs text-zinc-500">
          {t('path.root')}: {DOCS_ROOT}
        </p>
        <p className="text-xs text-zinc-500">{t('path.sim')}</p>
      </Card>

      <Card className="space-y-3 p-4" aria-live="polite">
        {last && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={last.status} data-testid="path-status" />
              {escaped && (
                <Badge tone="red" data-testid="path-escaped">
                  {t('path.escaped')}
                </Badge>
              )}
              {last.status === 403 && <Badge tone="green">{t('path.blocked')}</Badge>}
            </div>
            {data?.resolved && (
              <p className="font-mono text-xs text-zinc-400" data-testid="path-resolved">
                {t('path.resolved')}: {data.resolved}
              </p>
            )}
            <CodeBlock className="max-h-72 whitespace-pre-wrap break-words" data-testid="path-content">
              {data?.content ?? data?.detail ?? last.body}
            </CodeBlock>
          </>
        )}
      </Card>
    </div>
  )
}
