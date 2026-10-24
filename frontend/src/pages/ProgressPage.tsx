import { useCallback, useEffect, useState } from 'react'
import { Award, Lock, RotateCcw } from 'lucide-react'
import { Button, Card, ErrorBox, IconTile, Spinner, StatTile, cn } from '../components/ui'
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

  // Event markers reuse the step colours: tertiary = you broke it, secondary = the fix held.
  const dot: Record<string, string> = {
    exploit_detected: 'bg-tertiary-fill',
    defense_observed: 'bg-secondary-fill',
    fix_verified: 'bg-primary',
    completed: 'bg-secondary-fill',
  }
  const unlocked = data.achievements.filter((a) => a.unlocked).length
  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="max-w-2xl">
          <h1 className="text-5xl leading-none font-semibold tracking-[-0.04em] sm:text-6xl">{t('progress.title')}</h1>
          <p className="mt-5 text-lg text-ink-muted">
            <span className="font-bold text-secondary tabular-nums">
              {data.completed} / {data.labs_available}
            </span>{' '}
            {t('dash.completedOf.after').trim()}
          </p>
        </div>
        <Button variant="outlined" onClick={reset} data-testid="reset-progress">
          <RotateCcw className="size-4" aria-hidden /> {t('progress.reset')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label={t('dash.stat.completed')} value={`${data.completed}/${data.labs_available}`} accent="green" />
        <StatTile label={t('progress.stat.exploited')} value={data.exploited} accent="amber" />
        <StatTile label={t('progress.stat.defended')} value={data.defended} accent="green" />
        <StatTile label={t('dash.stat.checks')} value={`${data.checks_passed}/${data.checks_run}`} />
        <StatTile label={t('progress.stat.hints')} value={data.hints_used} />
      </div>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{t('progress.achievements')}</h2>
          <p className="text-sm text-ink-subtle tabular-nums">
            {unlocked}/{data.achievements.length}
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.achievements.map((a) => (
            <li key={a.id} data-testid={`achievement-${a.id}`} data-unlocked={a.unlocked}>
              <Card className={cn('flex h-full gap-4 p-5', a.unlocked && 'bg-surface')}>
                <IconTile icon={a.unlocked ? Award : Lock} tone={a.unlocked ? 'green' : 'neutral'} />
                <div className="min-w-0">
                  {/* Locked items are muted with colour, not opacity, so their text keeps AA contrast. */}
                  <p className={cn('font-headline font-bold', a.unlocked ? 'text-ink' : 'text-ink-muted')}>{a.title}</p>
                  <p className="mt-1 text-sm text-ink-subtle">{a.description}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('progress.history')}</h2>
        {data.history.length === 0 ? (
          <Card className="p-6 text-sm text-ink-subtle">{t('progress.empty')}</Card>
        ) : (
          <Card surface="lowest" className="overflow-hidden">
            <ol className="divide-y divide-line">
              {data.history.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-sm sm:px-6">
                  <span className={cn('size-2.5 shrink-0', dot[event.kind] ?? 'bg-line-strong')} aria-hidden />
                  <span className="font-medium text-ink">{t(`event.${event.kind}` as Key)}</span>
                  <span className="text-ink-subtle">{event.lab_title}</span>
                  <time className="ml-auto text-xs text-ink-subtle tabular-nums" dateTime={event.at}>
                    {new Date(event.at).toLocaleString(lang)}
                  </time>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </section>
    </div>
  )
}
