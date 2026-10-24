import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CodeXml } from 'lucide-react'
import { CodeDiff } from '../components/CodeDiff'
import { HintsPanel } from '../components/HintsPanel'
import { LabProgressTracker } from '../components/LabProgressTracker'
import { LearnPanel } from '../components/LearnPanel'
import { ModeToggle } from '../components/ModeToggle'
import { Playground } from '../components/Playground'
import { VerifyPanel } from '../components/VerifyPanel'
import { Badge, Card, DifficultyBadge, ErrorBox, Eyebrow, IconTile, Inline, Spinner, StatusBadge, cn } from '../components/ui'
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
  const modeFill = mode === 'fixed' ? 'var(--secondary-fill)' : 'var(--tertiary-fill)'
  return (
    <div className="space-y-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-subtle transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t('lab.back')}
      </Link>

      <header className="relative pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <IconTile icon={LAB_ICONS[lab.id] ?? CodeXml} tone={mode === 'fixed' ? 'green' : 'amber'} size="lg" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" className="font-mono">
                {lab.owasp}
              </Badge>
              <DifficultyBadge difficulty={lab.difficulty} />
              <span data-testid="lab-status">
                <StatusBadge status={lab.progress.status} />
              </span>
            </div>
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">{lab.title}</h1>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-subtle">
              <span>{lab.owasp_name}</span>
              <span className="font-mono">{lab.cwe.join(', ')}</span>
            </p>
          </div>
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" />
        {sweep > 0 && <span key={sweep} aria-hidden className="seal-sweep" style={{ ['--sweep-color' as string]: modeFill }} />}
      </header>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card surface="lowest" className="glow relative space-y-8 overflow-hidden p-6 sm:p-8 lg:col-span-8" style={{ ['--glow' as string]: modeFill }}>
          <div className="relative space-y-3">
            <Eyebrow>{t('lab.task')}</Eyebrow>
            <p className="max-w-2xl text-lg leading-relaxed text-ink">
              <Inline text={lab.task} />
            </p>
          </div>
          <div className="relative">
            <LabProgressTracker progress={lab.progress} />
          </div>
        </Card>
        <Card className="p-6 sm:p-8 lg:col-span-4">
          <ModeToggle mode={mode} onChange={changeMode} />
        </Card>
      </section>

      <div>
        <div className="inline-flex max-w-full overflow-x-auto bg-surface-low p-1" role="tablist">
          {TABS.map((name) => (
            <button
              type="button"
              key={name}
              role="tab"
              aria-selected={tab === name}
              data-testid={`tab-${name}`}
              onClick={() => setTab(name)}
              className={cn(
                'cursor-pointer px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                tab === name ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t(`tabs.${name}`)}
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
