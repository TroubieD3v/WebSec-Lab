import { useCallback, useEffect, useState } from 'react'
import { Award, Lock } from 'lucide-react'
import { Badge, Button, Card, ErrorBox, Spinner, cn } from '../components/ui'
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
    { label: t('dash.stat.checks'), value: `${data.checks_passed} / ${data.checks_run}` },
    { label: t('progress.stat.hints'), value: data.hints_used },
  ]
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('progress.title')}</h1>
        <Button variant="danger" onClick={reset} data-testid="reset-progress">
          {t('progress.reset')}
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="text-2xl font-semibold">{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('progress.achievements')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.achievements.map((a) => (
            <Card key={a.id} className={cn('p-4', !a.unlocked && 'opacity-50')} data-testid={`achievement-${a.id}`} data-unlocked={a.unlocked}>
              {a.unlocked ? <Award className="mb-2 size-5 text-amber-300" aria-hidden /> : <Lock className="mb-2 size-5 text-zinc-500" aria-hidden />}
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-zinc-500">{a.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('progress.history')}</h2>
        {data.history.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('progress.empty')}</p>
        ) : (
          <Card className="divide-y divide-zinc-800/80">
            {data.history.map((event, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <Badge>{event.lab_title}</Badge>
                <span>{t(`event.${event.kind}` as Key)}</span>
                <time className="ml-auto text-xs text-zinc-500" dateTime={event.at}>
                  {new Date(event.at).toLocaleString(lang)}
                </time>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
