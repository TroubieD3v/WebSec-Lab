import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabProgress } from '../services/api'
import { cn } from './ui'

type StepId = 'exploit' | 'defend' | 'verify' | 'complete'

// Each step keeps the colour of what it proves: you broke it (tertiary), the fix held (secondary).
const TONE: Record<StepId, { fill: string; text: string; color: string }> = {
  exploit: { fill: 'bg-tertiary-fill', text: 'text-on-tertiary-fill', color: 'var(--tertiary-fill)' },
  defend: { fill: 'bg-secondary-fill', text: 'text-on-secondary-fill', color: 'var(--secondary-fill)' },
  verify: { fill: 'bg-primary', text: 'text-on-primary', color: 'var(--primary)' },
  complete: { fill: 'bg-secondary-fill', text: 'text-on-secondary-fill', color: 'var(--secondary-fill)' },
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
    <section className="space-y-5" aria-label={t('lab.progress')}>
      <ol className="grid gap-4 sm:grid-cols-4 sm:gap-3">
        {steps.map((step, index) => (
          <li key={step.id} data-testid={`step-${step.id}`} data-done={step.done} className="flex gap-3 sm:flex-col sm:gap-3">
            {/* The palette's thick bar: filled in the step's colour once the server confirms it. */}
            <span aria-hidden className="hidden h-2 bg-surface-highest sm:block">
              <span
                className={cn(
                  'block h-full origin-left transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  TONE[step.id].fill,
                  step.done ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </span>
            <span className="flex items-start gap-3">
              <span
                style={{ ['--step-color' as string]: TONE[step.id].color }}
                className={cn(
                  'grid size-6 shrink-0 place-items-center text-[11px] font-bold transition-colors duration-500',
                  step.done
                    ? cn(TONE[step.id].fill, TONE[step.id].text)
                    : step.id === next
                      ? 'border-2 border-line-strong text-ink'
                      : 'bg-surface-highest text-ink-subtle',
                  justDone.has(step.id) && 'step-confirmed',
                )}
              >
                {step.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm leading-snug transition-colors duration-500',
                  step.done ? 'font-medium text-ink' : step.id === next ? 'text-ink' : 'text-ink-subtle',
                )}
              >
                {step.label}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="max-w-2xl text-sm text-ink-muted" data-testid="lab-message" aria-live="polite">
        {message}
      </p>
    </section>
  )
}
