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
import { Badge, Card, DifficultyBadge, ErrorBox, Inline, Spinner, StatusBadge, cn } from '../components/ui'
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

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!lab) return <Spinner />

  const Demo = DEMOS[lab.id]
  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="size-4" aria-hidden /> {t('lab.back')}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet">
            OWASP {lab.owasp} · {lab.owasp_name}
          </Badge>
          <DifficultyBadge difficulty={lab.difficulty} />
          {lab.cwe.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
          <span className="ml-auto" data-testid="lab-status">
            <StatusBadge status={lab.progress.status} />
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lab.title}</h1>
      </header>

      <Card className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{t('lab.task')}</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              <Inline text={lab.task} />
            </p>
          </div>
          <LabProgressTracker progress={lab.progress} />
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            data-testid={`tab-${name}`}
            onClick={() => setTab(name)}
            className={cn(
              '-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              tab === name ? 'border-emerald-400 text-zinc-50' : 'border-transparent text-zinc-400 hover:text-zinc-100',
            )}
          >
            {t(`tabs.${name}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
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
  )
}
