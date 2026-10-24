import { useState } from 'react'
import { CheckCircle2, CircleDashed, PlayCircle, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { useI18n } from '../i18n'
import { api, type Check, type LabProgress, type Mode, type VerifyResult } from '../services/api'
import { Badge, Button, Card, ErrorBox, IconTile, cn } from './ui'

function Verdict({ ok, pending, label }: { ok: boolean; pending?: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : pending ? CircleDashed : XCircle
  return (
    <div className={cn('flex items-center gap-3 p-4', ok ? 'bg-secondary-container' : 'bg-surface-highest')}>
      <Icon className={cn('size-5 shrink-0', ok ? 'text-on-secondary-container' : pending ? 'text-ink-subtle' : 'text-danger')} aria-hidden />
      <span className={cn('text-sm font-medium', ok ? 'text-on-secondary-container' : 'text-ink-muted')}>{label}</span>
    </div>
  )
}

function CheckTable({ mode, title, checks }: { mode: Mode; title: string; checks: Check[] }) {
  const { t } = useI18n()
  return (
    <Card surface="lowest" className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <IconTile icon={mode === 'fixed' ? ShieldCheck : ShieldAlert} tone={mode === 'fixed' ? 'green' : 'amber'} size="sm" />
        <h3 className="font-bold">{title}</h3>
      </div>
      <ul className="divide-y divide-line">
        {checks.map((check, index) => (
          <li
            key={`${check.mode}-${check.id}`}
            className="rise-in flex gap-3 px-5 py-4"
            style={{ animationDelay: `${index * 55}ms` }}
            data-testid="check-row"
            data-passed={check.passed}
          >
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" aria-label="passed" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="failed" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{check.title}</span>
                <Badge tone={check.kind === 'attack' ? 'red' : check.kind === 'defense' ? 'green' : 'neutral'}>{t(`kind.${check.kind}`)}</Badge>
              </div>
              <p className="mt-1 font-mono text-xs break-words text-ink-subtle">{check.evidence}</p>
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
  const allPass = result?.vulnerability_confirmed && result.fix_confirmed
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="max-w-xl text-sm leading-relaxed text-ink-muted">{t('verify.intro')}</p>
        <Button variant="primary" onClick={run} loading={running} data-testid="verify-run">
          {!running && <PlayCircle className="size-4" aria-hidden />} {running ? t('verify.running') : t('verify.run')}
        </Button>
      </Card>
      {error && <ErrorBox message={error} onRetry={run} />}
      {result && (
        <>
          <Card
            className="glow relative space-y-6 overflow-hidden p-6 sm:p-8"
            style={{ ['--glow' as string]: allPass ? 'var(--secondary-fill)' : 'var(--danger-fill)' }}
            data-testid="verify-summary"
          >
            <div className="relative space-y-3">
              {result.completed ? (
                <Badge tone="green">{t('verify.completed')}</Badge>
              ) : (
                <Badge tone={allPass ? 'amber' : 'red'}>{allPass ? t('verify.badgePass') : t('verify.badgeFail')}</Badge>
              )}
              <p className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                <span className={allPass ? 'text-secondary' : 'text-danger'}>{t('verify.passed', { passed: result.passed, total: result.total })}</span>
              </p>
              {!result.completed && <p className="max-w-2xl text-sm text-ink-muted">{allPass ? t('verify.needSteps') : t('verify.failed')}</p>}
            </div>
            <div className="relative grid gap-2 sm:grid-cols-2">
              <Verdict ok={result.vulnerability_confirmed} label={t('verify.vuln')} />
              <Verdict ok={result.fix_confirmed} label={t('verify.fix')} />
              <Verdict ok={result.exploited_by_you} pending label={t('verify.you')} />
              <Verdict ok={result.defended_by_you} pending label={t('verify.defended')} />
            </div>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <CheckTable mode="vulnerable" title={t('verify.modeVulnerable')} checks={byMode('vulnerable')} />
            <CheckTable mode="fixed" title={t('verify.modeFixed')} checks={byMode('fixed')} />
          </div>
        </>
      )}
    </div>
  )
}
