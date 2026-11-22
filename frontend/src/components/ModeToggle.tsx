import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import type { Mode } from '../services/api'
import { cn } from './ui'

/** Vulnerable / fixed switch: a native radio group with a sliding square thumb in the mode's fill. */
export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useI18n()
  const fixed = mode === 'fixed'
  const options: { mode: Mode; label: string; icon: typeof ShieldAlert }[] = [
    { mode: 'vulnerable', label: t('lab.mode.vulnerable'), icon: ShieldAlert },
    { mode: 'fixed', label: t('lab.mode.fixed'), icon: ShieldCheck },
  ]
  return (
    <div className="flex h-full flex-col gap-3">
      <fieldset className="relative grid w-full grid-cols-2 rounded-[3px] border border-line bg-surface-high p-0.5">
        <legend className="sr-only">{t('lab.mode.label')}</legend>
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-[2px] transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            fixed ? 'translate-x-full bg-secondary-fill' : 'translate-x-0 bg-tertiary-fill',
          )}
        />
        {options.map(({ mode: m, label, icon: Icon }) => (
          <label
            key={m}
            data-testid={`mode-${m}`}
            className={cn(
              'relative z-10 flex cursor-pointer items-center justify-center gap-1.5 px-2 py-1.5 text-[13px] font-medium transition-colors duration-300',
              'has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent',
              mode === m ? (m === 'fixed' ? 'text-on-secondary-fill' : 'text-on-tertiary-fill') : 'text-ink-muted hover:text-ink',
            )}
          >
            <input
              type="radio"
              name="lab-mode"
              value={m}
              checked={mode === m}
              onChange={() => onChange(m)}
              className="sr-only"
            />
            <Icon className="size-3.5" aria-hidden /> {label}
          </label>
        ))}
      </fieldset>
      {/* What the current mode means, in its own colour. */}
      <div
        className={cn(
          'rounded-[3px] border-l-2 px-3 py-2 transition-colors duration-300',
          fixed ? 'border-secondary-fill bg-secondary-container text-on-secondary-container' : 'border-tertiary-fill bg-tertiary-container text-on-tertiary-container',
        )}
        aria-live="polite"
      >
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          {fixed ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldAlert className="size-3.5" aria-hidden />}
          {fixed ? t('lab.mode.fixed') : t('lab.mode.vulnerable')}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed">{fixed ? t('lab.mode.fixedNote') : t('lab.mode.vulnerableNote')}</p>
      </div>
    </div>
  )
}
