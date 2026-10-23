import { useState } from 'react'
import { Badge, Button, Card, CodeBlock, StatusChip, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson, type LabResponse } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'broken-access-control'
const PERSONAS = {
  alice: { label: 'Alice (user)', token: 'alice-demo-token' },
  admin: { label: 'Root (admin)', token: 'admin-demo-token' },
} as const
type Persona = keyof typeof PERSONAS

interface Result {
  response: LabResponse
  action: 'admin' | 'profile'
  persona: Persona
}

export function AccessControlDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [persona, setPersona] = useState<Persona>('alice')
  const [body, setBody] = useState('{"display_name": "Ally"}')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const call = async (action: Result['action']) => {
    setBusy(true)
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${PERSONAS[persona].token}` }
      if (action === 'profile') headers['Content-Type'] = 'application/json'
      const response =
        action === 'admin'
          ? await labRequest(LAB, mode, { method: 'GET', path: 'admin/users', headers })
          : await labRequest(LAB, mode, { method: 'PATCH', path: 'profile', headers, body })
      setResult({ response, action, persona })
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const data = result ? (tryJson(result.response.body) as { role?: string } | undefined) : undefined
  const status = result?.response.status
  const leaked = result?.action === 'admin' && result.persona !== 'admin' && status === 200
  const escalated = result?.action === 'profile' && result.persona !== 'admin' && status === 200 && data?.role === 'admin'
  const denied = status === 403 || status === 400

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <div>
          <span className="mb-1.5 block text-xs text-zinc-500">{t('idor.as')}</span>
          <div className="inline-flex rounded-lg border border-zinc-700 p-0.5" role="radiogroup">
            {(Object.keys(PERSONAS) as Persona[]).map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={persona === p}
                onClick={() => setPersona(p)}
                data-testid={`bac-persona-${p}`}
                className={cn(
                  'cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium',
                  persona === p ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
                )}
              >
                {PERSONAS[p].label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" onClick={() => call('admin')} disabled={busy} data-testid="bac-admin">
          {t('bac.admin')}
        </Button>
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">{t('bac.body')}</span>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-testid="bac-body"
              spellCheck={false}
            />
          </label>
          <Button onClick={() => call('profile')} disabled={busy} data-testid="bac-profile">
            {t('bac.profile')}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">{t('bac.hint')}</p>
      </Card>

      <Card className="space-y-3 p-4" aria-live="polite">
        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={result.response.status} data-testid="bac-status" />
              {leaked && <Badge tone="red" data-testid="bac-leak">{t('bac.leak')}</Badge>}
              {escalated && <Badge tone="red" data-testid="bac-escalated">{t('bac.escalated')}</Badge>}
              {denied && <Badge tone="green">{t('bac.denied')}</Badge>}
            </div>
            <CodeBlock className="max-h-80 whitespace-pre-wrap break-words" data-testid="bac-result">
              {JSON.stringify(tryJson(result.response.body) ?? result.response.body, null, 2)}
            </CodeBlock>
          </>
        )}
      </Card>
    </div>
  )
}
