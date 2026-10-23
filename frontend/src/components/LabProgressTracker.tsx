import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabProgress } from '../services/api'
import { cn } from './ui'

type StepId = 'exploit' | 'defend' | 'verify' | 'complete'

// Each step keeps the colour of what it proves: you broke it (amber), the fix held (glacier).
const TONE: Record<StepId, { dot: string; ring: string; color: string }> = {
  exploit: { dot: 'bg-amber-400 border-amber-400', ring: 'border-amber-400/50', color: 'rgb(232 163 61 / 0.55)' },
  defend: { dot: 'bg-emerald-400 border-emerald-400', ring: 'border-emerald-400/50', color: 'rgb(124 196 232 / 0.55)' },
  verify: { dot: 'bg-zinc-100 border-zinc-100', ring: 'border-zinc-400/50', color: 'rgb(230 228 223 / 0.45)' },
  complete: { dot: 'bg-emerald-400 border-emerald-400', ring: 'border-emerald-400/50', color: 'rgb(124 196 232 / 0.55)' },
}

export function LabProgressTracker({ progress }: { progress: LabProgress }) {
  const { t } = useI18n()
  const steps: { id: StepId; done: boolean; label: string }[] = [
    { id: 'exploit', done: progress.exploited, label: t('step.exploit') },
    { id: 'defend', done: progress.defended, label: t('step.defend') },
    { id: 'verify', done: progress.fix_verified, label: t('step.verify') },
    { id: 'complete', done: progress.completed, label: t('step.complete') },
  ]

  // Animate only the steps that flip to done while the page is open, not the ones already done on load.
  const previous = useRef<Record<string, boolean> | null>(null)
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const doneKey = steps.map((s) => Number(s.done)).join('')
  // biome-ignore lint/correctness/useExhaustiveDependencies: `steps` is rebuilt every render; doneKey is its stable identity
  useEffect(() => {
    const now = Object.fromEntries(steps.map((s) => [s.id, s.done]))
    const before = previous.current
    previous.current = now
    if (!before) return
    const fresh = steps.filter((s) => s.done && !before[s.id]).map((s) => s.id)
    if (!fresh.length) return
    setJustDone(new Set(fresh))
    const timer = setTimeout(() => setJustDone(new Set()), 800)
    return () => clearTimeout(timer)
  }, [doneKey])

  const next = steps.find((s) => !s.done)?.id
  const message = progress.completed
    ? t('msg.done')
    : progress.exploited && progress.defended
      ? t('msg.verify')
      : progress.exploited
        ? t('msg.exploited')
        : progress.defended
          ? t('msg.defendedFirst')
          : t('msg.start')

  return (
    <section className="space-y-4" aria-label={t('lab.progress')}>
      <ol className="grid gap-3 sm:grid-cols-4 sm:gap-0">
        {steps.map((step, index) => (
          <li
            key={step.id}
            data-testid={`step-${step.id}`}
            data-done={step.done}
            className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5"
          >
            <div className="flex items-center sm:w-full">
              <span
                style={{ ['--step-color' as string]: TONE[step.id].color }}
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-500',
                  step.done ? TONE[step.id].dot : step.id === next ? TONE[step.id].ring : 'border-zinc-700',
                  justDone.has(step.id) && 'step-confirmed',
                )}
              >
                {step.done && <Check className="size-3 text-zinc-950" strokeWidth={3} aria-hidden />}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden className="mx-2 hidden h-px flex-1 bg-zinc-800 sm:block">
                  <span
                    className={cn(
                      'block h-px origin-left bg-zinc-500 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      step.done ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </span>
              )}
            </div>
            <span
              className={cn(
                'text-sm leading-snug transition-colors duration-500 sm:pr-4',
                step.done ? 'text-zinc-200' : step.id === next ? 'text-zinc-300' : 'text-zinc-500',
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="max-w-2xl text-sm text-zinc-400" data-testid="lab-message" aria-live="polite">
        {message}
      </p>
    </section>
  )
}
