import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CodeDiff } from '../components/CodeDiff'
import { HintsPanel } from '../components/HintsPanel'
import { LabProgressTracker } from '../components/LabProgressTracker'
import { LearnPanel } from '../components/LearnPanel'
import { ModeToggle } from '../components/ModeToggle'
import { Playground } from '../components/Playground'
import { VerifyPanel } from '../components/VerifyPanel'
import { ErrorBox, Inline, Spinner, StatusBadge, cn } from '../components/ui'
import { DEMOS } from '../labs'
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

  // The whole screen takes the temperature of the current mode (see the aura in index.css).
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
  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-100">
        <ArrowLeft className="size-4" aria-hidden /> {t('lab.back')}
      </Link>

      <header className="relative space-y-3 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">{lab.title}</h1>
          <span data-testid="lab-status" className="pt-1.5">
            <StatusBadge status={lab.progress.status} />
          </span>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
          <span>
            <span className="text-zinc-300">{lab.owasp}</span> {lab.owasp_name}
          </span>
          <span>{t(`difficulty.${lab.difficulty}`)}</span>
          <span>{lab.cwe.join(', ')}</span>
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-zinc-800" />
        {sweep > 0 && (
          <span
            key={sweep}
            aria-hidden
            className="seal-sweep"
            style={{ ['--sweep-color' as string]: mode === 'fixed' ? 'rgb(124 196 232)' : 'rgb(232 163 61)' }}
          />
        )}
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <div className="space-y-6">
          <p className="max-w-2xl text-[1.05rem] leading-relaxed text-zinc-200">
            <Inline text={lab.task} />
          </p>
          <LabProgressTracker progress={lab.progress} />
        </div>
        <ModeToggle mode={mode} onChange={changeMode} />
      </section>

      <div>
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              data-testid={`tab-${name}`}
              onClick={() => setTab(name)}
              className={cn(
                'relative cursor-pointer px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                tab === name ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
              )}
            >
              {t(`tabs.${name}`)}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  mode === 'fixed' ? 'bg-emerald-400' : 'bg-amber-400',
                  tab === name ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          ))}
        </div>

        <div role="tabpanel" key={tab} className="fade-in pt-6">
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
      </div>
    </div>
  )
}
