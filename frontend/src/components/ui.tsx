import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabStatus } from '../services/api'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  // min-w-0: as a grid/flex item a card must be allowed to shrink below its widest line (code blocks scroll instead).
  return <div className={cn('min-w-0 rounded-xl border border-zinc-800/80 bg-zinc-900/70', className)} {...props} />
}

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'violet'
const tones: Record<Tone, string> = {
  neutral: 'border-zinc-700/70 bg-zinc-800/50 text-zinc-300',
  green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  red: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  // Category tags stay quiet: colour is reserved for the two modes and for outcomes.
  blue: 'border-zinc-700/70 bg-transparent text-zinc-400',
  violet: 'border-zinc-700/70 bg-transparent text-zinc-400',
}

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        // Long outcome messages may wrap on narrow screens instead of running past the card edge.
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:hover:bg-emerald-400',
  secondary: 'border border-zinc-700 bg-zinc-800/80 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 disabled:hover:bg-zinc-800/80',
  ghost: 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100',
  danger: 'border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20',
}

export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
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
  // Key each segment by its offset in the text: unique and stable for a given string.
  let offset = 0
  const segments = text
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((part) => {
      const key = offset
      offset += part.length
      return { part, key }
    })
  return (
    <>
      {segments.map(({ part, key }) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={key} className="inline">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={key}>{part}</span>
        ),
      )}
    </>
  )
}

interface RadioOption<T extends string> {
  value: T
  label: string
  testId?: string
}

/** A small segmented radio group built on native inputs, so arrow keys and screen readers just work. */
export function RadioPills<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string
  legend: string
  value: T
  options: RadioOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs text-zinc-400">{legend}</legend>
      <div className="inline-flex rounded-lg border border-zinc-700 p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            data-testid={option.testId}
            className={cn(
              'cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-400',
              value === option.value ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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
    // biome-ignore lint/a11y/noNoninteractiveTabindex: long code scrolls; keyboard users need to focus it to scroll
    <pre tabIndex={0}
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
