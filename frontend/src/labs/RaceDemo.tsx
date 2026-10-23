import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'race-condition'
const BURST = 10

interface Wallet {
  balance: number
  redemptions: number
}

export function RaceDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [statuses, setStatuses] = useState<number[] | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const r = await labRequest(LAB, mode, { method: 'GET', path: 'wallet' })
    setWallet(tryJson(r.body) as Wallet)
  }, [mode])
  useEffect(() => {
    setStatuses(null)
    void refresh()
  }, [refresh])

  const redeem = () =>
    labRequest(LAB, mode, {
      method: 'POST',
      path: 'redeem',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'WELCOME10' }),
    })

  const once = async () => {
    setBusy(true)
    try {
      setStatuses([(await redeem()).status])
      await refresh()
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const burst = async () => {
    setBusy(true)
    try {
      const responses = await Promise.all(Array.from({ length: BURST }, redeem))
      setStatuses(responses.map((r) => r.status))
      await refresh()
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setBusy(true)
    try {
      await labRequest(LAB, mode, { method: 'POST', path: 'wallet/reset' })
      setStatuses(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const ok = statuses?.filter((s) => s === 200).length ?? 0
  const refused = statuses?.filter((s) => s === 409).length ?? 0
  const exploited = (wallet?.redemptions ?? 0) > 1
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <p className="text-sm text-zinc-400">{t('race.intro')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={once} disabled={busy} data-testid="race-once">
            {t('race.once')}
          </Button>
          <Button variant="danger" onClick={burst} disabled={busy} data-testid="race-burst">
            {t('race.burst', { n: BURST })}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={busy} data-testid="race-reset">
            {t('race.reset')}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500">{t('race.balance')}</p>
            <p className="text-3xl font-semibold" data-testid="race-balance">{wallet?.balance ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">{t('race.redemptions')}</p>
            <p className="text-3xl font-semibold" data-testid="race-redemptions">{wallet?.redemptions ?? 0}</p>
          </div>
        </div>
        {statuses && (
          <p className="font-mono text-xs text-zinc-400" data-testid="race-statuses">
            {t('race.results', { ok, refused, total: statuses.length })}
          </p>
        )}
        {exploited && <Badge tone="red" data-testid="race-exploited">{t('race.exploited', { n: wallet?.redemptions ?? 0 })}</Badge>}
        {mode === 'fixed' && statuses && statuses.length > 1 && ok === 1 && (
          <Badge tone="green" data-testid="race-safe">{t('race.safe')}</Badge>
        )}
      </Card>
    </div>
  )
}
