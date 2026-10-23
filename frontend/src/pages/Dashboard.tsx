import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FlaskConical, ListChecks, ServerOff } from 'lucide-react'
import { Badge, Button, Card, DifficultyBadge, ErrorBox, Inline, Spinner, StatusBadge, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { api, type LabSummary, type ProgressData } from '../services/api'

function Stat({ icon: Icon, label, value, hint, testid }: { icon: typeof FlaskConical; label: string; value: string; hint: string; testid: string }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <div className="rounded-lg bg-zinc-800 p-2.5 text-emerald-400">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-2xl font-semibold tracking-tight" data-testid={testid}>
          {value}
        </p>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
    </Card>
  )
}

function LabCard({ lab }: { lab: LabSummary }) {
  const { t } = useI18n()
  const { status } = lab.progress
  return (
    <Card
      className={cn('flex flex-col gap-3 p-5 transition-colors', lab.available ? 'hover:border-zinc-600' : 'opacity-60')}
      data-testid={`lab-card-${lab.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {lab.owasp && <Badge tone="violet">OWASP {lab.owasp}</Badge>}
        <DifficultyBadge difficulty={lab.difficulty} />
        <span className="ml-auto">{lab.available ? <StatusBadge status={status} /> : <Badge>{t('lab.soon')}</Badge>}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold tracking-tight">{lab.title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{lab.summary}</p>
      </div>
      {lab.available && (
        <Link to={`/labs/${lab.id}`} className="self-start" data-testid={`open-${lab.id}`}>
          <Button variant={status === 'not_started' ? 'primary' : 'secondary'} tabIndex={-1}>
            {status === 'completed' ? t('lab.review') : status === 'not_started' ? t('lab.open') : t('lab.continue')}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </Link>
      )}
    </Card>
  )
}

export function Dashboard() {
  const { t, lang } = useI18n()
  const [labs, setLabs] = useState<LabSummary[] | null>(null)
  const [online, setOnline] = useState(true)
  const [stats, setStats] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    Promise.all([api.labs(lang), api.progress(lang)]).then(
      ([list, progress]) => {
        setLabs(list.labs)
        setOnline(list.labs_online)
        setStats(progress)
      },
      (e: Error) => setError(e.message),
    )
  }, [lang])
  useEffect(load, [load])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!labs || !stats) return <Spinner />

  const available = labs.filter((l) => l.available)
  const planned = labs.filter((l) => !l.available)
  return (
    <div className="space-y-10">
      <section className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('dash.title')}</h1>
        <p className="text-zinc-400">{t('dash.subtitle')}</p>
      </section>

      {!online && (
        <Card className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4" role="alert">
          <ServerOff className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
          <div>
            <p className="text-sm font-medium text-amber-200">{t('offline.title')}</p>
            <p className="text-sm text-zinc-400">
              <Inline text={t('offline.body')} />
            </p>
          </div>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={FlaskConical}
          label={t('dash.stat.labs')}
          value={`${stats.labs_available}`}
          hint={t('dash.stat.labsHint', { n: new Set(available.map((l) => l.owasp)).size })}
          testid="stat-labs"
        />
        <Stat
          icon={CheckCircle2}
          label={t('dash.stat.completed')}
          value={`${stats.completed}`}
          hint={t('dash.stat.completedHint', { exploited: stats.exploited })}
          testid="stat-completed"
        />
        <Stat
          icon={ListChecks}
          label={t('dash.stat.checks')}
          value={`${stats.checks_passed}`}
          hint={t('dash.stat.checksHint', { run: stats.checks_run })}
          testid="stat-checks"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('dash.available')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {available.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </section>

      {planned.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-300">{t('dash.roadmap')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {planned.map((lab) => (
              <LabCard key={lab.id} lab={lab} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
