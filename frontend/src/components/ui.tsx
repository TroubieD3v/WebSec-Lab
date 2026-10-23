import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabStatus } from '../services/api'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  // min-w-0: as a grid/flex item a card must be allowed to shrink below its widest line (code blocks scroll instead).
  return <div className={cn('min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur', className)} {...props} />
}

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'violet'
const tones: Record<Tone, string> = {
  neutral: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  red: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  blue: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
}

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:hover:bg-emerald-500',
  secondary: 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:hover:bg-zinc-800',
  ghost: 'text-zinc-300 hover:bg-zinc-800',
  danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
}

export function Button({
  variant = 'secondary',
  className,
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-zinc-400" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label ?? t('common.loading')}
    </div>
  )
}

export function StatusBadge({ status }: { status: LabStatus }) {
  const { t } = useI18n()
  const tone: Tone = status === 'completed' ? 'green' : status === 'vulnerability_found' ? 'amber' : 'neutral'
  return <Badge tone={tone}>{t(`status.${status}`)}</Badge>
}

export function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const { t } = useI18n()
  const tone: Tone = difficulty === 'easy' ? 'green' : difficulty === 'medium' ? 'amber' : 'red'
  return <Badge tone={tone}>{t(`difficulty.${difficulty}`)}</Badge>
}

/** Renders `backtick` spans as inline code. */
export function Inline({ text }: { text: string }): ReactNode {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={i} className="inline">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

export function CodeBlock({ className, ...props }: HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={cn('overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200', className)}
      {...props}
    />
  )
}

export function StatusChip({ status, ...props }: { status: number } & HTMLAttributes<HTMLSpanElement>) {
  const tone: Tone = status >= 500 ? 'red' : status >= 400 ? 'amber' : status >= 200 && status < 300 ? 'green' : 'neutral'
  return (
    <Badge tone={tone} {...props}>
      {status}
    </Badge>
  )
}
