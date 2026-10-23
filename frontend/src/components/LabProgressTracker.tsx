import { CheckCircle2, Circle } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabProgress } from '../services/api'
import { cn } from './ui'

export function LabProgressTracker({ progress }: { progress: LabProgress }) {
  const { t } = useI18n()
  const steps = [
    { done: progress.exploited, label: t('step.exploit'), id: 'exploit' },
    { done: progress.defended, label: t('step.defend'), id: 'defend' },
    { done: progress.fix_verified, label: t('step.verify'), id: 'verify' },
    { done: progress.completed, label: t('step.complete'), id: 'complete' },
  ]
  // Always point at the next thing the learner has to do themselves.
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
    <div className="space-y-3" aria-label={t('lab.progress')}>
      <ol className="flex flex-wrap gap-x-5 gap-y-2">
        {steps.map((step) => (
          <li key={step.id} data-testid={`step-${step.id}`} data-done={step.done} className="flex items-center gap-1.5 text-sm">
            {step.done ? (
              <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
            ) : (
              <Circle className="size-4 text-zinc-600" aria-hidden />
            )}
            <span className={cn(step.done ? 'text-zinc-100' : 'text-zinc-500')}>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-zinc-400" data-testid="lab-message">
        {message}
      </p>
    </div>
  )
}
