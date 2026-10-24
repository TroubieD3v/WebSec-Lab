import { useState } from 'react'
import { Badge, Button, Card, CodeBlock, fieldBase, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson, type LabResponse } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'security-misconfiguration'
const HARDENING = ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy']
const BANNERS = ['x-powered-by', 'x-app-version']

const inputClass = `text-sm ${fieldBase}`

interface Result {
  label: string
  response: LabResponse
  upstream: Record<string, string>
}

export function MisconfigDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [orderRef, setOrderRef] = useState('1001')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const call = async (label: string, path: string) => {
    setBusy(true)
    try {
      const response = await labRequest(LAB, mode, { method: 'GET', path })
      const header = response.headers.find(([k]) => k === 'x-upstream-headers')?.[1] ?? '{}'
      setResult({ label, response, upstream: (tryJson(header) ?? {}) as Record<string, string> })
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const missing = result ? HARDENING.filter((h) => !(h in result.upstream)) : []
  const banners = result ? BANNERS.filter((h) => h in result.upstream) : []
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('mis.order')}</span>
            <input className={`${inputClass} w-40`} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} data-testid="mis-order" autoComplete="off" />
          </label>
          <Button variant="primary" onClick={() => call('order', `orders/${encodeURIComponent(orderRef)}`)} disabled={busy} data-testid="mis-fetch">
            {t('mis.fetch')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button onClick={() => call('debug', 'debug/config')} disabled={busy} data-testid="mis-debug">
            {t('mis.debug')}
          </Button>
          <Button onClick={() => call('ping', 'ping')} disabled={busy} data-testid="mis-ping">
            {t('mis.ping')}
          </Button>
        </div>
        <p className="text-xs text-ink-subtle">{t('mis.hint')}</p>
      </Card>

      <Card surface="lowest" className="space-y-4 p-6" aria-live="polite">
        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={result.response.status} data-testid="mis-status" />
              {result.response.body.includes('Traceback') && <Badge tone="red" data-testid="mis-trace">{t('mis.trace')}</Badge>}
              {result.response.body.includes('secret_key') && <Badge tone="red" data-testid="mis-secrets">{t('mis.secrets')}</Badge>}
            </div>
            <CodeBlock className="max-h-64 whitespace-pre-wrap break-words" data-testid="mis-body">
              {JSON.stringify(tryJson(result.response.body) ?? result.response.body, null, 2)}
            </CodeBlock>
            <div className="space-y-2" data-testid="mis-headers">
              <h3 className="text-xs font-medium text-ink-muted">{t('mis.headers')}</h3>
              <CodeBlock className="max-h-40 text-ink-muted">
                {Object.entries(result.upstream).map(([k, v]) => `${k}: ${v}`).join('\n')}
              </CodeBlock>
              {missing.length > 0 && <Badge tone="red" className="whitespace-normal" data-testid="mis-missing">{t('mis.missing', { list: missing.join(', ') })}</Badge>}
              {banners.length > 0 && <Badge tone="amber" className="whitespace-normal" data-testid="mis-banner">{t('mis.disclosed', { list: banners.join(', ') })}</Badge>}
              {missing.length === 0 && banners.length === 0 && <Badge tone="green" data-testid="mis-secure">{t('mis.secure')}</Badge>}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
