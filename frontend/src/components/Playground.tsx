import { useEffect, useState } from 'react'
import { Check, Copy, Send } from 'lucide-react'
import { useI18n } from '../i18n'
import { labRequest, labUrl, tryJson, type LabResponse, type Mode, type Preset } from '../services/api'
import { Button, Card, CodeBlock, StatusChip } from './ui'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const index = line.indexOf(':')
    if (index > 0) headers[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }
  return headers
}

const formatHeaders = (headers: Record<string, string>) =>
  Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

const field =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600'

interface Props {
  labId: string
  mode: Mode
  presets: Preset[]
  onActivity: () => void
}

export function Playground({ labId, mode, presets, onActivity }: Props) {
  const { t } = useI18n()
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<LabResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const applyPreset = (preset: Preset) => {
    setMethod(preset.method)
    setPath(preset.path)
    setHeaders(formatHeaders(preset.headers))
    setBody(preset.body ?? '')
  }

  useEffect(() => {
    if (presets[0]) applyPreset(presets[0])
  }, [labId]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setLoading(true)
    setError(null)
    try {
      setResponse(await labRequest(labId, mode, { method, path, headers: parseHeaders(headers), body }))
      onActivity()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const copyCurl = async () => {
    const parts = [`curl -X ${method} '${window.location.origin}${labUrl(labId, mode, path)}'`]
    for (const [k, v] of Object.entries(parseHeaders(headers))) parts.push(`-H '${k}: ${v}'`)
    if (body && method !== 'GET') parts.push(`-d '${body.replaceAll("'", "'\\''")}'`)
    await navigator.clipboard.writeText(parts.join(' \\\n  '))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const json = response ? tryJson(response.body) : undefined
  const shownBody = response ? (json !== undefined ? JSON.stringify(json, null, 2) : response.body) : ''
  // The proxy reports every header the lab sent in X-Upstream-Headers (none is applied to this page).
  const upstreamRaw = response?.headers.find(([k]) => k === 'x-upstream-headers')?.[1]
  const upstream = (upstreamRaw ? tryJson(upstreamRaw) : undefined) as Record<string, string> | undefined
  const interesting = upstream
    ? Object.entries(upstream)
    : (response?.headers.filter(([k]) => /^(retry-after|content-type)/i.test(k)) ?? [])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <p className="text-xs text-zinc-400">{t('pg.intro')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{t('pg.presets')}:</span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="w-28 shrink-0">
            <span className="mb-1 block text-xs text-zinc-500">{t('pg.method')}</span>
            <select className={field} value={method} onChange={(e) => setMethod(e.target.value)} aria-label={t('pg.method')}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-500">{t('pg.path')}</span>
            <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-950 pl-3 font-mono text-sm">
              <span className="truncate text-zinc-500">
                /api/labs/{labId}/{mode}/
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-zinc-100 outline-none"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                aria-label={t('pg.path')}
                data-testid="pg-path"
              />
            </div>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">{t('pg.headers')}</span>
          <textarea className={field} rows={3} value={headers} onChange={(e) => setHeaders(e.target.value)} spellCheck={false} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">{t('pg.body')}</span>
          <textarea className={field} rows={3} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
        </label>
        <div className="flex gap-2">
          <Button variant="primary" onClick={send} loading={loading} data-testid="pg-send">
            {!loading && <Send className="size-4" aria-hidden />} {loading ? t('pg.sending') : t('pg.send')}
          </Button>
          <Button onClick={copyCurl}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{' '}
            {copied ? t('pg.copied') : t('pg.copyCurl')}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4" aria-live="polite">
        <h3 className="text-sm font-semibold">{t('pg.response')}</h3>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {!response && !error && <p className="text-sm text-zinc-500">{t('pg.noResponse')}</p>}
        {response && (
          <>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <StatusChip status={response.status} data-testid="pg-status" />
              <span>{response.ms} ms</span>
            </div>
            <CodeBlock className="text-zinc-400">
              {interesting.map(([k, v]) => `${k}: ${v}`).join('\n')}
            </CodeBlock>
            <CodeBlock className="max-h-96 break-words whitespace-pre-wrap" data-testid="pg-body">
              {shownBody || ' '}
            </CodeBlock>
          </>
        )}
      </Card>
    </div>
  )
}
