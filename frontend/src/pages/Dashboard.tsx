import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ServerOff } from 'lucide-react'
import { ErrorBox, Inline, Spinner, cn } from '../components/ui'
import { useI18n } from '../i18n'
import { api, type LabProgress, type LabSummary, type ProgressData } from '../services/api'

type PipKind = 'exploit' | 'defend' | 'verify'
const PIP_FILL: Record<PipKind, string> = {
  exploit: 'bg-amber-400',
  defend: 'bg-emerald-400',
  verify: 'bg-zinc-100',
}

function Pip({ kind, done, delay }: { kind: PipKind; done: boolean; delay: number }) {
  return (
    <span className="grid size-2.5 place-items-center rounded-full border border-zinc-700" aria-hidden>
      {done && (
        <span className={cn('pip-fill size-2.5 rounded-full', PIP_FILL[kind])} style={{ animationDelay: `${delay}ms` }} />
      )}
    </span>
  )
}

function Pips({ progress, delay }: { progress: LabProgress; delay: number }) {
  const { t } = useI18n()
  const steps: [PipKind, boolean][] = [
    ['exploit', progress.exploited],
    ['defend', progress.defended],
    ['verify', progress.fix_verified],
  ]
  const label = steps.map(([kind, done]) => `${t(`pip.${kind}`)}: ${done ? t('pip.yes') : t('pip.no')}`).join('; ')
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={label}>
      {steps.map(([kind, done], i) => (
        <Pip key={kind} kind={kind} done={done} delay={delay + i * 90} />
      ))}
    </span>
  )
}

function LabRow({ lab, delay }: { lab: LabSummary; delay: number }) {
  const { t } = useI18n()
  return (
    <li data-testid={`lab-card-${lab.id}`}>
      <Link
        to={`/labs/${lab.id}`}
        data-testid={`open-${lab.id}`}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 rounded-lg px-3 py-3.5 transition-colors duration-200 hover:bg-zinc-900 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:px-4"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-medium text-zinc-100">
            {lab.title}
            {lab.progress.completed && <span className="text-xs font-normal text-emerald-300">{t('status.completed')}</span>}
          </span>
          <span className="mt-0.5 block truncate text-sm text-zinc-500 group-hover:text-zinc-400">{lab.summary}</span>
        </span>
        <span className="hidden text-sm text-zinc-500 sm:block">{t(`difficulty.${lab.difficulty}`)}</span>
        <Pips progress={lab.progress} delay={delay} />
      </Link>
    </li>
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
  const groups = new Map<string, { name: string; labs: LabSummary[] }>()
  for (const lab of [...labs].sort((a, b) => a.owasp.localeCompare(b.owasp))) {
    const group = groups.get(lab.owasp) ?? { name: lab.owasp_name, labs: [] }
    group.labs.push(lab)
    groups.set(lab.owasp, group)
  }
  let order = 0 // drives the staggered fill of earned pips

  return (
    <div className="space-y-14">
      <section className="max-w-2xl space-y-5 pt-4">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{t('dash.title')}</h1>
        <p className="text-lg leading-relaxed text-zinc-400">{t('dash.subtitle')}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400" aria-label={t('dash.legend')}>
          {(['exploit', 'defend', 'verify'] as PipKind[]).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', PIP_FILL[kind])} aria-hidden />
              {t(`pip.${kind}.long`)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-500">
          {t('dash.completedOf.before')}
          <span className="font-medium text-zinc-200 tabular-nums" data-testid="stat-completed">
            {stats.completed}
          </span>
          {t('dash.completedOf.middle')}
          <span className="font-medium text-zinc-200 tabular-nums" data-testid="stat-labs">
            {stats.labs_available}
          </span>
          {t('dash.completedOf.after')}
        </p>
      </section>

      {!online && (
        <div className="flex max-w-2xl items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4" role="alert">
          <ServerOff className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
          <div>
            <p className="text-sm font-medium text-amber-200">{t('offline.title')}</p>
            <p className="text-sm text-zinc-400">
              <Inline text={t('offline.body')} />
            </p>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {[...groups.entries()].map(([code, group]) => (
          <section key={code} aria-labelledby={`cat-${code}`}>
            <h2 id={`cat-${code}`} className="mb-2 flex items-baseline gap-3 px-3 text-sm sm:px-4">
              <span className="text-zinc-500 tabular-nums">{code}</span>
              <span className="font-medium text-zinc-300">{group.name}</span>
            </h2>
            <ul className="divide-y divide-zinc-900">
              {group.labs.map((lab) => {
                const delay = 250 + order++ * 70
                return <LabRow key={lab.id} lab={lab} delay={delay} />
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
