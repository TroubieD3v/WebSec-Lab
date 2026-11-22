import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Circle, CircleCheck, CircleDot, CodeXml, ServerOff, Trophy } from 'lucide-react'
import { Badge, Card, DifficultyBadge, ErrorBox, IconTile, Inline, ProgressBar, Spinner, StatTile, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { LAB_ICONS } from '../labs/icons'
import { api, type LabProgress, type LabSummary, type ProgressData } from '../services/api'

type StepKind = 'exploit' | 'defend' | 'verify'
const STEP_FILL: Record<StepKind, string> = {
  exploit: 'bg-tertiary-fill',
  defend: 'bg-secondary-fill',
  verify: 'bg-primary',
}

/** Three short segments: exploited (tertiary), the fix held (secondary), verified (primary). */
function StepBars({ progress, delay }: { progress: LabProgress; delay: number }) {
  const { t } = useI18n()
  const steps: [StepKind, boolean][] = [
    ['exploit', progress.exploited],
    ['defend', progress.defended],
    ['verify', progress.fix_verified],
  ]
  const label = steps.map(([kind, done]) => `${t(`pip.${kind}`)}: ${done ? t('pip.yes') : t('pip.no')}`).join('; ')
  return (
    <span className="flex w-20 gap-1" role="img" aria-label={label}>
      {steps.map(([kind, done], i) => (
        <span key={kind} className="h-1.5 flex-1 rounded-[1px] bg-surface-highest" aria-hidden>
          {done && <span className={cn('bar-fill block h-full rounded-[1px]', STEP_FILL[kind])} style={{ animationDelay: `${delay + i * 90}ms` }} />}
        </span>
      ))}
    </span>
  )
}

function LabRow({ lab, delay }: { lab: LabSummary; delay: number }) {
  const { t } = useI18n()
  const done = lab.progress.completed
  const started = lab.progress.exploited || lab.progress.defended
  return (
    <li data-testid={`lab-card-${lab.id}`} className="min-w-0 border-b border-line last:border-b-0">
      <Link
        to={`/labs/${lab.id}`}
        data-testid={`open-${lab.id}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors hover:bg-surface sm:grid-cols-[auto_minmax(0,1fr)_88px_88px_120px]"
      >
        <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone={done ? 'green' : 'neutral'} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink group-hover:underline">{lab.title}</span>
          <span className="block truncate text-[13px] text-ink-subtle">{lab.summary}</span>
        </span>
        <span className="hidden sm:block">
          <DifficultyBadge difficulty={lab.difficulty} />
        </span>
        <span className="hidden sm:block">
          <StepBars progress={lab.progress} delay={delay} />
        </span>
        <span className={cn('flex items-center justify-end gap-1.5 text-[13px]', done ? 'text-secondary' : started ? 'text-tertiary' : 'text-ink-subtle')}>
          {done ? <CircleCheck className="size-3.5" aria-hidden /> : started ? <CircleDot className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
          {t(`status.${lab.progress.status}`)}
        </span>
      </Link>
    </li>
  )
}

function NextUp({ lab }: { lab: LabSummary | undefined }) {
  const { t } = useI18n()
  if (!lab) {
    return (
      <Card className="overflow-hidden">
        <div className="panel-head">
          <Trophy className="size-4 text-secondary" aria-hidden /> {t('status.completed')}
        </div>
        <p className="p-3 text-sm text-ink-muted">{t('dash.allDone')}</p>
      </Card>
    )
  }
  const started = lab.progress.exploited || lab.progress.defended
  return (
    <Card className="overflow-hidden">
      <div className="panel-head">{t('dash.next')}</div>
      <div className="space-y-3 p-3">
        <div className="flex items-start gap-3">
          <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone="amber" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-balance">{lab.title}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
              <Badge tone="neutral" className="font-mono">
                {lab.owasp}
              </Badge>
              {lab.owasp_name}
            </p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted">{started ? lab.summary : t('dash.nextStart')}</p>
        <Link
          to={`/labs/${lab.id}`}
          className="inline-flex items-center gap-1.5 rounded-[3px] bg-primary px-3 py-1.5 text-[13px] font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          {started ? t('lab.continue') : t('lab.open')} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
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

  // Group by OWASP category, in category order.
  const sorted = [...labs].sort((a, b) => a.owasp.localeCompare(b.owasp))
  const groups = new Map<string, { name: string; labs: LabSummary[] }>()
  for (const lab of sorted) {
    const group = groups.get(lab.owasp) ?? { name: lab.owasp_name, labs: [] }
    group.labs.push(lab)
    groups.set(lab.owasp, group)
  }
  const count = (key: keyof Pick<LabProgress, 'exploited' | 'defended' | 'fix_verified'>) => labs.filter((l) => l.progress[key]).length
  // Next up: a lab already in progress, otherwise the first one not started.
  const next =
    sorted.find((l) => !l.progress.completed && (l.progress.exploited || l.progress.defended)) ?? sorted.find((l) => !l.progress.completed)
  let order = 0 // drives the staggered fill of earned step bars

  const totals: { kind: StepKind; n: number; tone: 'amber' | 'green' | 'primary' }[] = [
    { kind: 'exploit', n: count('exploited'), tone: 'amber' },
    { kind: 'defend', n: count('defended'), tone: 'green' },
    { kind: 'verify', n: count('fix_verified'), tone: 'primary' },
  ]

  return (
    <div className="space-y-5">
      <section className="max-w-3xl">
        <Badge tone="neutral" className="mb-2 font-mono">
          {t('dash.badge')}
        </Badge>
        <h1 className="text-[24px] leading-tight font-semibold text-balance">{t('dash.title')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-muted">{t('dash.subtitle')}</p>
      </section>

      {!online && (
        <div className="card flex max-w-3xl items-start gap-3 border-tertiary/40 bg-tertiary-container px-4 py-3 text-on-tertiary-container" role="alert">
          <ServerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t('offline.title')}</p>
            <p className="text-sm">
              <Inline text={t('offline.body')} />
            </p>
          </div>
        </div>
      )}

      <section className="card grid gap-px overflow-hidden bg-line sm:grid-cols-[200px_repeat(3,minmax(0,1fr))]" aria-label={t('dash.steps')}>
        <div className="bg-surface-low px-4 py-3">
          <p className="font-mono text-[26px] leading-none font-medium tabular-nums">
            <span data-testid="stat-completed">{stats.completed}</span>
            <span className="text-ink-subtle">/</span>
            <span data-testid="stat-labs">{stats.labs_available}</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-subtle">{t('dash.dial')}</p>
        </div>
        {totals.map(({ kind, n, tone }) => (
          <div key={kind} className="space-y-2 bg-surface-low px-4 py-3">
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-ink-muted">{t(`pip.${kind}.long`)}</span>
              <span className="font-mono tabular-nums">
                {n}/{labs.length}
              </span>
            </div>
            <ProgressBar value={n / labs.length} tone={tone === 'primary' ? 'primary' : tone} label={t(`pip.${kind}.long`)} />
          </div>
        ))}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {[...groups.entries()].map(([code, group]) => (
            <section key={code} aria-labelledby={`cat-${code}`} className="card overflow-hidden bg-surface-low">
              <div className="panel-head justify-between">
                <h2 id={`cat-${code}`} className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
                  <span className="font-mono text-ink-subtle">{code}</span>
                  <span className="truncate">{group.name}</span>
                </h2>
                <span className="shrink-0 font-mono text-xs font-normal text-ink-subtle">
                  {t('dash.solved', { done: group.labs.filter((l) => l.progress.completed).length, total: group.labs.length })}
                </span>
              </div>
              <ul>
                {group.labs.map((lab) => {
                  const delay = 250 + order++ * 70
                  return <LabRow key={lab.id} lab={lab} delay={delay} />
                })}
              </ul>
            </section>
          ))}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-16">
          <NextUp lab={next} />
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={t('progress.stat.exploited')} value={stats.exploited} accent="amber" />
            <StatTile label={t('progress.stat.defended')} value={stats.defended} accent="green" />
            <StatTile label={t('dash.stat.checks')} value={`${stats.checks_passed}/${stats.checks_run}`} />
            <StatTile label={t('progress.stat.hints')} value={stats.hints_used} />
          </div>
        </aside>
      </div>
    </div>
  )
}
