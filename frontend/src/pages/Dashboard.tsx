import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CodeXml, ServerOff, Trophy } from 'lucide-react'
import { Badge, Card, DifficultyBadge, ErrorBox, Eyebrow, IconTile, Inline, ProgressBar, Spinner, StatTile, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { LAB_ICONS } from '../labs/icons'
import { api, type LabProgress, type LabSummary, type ProgressData } from '../services/api'

type StepKind = 'exploit' | 'defend' | 'verify'
const STEP_FILL: Record<StepKind, string> = {
  exploit: 'bg-tertiary-fill',
  defend: 'bg-secondary-fill',
  verify: 'bg-primary',
}

/** Three short bars: exploited (tertiary), the fix held (secondary), verified (primary). */
function StepBars({ progress, delay }: { progress: LabProgress; delay: number }) {
  const { t } = useI18n()
  const steps: [StepKind, boolean][] = [
    ['exploit', progress.exploited],
    ['defend', progress.defended],
    ['verify', progress.fix_verified],
  ]
  const label = steps.map(([kind, done]) => `${t(`pip.${kind}`)}: ${done ? t('pip.yes') : t('pip.no')}`).join('; ')
  return (
    <span className="flex flex-1 gap-1.5" role="img" aria-label={label}>
      {steps.map(([kind, done], i) => (
        <span key={kind} className="h-1.5 flex-1 bg-surface-highest" aria-hidden>
          {done && <span className={cn('bar-fill block h-full', STEP_FILL[kind])} style={{ animationDelay: `${delay + i * 90}ms` }} />}
        </span>
      ))}
    </span>
  )
}

function LabCard({ lab, delay }: { lab: LabSummary; delay: number }) {
  const { t } = useI18n()
  const done = lab.progress.completed
  return (
    <li data-testid={`lab-card-${lab.id}`} className="min-w-0">
      <Link
        to={`/labs/${lab.id}`}
        data-testid={`open-${lab.id}`}
        className="card group flex h-full flex-col bg-surface-low p-6 transition-colors duration-200 hover:bg-surface"
      >
        <span className="flex items-start justify-between gap-3">
          <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone={done ? 'green' : 'neutral'} />
          <DifficultyBadge difficulty={lab.difficulty} />
        </span>
        <span className="mt-6 font-headline text-lg font-bold tracking-tight text-ink">{lab.title}</span>
        <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{lab.summary}</span>
        <span className="mt-auto flex items-center gap-4 pt-6">
          <StepBars progress={lab.progress} delay={delay} />
          <span className={cn('text-xs font-semibold', done ? 'text-secondary' : 'text-ink-subtle')}>
            {done ? t('status.completed') : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
          </span>
        </span>
      </Link>
    </li>
  )
}

/** Concentric rings: outer = labs completed (secondary), inner = labs exploited (tertiary). */
function Dial({ completed, exploited, total }: { completed: number; exploited: number; total: number }) {
  const { t } = useI18n()
  const ring = (r: number) => 2 * Math.PI * r
  const outer = ring(44)
  const inner = ring(33)
  const frac = (n: number) => (total ? n / total : 0)
  return (
    <div className="relative mx-auto grid size-60 place-items-center sm:size-64">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="6" className="stroke-surface-highest" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="dial-draw stroke-secondary-fill"
          style={{ strokeDasharray: outer, strokeDashoffset: outer * (1 - frac(completed)), ['--dial-length' as string]: outer }}
        />
        <circle cx="50" cy="50" r="33" fill="none" strokeWidth="7" className="stroke-surface-high" />
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="dial-draw stroke-tertiary-fill"
          style={{ strokeDasharray: inner, strokeDashoffset: inner * (1 - frac(exploited)), ['--dial-length' as string]: inner, animationDelay: '150ms' }}
        />
      </svg>
      <div className="text-center">
        <p className="font-headline text-5xl font-bold tracking-tight tabular-nums">
          <span data-testid="stat-completed">{completed}</span>
          <span className="text-ink-subtle">/</span>
          <span data-testid="stat-labs">{total}</span>
        </p>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">{t('dash.dial')}</p>
      </div>
    </div>
  )
}

function NextUp({ lab }: { lab: LabSummary | undefined }) {
  const { t } = useI18n()
  if (!lab) {
    return (
      <Card surface="lowest" className="glow relative flex flex-col justify-between gap-6 overflow-hidden p-8">
        <IconTile icon={Trophy} tone="green" size="lg" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight">{t('status.completed')}</h2>
          <p className="mt-2 max-w-md text-ink-muted">{t('dash.allDone')}</p>
        </div>
      </Card>
    )
  }
  const started = lab.progress.exploited || lab.progress.defended
  return (
    <Card
      surface="lowest"
      className="glow relative flex flex-col gap-6 overflow-hidden p-8"
      style={{ ['--glow' as string]: 'var(--tertiary-fill)' }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow className="mb-4">{t('dash.next')}</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-balance">{lab.title}</h2>
          <p className="mt-2 max-w-lg text-ink-muted">{started ? lab.summary : t('dash.nextStart')}</p>
        </div>
        <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone="amber" size="lg" />
      </div>
      <div className="relative mt-auto flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link
          to={`/labs/${lab.id}`}
          className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          {started ? t('lab.continue') : t('lab.open')} <ArrowRight className="size-4" aria-hidden />
        </Link>
        <span className="flex flex-wrap items-center gap-2 text-sm text-ink-subtle">
          <Badge tone="neutral">{lab.owasp}</Badge> {lab.owasp_name}
        </span>
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
    <div className="space-y-16">
      <section className="max-w-3xl pt-2">
        <Badge tone="green" className="mb-5 tracking-wide">
          {t('dash.badge')}
        </Badge>
        <h1 className="text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-6xl">{t('dash.title')}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">{t('dash.subtitle')}</p>
      </section>

      {!online && (
        <div className="card flex max-w-3xl items-start gap-4 bg-tertiary-container p-5 text-on-tertiary-container" role="alert">
          <ServerOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t('offline.title')}</p>
            <p className="text-sm">
              <Inline text={t('offline.body')} />
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="space-y-8 p-8 lg:col-span-5">
          <Dial completed={stats.completed} exploited={count('exploited')} total={stats.labs_available} />
          <section className="space-y-4" aria-label={t('dash.steps')}>
            {totals.map(({ kind, n, tone }) => (
              <div key={kind} className="space-y-1.5">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-ink-muted">{t(`pip.${kind}.long`)}</span>
                  <span className="font-headline font-bold tabular-nums">
                    {n}/{labs.length}
                  </span>
                </div>
                <ProgressBar value={n / labs.length} tone={tone === 'primary' ? 'primary' : tone} label={t(`pip.${kind}.long`)} />
              </div>
            ))}
          </section>
        </Card>
        <div className="grid gap-6 lg:col-span-7">
          <NextUp lab={next} />
          <div className="grid grid-cols-2 gap-4">
            <StatTile label={t('progress.stat.exploited')} value={stats.exploited} accent="amber" />
            <StatTile label={t('progress.stat.defended')} value={stats.defended} accent="green" />
            <StatTile label={t('dash.stat.checks')} value={`${stats.checks_passed}/${stats.checks_run}`} />
            <StatTile label={t('progress.stat.hints')} value={stats.hints_used} />
          </div>
        </div>
      </section>

      <div className="space-y-14">
        {[...groups.entries()].map(([code, group]) => (
          <section key={code} aria-labelledby={`cat-${code}`} className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id={`cat-${code}`} className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <Badge tone="neutral" className="font-mono">
                  {code}
                </Badge>
                {group.name}
              </h2>
              <p className="text-sm text-ink-subtle">
                {group.labs.filter((l) => l.progress.completed).length}/{group.labs.length} {t('status.completed').toLowerCase()}
              </p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.labs.map((lab) => {
                const delay = 250 + order++ * 70
                return <LabCard key={lab.id} lab={lab} delay={delay} />
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
