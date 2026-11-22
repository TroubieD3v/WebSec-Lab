import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, CodeXml } from 'lucide-react'
import { CodeDiff } from '../components/CodeDiff'
import { HintsPanel } from '../components/HintsPanel'
import { LabProgressTracker } from '../components/LabProgressTracker'
import { LearnPanel } from '../components/LearnPanel'
import { ModeToggle } from '../components/ModeToggle'
import { Playground } from '../components/Playground'
import { VerifyPanel } from '../components/VerifyPanel'
import { Badge, Card, DifficultyBadge, ErrorBox, IconTile, Inline, Spinner, StatusBadge, cn } from '../components/ui'
import { DEMOS } from '../labs'
import { LAB_ICONS } from '../labs/icons'
import { useI18n } from '../i18n'
import { api, type LabDetail, type LabProgress, type Mode } from '../services/api'

type Tab = 'try' | 'playground' | 'code' | 'hints' | 'verify' | 'learn'
const TABS: Tab[] = ['try', 'playground', 'code', 'hints', 'verify', 'learn']

export function LabPage() {
  const { id = '' } = useParams()
  const { t, lang } = useI18n()
  const [lab, setLab] = useState<LabDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('vulnerable')
  const [tab, setTab] = useState<Tab>('try')

  const load = useCallback(() => {
    setError(null)
    api.lab(id, lang).then(setLab, (e: Error) => setError(e.message))
  }, [id, lang])
  useEffect(load, [load])

  const setProgress = useCallback((progress: LabProgress) => setLab((l) => (l ? { ...l, progress } : l)), [])

  // Debounced: re-check whether the challenge has been solved after the learner interacts.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onActivity = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => api.status(id).then(setProgress, () => undefined), 200)
  }, [id, setProgress])
  useEffect(() => () => clearTimeout(timer.current), [])

  // The current mode is exposed on <html data-mode> for styles and tests.
  useEffect(() => {
    document.documentElement.dataset.mode = mode
    return () => {
      delete document.documentElement.dataset.mode
    }
  }, [mode])

  // A seal line sweeps across the header on every switch, but not on first load.
  const [sweep, setSweep] = useState(0)
  const changeMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setSweep((n) => n + 1)
  }

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!lab) return <Spinner />

  const Demo = DEMOS[lab.id]
  const modeFill = mode === 'fixed' ? 'var(--secondary-fill)' : 'var(--tertiary-fill)'
  return (
    <div className="space-y-4">
      <nav aria-label={t('lab.back')} className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-subtle">
        <Link to="/" className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden /> {t('lab.back')}
        </Link>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        <span className="shrink-0 font-mono">{lab.owasp}</span>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate text-ink-muted">{lab.title}</span>
      </nav>

      <header className="relative pb-4">
        <div className="flex items-start gap-3">
          <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone={mode === 'fixed' ? 'green' : 'amber'} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="max-w-3xl text-[22px] leading-tight font-semibold text-balance">{lab.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-subtle">
              <Badge tone="neutral" className="font-mono">
                {lab.owasp}
              </Badge>
              <DifficultyBadge difficulty={lab.difficulty} />
              <span data-testid="lab-status">
                <StatusBadge status={lab.progress.status} />
              </span>
              <span className="ml-1">{lab.owasp_name}</span>
              <span className="font-mono">{lab.cwe.join(', ')}</span>
            </div>
          </div>
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" />
        {sweep > 0 && <span key={sweep} aria-hidden className="seal-sweep" style={{ ['--sweep-color' as string]: modeFill }} />}
      </header>

      <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden bg-surface-low">
          <div className="panel-head">{t('lab.task')}</div>
          <div className="space-y-4 p-4">
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink">
              <Inline text={lab.task} />
            </p>
            <LabProgressTracker progress={lab.progress} />
          </div>
        </Card>
        <Card className="flex flex-col overflow-hidden bg-surface-low">
          <div className="panel-head">{t('lab.mode.label')}</div>
          <div className="flex-1 p-3">
            <ModeToggle mode={mode} onChange={changeMode} />
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden bg-surface-low">
        <div className="flex items-stretch justify-between border-b border-line bg-chrome">
          <div className="flex max-w-full overflow-x-auto" role="tablist">
            {TABS.map((name) => (
              <button
                type="button"
                key={name}
                role="tab"
                aria-selected={tab === name}
                data-testid={`tab-${name}`}
                onClick={() => setTab(name)}
                className={cn(
                  '-mb-px cursor-pointer border-r border-b border-line border-t-2 px-3.5 py-2 text-[13px] whitespace-nowrap transition-colors',
                  tab === name ? 'border-t-accent border-b-surface-low bg-surface-low text-ink' : 'border-t-transparent text-ink-subtle hover:text-ink',
                )}
              >
                {t(`tabs.${name}`)}
              </button>
            ))}
          </div>
          <span
            className={cn(
              'hidden shrink-0 items-center gap-1.5 px-3 font-mono text-xs md:flex',
              mode === 'fixed' ? 'text-secondary' : 'text-tertiary',
            )}
          >
            <span aria-hidden className="size-1.5 rounded-[1px]" style={{ background: modeFill }} />
            {mode === 'fixed' ? t('lab.mode.fixed') : t('lab.mode.vulnerable')}
          </span>
        </div>

        <div role="tabpanel" key={tab} className="fade-in p-4">
          {tab === 'try' && Demo && <Demo mode={mode} onActivity={onActivity} />}
          {tab === 'playground' && <Playground labId={lab.id} mode={mode} presets={lab.presets} onActivity={onActivity} />}
          {tab === 'code' && <CodeDiff labId={lab.id} />}
          {tab === 'hints' && (
            <HintsPanel
              labId={lab.id}
              count={lab.hint_count}
              revealed={lab.revealed_hints}
              onChange={(revealed) => setLab({ ...lab, revealed_hints: revealed })}
            />
          )}
          {tab === 'verify' && <VerifyPanel labId={lab.id} onProgress={setProgress} />}
          {tab === 'learn' && <LearnPanel lab={lab} />}
        </div>
      </Card>
    </div>
  )
}
