import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import type { Mode } from '../services/api'
import { Eyebrow, IconTile, cn } from './ui'

/** Vulnerable / fixed switch: a native radio group with a sliding square thumb in the mode's fill. */
export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useI18n()
  const fixed = mode === 'fixed'
  const options: { mode: Mode; label: string; icon: typeof ShieldAlert }[] = [
    { mode: 'vulnerable', label: t('lab.mode.vulnerable'), icon: ShieldAlert },
    { mode: 'fixed', label: t('lab.mode.fixed'), icon: ShieldCheck },
  ]
  return (
    <div className="flex h-full flex-col gap-5">
      <Eyebrow>{t('lab.mode.label')}</Eyebrow>
      <fieldset className="relative grid w-full grid-cols-2 bg-surface-highest p-1">
        <legend className="sr-only">{t('lab.mode.label')}</legend>
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            fixed ? 'translate-x-full bg-secondary-fill' : 'translate-x-0 bg-tertiary-fill',
          )}
        />
        {options.map(({ mode: m, label, icon: Icon }) => (
          <label
            key={m}
            data-testid={`mode-${m}`}
            className={cn(
              'relative z-10 flex cursor-pointer items-center justify-center gap-2 px-3 py-3 text-sm font-bold transition-colors duration-300',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-secondary-fill',
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
            <Icon className="size-4" aria-hidden /> {label}
          </label>
        ))}
      </fieldset>
      {/* What the current mode means, in its own colour. */}
      <div className={cn('mt-auto flex gap-4 p-4 transition-colors duration-500', fixed ? 'bg-secondary-container' : 'bg-tertiary-container')} aria-live="polite">
        <IconTile icon={fixed ? ShieldCheck : ShieldAlert} tone="primary" />
        <div className={cn('min-w-0', fixed ? 'text-on-secondary-container' : 'text-on-tertiary-container')}>
          <p className="font-headline font-bold">{fixed ? t('lab.mode.fixed') : t('lab.mode.vulnerable')}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{fixed ? t('lab.mode.fixedNote') : t('lab.mode.vulnerableNote')}</p>
        </div>
      </div>
    </div>
  )
}
