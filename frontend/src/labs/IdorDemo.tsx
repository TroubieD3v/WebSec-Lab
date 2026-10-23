import { useState } from 'react'
import { Badge, Button, Card, CodeBlock, StatusChip, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson, type LabResponse } from '../services/api'
import type { DemoProps } from './types'

const PERSONAS = {
  alice: { label: 'Alice', token: 'alice-demo-token' },
  bob: { label: 'Bob', token: 'bob-demo-token' },
} as const
type Persona = keyof typeof PERSONAS

export function IdorDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [persona, setPersona] = useState<Persona>('alice')
  const [bookingId, setBookingId] = useState('101')
  const [last, setLast] = useState<{ response: LabResponse; persona: Persona } | null>(null)
  const [loading, setLoading] = useState(false)

  const call = async (path: string) => {
    setLoading(true)
    try {
      const response = await labRequest('idor', mode, {
        method: 'GET',
        path,
        headers: { Authorization: `Bearer ${PERSONAS[persona].token}` },
      })
      setLast({ response, persona })
      onActivity()
    } finally {
      setLoading(false)
    }
  }

  const data = last ? (tryJson(last.response.body) as { owner?: string } | undefined) : undefined
  const leaked = last && last.response.status === 200 && data?.owner && data.owner !== last.persona
  const denied = last && last.response.status === 403

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
                data-testid={`persona-${p}`}
                className={cn(
                  'cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium',
                  persona === p ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
                )}
              >
                {PERSONAS[p].label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            Authorization: Bearer {PERSONAS[persona].token}
          </p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">{t('idor.id')}</span>
          <input
            className="w-40 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            inputMode="numeric"
            data-testid="idor-id"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={loading} onClick={() => call(`bookings/${encodeURIComponent(bookingId)}`)} data-testid="idor-open">
            {t('idor.open')}
          </Button>
          <Button onClick={() => call('bookings')} disabled={loading}>
            {t('idor.mine')}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">{t('idor.hint')}</p>
      </Card>

      <Card className="space-y-3 p-4" aria-live="polite">
        {last && (
          <>
            <div className="flex items-center gap-2">
              <StatusChip status={last.response.status} data-testid="idor-status" />
              {leaked && (
                <Badge tone="red" data-testid="idor-leak">
                  {t('idor.leak', { owner: data?.owner ?? '' })}
                </Badge>
              )}
              {denied && <Badge tone="green">{t('idor.denied')}</Badge>}
            </div>
            <CodeBlock className="whitespace-pre-wrap break-words" data-testid="idor-body">
              {JSON.stringify(tryJson(last.response.body) ?? last.response.body, null, 2)}
            </CodeBlock>
          </>
        )}
      </Card>
    </div>
  )
}
