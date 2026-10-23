import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import type { Mode } from '../services/api'
import { cn } from './ui'

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useI18n()
  const fixed = mode === 'fixed'
  const options: { mode: Mode; label: string; icon: typeof ShieldAlert }[] = [
    { mode: 'vulnerable', label: t('lab.mode.vulnerable'), icon: ShieldAlert },
    { mode: 'fixed', label: t('lab.mode.fixed'), icon: ShieldCheck },
  ]
  return (
    <div className="space-y-2">
      <div
        className="relative grid w-full grid-cols-2 rounded-full border border-zinc-800 bg-zinc-900 p-1 sm:w-80"
        role="radiogroup"
        aria-label={t('lab.mode.label')}
      >
        {/* The sliding thumb carries the mode's colour. */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            fixed
              ? 'translate-x-full bg-emerald-400/15 shadow-[inset_0_0_0_1px_rgb(124_196_232/0.45)]'
              : 'translate-x-0 bg-amber-400/15 shadow-[inset_0_0_0_1px_rgb(232_163_61/0.45)]',
          )}
        />
        {options.map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            data-testid={`mode-${m}`}
            onClick={() => onChange(m)}
            className={cn(
              'relative z-10 flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300',
              mode === m ? (m === 'fixed' ? 'text-emerald-200' : 'text-amber-200') : 'text-zinc-500 hover:text-zinc-200',
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500" aria-live="polite">
        {fixed ? t('lab.mode.fixedNote') : t('lab.mode.vulnerableNote')}
      </p>
    </div>
  )
}
