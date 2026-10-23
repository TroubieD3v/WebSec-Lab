import { useCallback, useEffect, useState } from 'react'
import { Award, Lock } from 'lucide-react'
import { Button, ErrorBox, Spinner, cn } from '../components/ui'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/en'
import { api, type ProgressData } from '../services/api'

export function ProgressPage() {
  const { t, lang } = useI18n()
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    api.progress(lang).then(setData, (e: Error) => setError(e.message))
  }, [lang])
  useEffect(load, [load])

  const reset = async () => {
    if (!window.confirm(t('progress.resetConfirm'))) return
    await api.resetProgress()
    load()
  }

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!data) return <Spinner />

  const summary = [
    { label: t('dash.stat.completed'), value: `${data.completed} / ${data.labs_available}` },
    { label: t('progress.stat.exploited'), value: data.exploited },
    { label: t('progress.stat.defended'), value: data.defended },
    { label: t('dash.stat.checks'), value: `${data.checks_passed} / ${data.checks_run}` },
    { label: t('progress.stat.hints'), value: data.hints_used },
  ]
  // Event dots reuse the step colours: amber = you broke it, glacier = the fix held.
  const dot: Record<string, string> = {
    exploit_detected: 'bg-amber-400',
    defense_observed: 'bg-emerald-400',
    fix_verified: 'bg-zinc-100',
    completed: 'bg-emerald-300',
  }
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{t('progress.title')}</h1>
        <Button variant="ghost" onClick={reset} data-testid="reset-progress">
          {t('progress.reset')}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map((item) => (
          <div key={item.label}>
            <dt className="text-sm text-zinc-500">{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('progress.achievements')}</h2>
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {data.achievements.map((a) => (
            <li
              key={a.id}
              className={cn('flex gap-3 transition-opacity', !a.unlocked && 'opacity-45')}
              data-testid={`achievement-${a.id}`}
              data-unlocked={a.unlocked}
            >
              {a.unlocked ? (
                <Award className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <Lock className="mt-0.5 size-5 shrink-0 text-zinc-600" aria-hidden />
              )}
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-zinc-500">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('progress.history')}</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('progress.empty')}</p>
        ) : (
          <ol className="divide-y divide-zinc-900">
            {data.history.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <span className={cn('size-2 shrink-0 rounded-full', dot[event.kind] ?? 'bg-zinc-600')} aria-hidden />
                <span className="text-zinc-200">{t(`event.${event.kind}` as Key)}</span>
                <span className="text-zinc-500">{event.lab_title}</span>
                <time className="ml-auto text-xs text-zinc-600 tabular-nums" dateTime={event.at}>
                  {new Date(event.at).toLocaleString(lang)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
