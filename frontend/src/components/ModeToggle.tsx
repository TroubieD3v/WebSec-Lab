import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import type { Mode } from '../services/api'
import { cn } from './ui'

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useI18n()
  const options: { mode: Mode; label: string; icon: typeof ShieldAlert; active: string }[] = [
    { mode: 'vulnerable', label: t('lab.mode.vulnerable'), icon: ShieldAlert, active: 'bg-rose-500/15 text-rose-300 ring-rose-500/40' },
    { mode: 'fixed', label: t('lab.mode.fixed'), icon: ShieldCheck, active: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40' },
  ]
  return (
    <div>
      <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1" role="radiogroup" aria-label="Mode">
        {options.map(({ mode: m, label, icon: Icon, active }) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            data-testid={`mode-${m}`}
            onClick={() => onChange(m)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-transparent transition-colors',
              mode === m ? active : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {mode === 'vulnerable' ? t('lab.mode.vulnerableNote') : t('lab.mode.fixedNote')}
      </p>
    </div>
  )
}
