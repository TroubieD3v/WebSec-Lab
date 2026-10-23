import { useState } from 'react'
import { CheckCircle2, CircleDashed, PlayCircle, XCircle } from 'lucide-react'
import { useI18n } from '../i18n'
import { api, type Check, type LabProgress, type Mode, type VerifyResult } from '../services/api'
import { Badge, Button, Card, ErrorBox, cn } from './ui'

function Verdict({ ok, pending, label }: { ok: boolean; pending?: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : pending ? CircleDashed : XCircle
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={cn('size-5', ok ? 'text-emerald-400' : pending ? 'text-zinc-500' : 'text-rose-400')} aria-hidden />
      <span className={ok ? 'text-zinc-100' : 'text-zinc-400'}>{label}</span>
    </div>
  )
}

function CheckTable({ title, checks }: { title: string; checks: Check[] }) {
  const { t } = useI18n()
  return (
    <Card className="overflow-hidden">
      <h3 className="border-b border-zinc-800 px-4 py-2.5 text-sm font-semibold">{title}</h3>
      <ul className="divide-y divide-zinc-800/80">
        {checks.map((check, index) => (
          <li
            key={`${check.mode}-${check.id}`}
            className="rise-in flex gap-3 px-4 py-3"
            style={{ animationDelay: `${index * 55}ms` }}
            data-testid="check-row"
            data-passed={check.passed}
          >
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-label="passed" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-label="failed" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{check.title}</span>
                <Badge tone={check.kind === 'attack' ? 'red' : check.kind === 'defense' ? 'green' : 'neutral'}>
                  {t(`kind.${check.kind}`)}
                </Badge>
              </div>
              <p className="mt-0.5 break-words font-mono text-xs text-zinc-500">{check.evidence}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

interface Props {
  labId: string
  onProgress: (progress: LabProgress) => void
}

export function VerifyPanel({ labId, onProgress }: Props) {
  const { t, lang } = useI18n()
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const data = await api.verify(labId, lang)
      setResult(data)
      onProgress(data.progress)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const byMode = (mode: Mode) => result?.checks.filter((c) => c.mode === mode) ?? []
  const allPass = result && result.vulnerability_confirmed && result.fix_confirmed
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <p className="max-w-xl text-sm text-zinc-400">{t('verify.intro')}</p>
        <Button variant="primary" onClick={run} loading={running} data-testid="verify-run">
          {!running && <PlayCircle className="size-4" aria-hidden />} {running ? t('verify.running') : t('verify.run')}
        </Button>
      </Card>
      {error && <ErrorBox message={error} onRetry={run} />}
      {result && (
        <>
          <Card className="space-y-3 p-4" data-testid="verify-summary">
            <div className="grid gap-2 sm:grid-cols-2">
              <Verdict ok={result.vulnerability_confirmed} label={t('verify.vuln')} />
              <Verdict ok={result.fix_confirmed} label={t('verify.fix')} />
              <Verdict ok={result.exploited_by_you} pending label={t('verify.you')} />
              <Verdict ok={result.defended_by_you} pending label={t('verify.defended')} />
            </div>
            <p className="text-sm text-zinc-400">{t('verify.passed', { passed: result.passed, total: result.total })}</p>
            {result.completed && <p className="text-sm font-medium text-emerald-300">{t('verify.completed')}</p>}
            {allPass && !result.completed && <p className="text-sm text-amber-300">{t('verify.needSteps')}</p>}
            {!allPass && <p className="text-sm text-rose-300">{t('verify.failed')}</p>}
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <CheckTable title={t('verify.modeVulnerable')} checks={byMode('vulnerable')} />
            <CheckTable title={t('verify.modeFixed')} checks={byMode('fixed')} />
          </div>
        </>
      )}
    </div>
  )
}
