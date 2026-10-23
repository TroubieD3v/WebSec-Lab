import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, CodeBlock, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'csrf'
const JSON_HEADERS = { 'Content-Type': 'application/json' }
const field = 'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm'

interface Snapshot {
  bank_status: number
  bank_response: Record<string, unknown>
  ledger: Record<string, number>
}

export function CsrfDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [ledger, setLedger] = useState<Record<string, number> | null>(null)
  const [last, setLast] = useState<{ kind: 'bank' | 'attacker'; snap: Snapshot } | null>(null)
  const [to, setTo] = useState('bob')
  const [amount, setAmount] = useState('50')
  const [evilTo, setEvilTo] = useState('mallory')
  const [evilAmount, setEvilAmount] = useState('500')
  const [strip, setStrip] = useState(false)
  const [busy, setBusy] = useState(false)

  const call = useCallback(
    async (path: string, method: 'GET' | 'POST', body?: unknown) => {
      const r = await labRequest(LAB, mode, { method, path, headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined })
      return tryJson(r.body) as Snapshot
    },
    [mode],
  )

  const refresh = useCallback(() => call('browser/account', 'GET').then((s) => setLedger(s.ledger)), [call])
  useEffect(() => void refresh(), [refresh])

  const run = async (kind: 'bank' | 'attacker') => {
    setBusy(true)
    try {
      const snap =
        kind === 'bank'
          ? await call('browser/transfer', 'POST', { to, amount: Number(amount) })
          : await call('browser/visit-attacker-page', 'POST', { to: evilTo, amount: Number(evilAmount), strip_headers: strip })
      setLast({ kind, snap })
      setLedger(snap.ledger)
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setBusy(true)
    try {
      await labRequest(LAB, mode, { method: 'POST', path: 'browser/reset' })
      setLast(null)
      await refresh()
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const attackerHtml = `<!-- https://evil.example/free-gift.html -->\n<form id="f" method="POST"\n      action="https://bank.example/transfer">\n  <input type="hidden" name="to" value="${evilTo}">\n  <input type="hidden" name="amount" value="${evilAmount}">\n</form>\n<script>document.getElementById('f').submit()</script>`
  const moved = last?.kind === 'attacker' && last.snap.bank_status === 200
  const blocked = last?.kind === 'attacker' && last.snap.bank_status === 403
  const detail = last ? String((last.snap.bank_response as { detail?: string }).detail ?? '') : ''

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">{t('csrf.bank')}</h3>
        <table className="w-full text-left text-sm" data-testid="csrf-ledger">
          <tbody className="divide-y divide-zinc-800">
            {Object.entries(ledger ?? {}).map(([name, balance]) => (
              <tr key={name}>
                <td className="py-1.5 capitalize">{name}</td>
                <td className="py-1.5 text-right font-mono" data-testid={`csrf-balance-${name}`}>{balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-2">
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('csrf.to')}</span>
            <select className={field} value={to} onChange={(e) => setTo(e.target.value)} data-testid="csrf-to">
              <option>bob</option>
              <option>mallory</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('csrf.amount')}</span>
            <input className={`${field} w-24`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" data-testid="csrf-amount" />
          </label>
          <Button variant="primary" onClick={() => run('bank')} disabled={busy} data-testid="csrf-transfer">
            {t('csrf.transfer')}
          </Button>
        </div>
        <Button variant="ghost" onClick={reset} disabled={busy} data-testid="csrf-reset">
          {t('csrf.reset')}
        </Button>
        <p className="text-xs text-zinc-500">{t('csrf.note')}</p>
      </Card>

      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold text-rose-300">{t('csrf.evil')}</h3>
        <CodeBlock className="whitespace-pre text-zinc-400">{attackerHtml}</CodeBlock>
        <div className="flex flex-wrap items-end gap-2">
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('csrf.to')}</span>
            <input className={`${field} w-32`} value={evilTo} onChange={(e) => setEvilTo(e.target.value)} data-testid="csrf-evil-to" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('csrf.amount')}</span>
            <input className={`${field} w-24`} value={evilAmount} onChange={(e) => setEvilAmount(e.target.value)} inputMode="numeric" data-testid="csrf-evil-amount" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} data-testid="csrf-strip" /> {t('csrf.strip')}
        </label>
        <Button variant="danger" onClick={() => run('attacker')} disabled={busy} data-testid="csrf-attack">
          {t('csrf.visit')}
        </Button>
        {last && (
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <StatusChip status={last.snap.bank_status} data-testid="csrf-status" />
            {moved && <Badge tone="red" data-testid="csrf-moved">{t('csrf.moved')}</Badge>}
            {blocked && <Badge tone="green" data-testid="csrf-blocked">{t('csrf.blocked', { reason: detail })}</Badge>}
          </div>
        )}
      </Card>
    </div>
  )
}
