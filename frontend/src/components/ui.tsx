import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabStatus } from '../services/api'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type Surface = 'low' | 'lowest' | 'base' | 'high'
const surfaces: Record<Surface, string> = {
  low: 'bg-surface-low',
  lowest: 'bg-surface-lowest',
  base: 'bg-surface',
  high: 'bg-surface-high',
}

/** The one rounded shape in the system. min-w-0: as a grid/flex item it may shrink below its widest line. */
export function Card({ className, surface = 'low', ...props }: HTMLAttributes<HTMLDivElement> & { surface?: Surface }) {
  return <div className={cn('card min-w-0', surfaces[surface], className)} {...props} />
}

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'violet'
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-highest text-ink-muted',
  green: 'bg-secondary-container text-on-secondary-container',
  red: 'bg-danger-container text-on-danger-container',
  amber: 'bg-tertiary-container text-on-tertiary-container',
  // Category tags stay quiet: colour is reserved for the two modes and for outcomes.
  blue: 'border border-line text-ink-muted',
  violet: 'border border-line text-ink-muted',
}

/** Rounded status pill (the palette's "OPTIMIZED" / "WEEKLY INSIGHT" shape). */
export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        // Long outcome messages may wrap on narrow screens instead of running past the card edge.
        'inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

type Variant = 'primary' | 'secondary' | 'inverted' | 'outlined' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-surface-highest text-ink hover:bg-surface-high',
  inverted: 'bg-inverse text-on-inverse hover:opacity-90',
  outlined: 'border border-line-strong text-ink hover:bg-surface-high',
  ghost: 'text-ink-muted hover:bg-surface-high hover:text-ink',
  // Attack actions: the tertiary (vulnerable) fill.
  danger: 'bg-tertiary-fill text-on-tertiary-fill hover:opacity-90',
}

/** Square buttons, as in the palette. Defaults to type="button" so it never submits a form by accident. */
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
        'inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,opacity,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
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

/** Small square preset / payload button. */
export const chipClass = 'cursor-pointer bg-surface-highest px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-surface-high'

/** Shared look for text inputs, selects and textareas: square, on the lowest surface. No width or size. */
export const fieldBase =
  'border border-line bg-surface-lowest px-3 py-2.5 font-mono text-ink placeholder:text-ink-subtle transition-colors focus:border-line-strong'
export const fieldClass = `w-full text-sm ${fieldBase}`

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{children}</span>
}

/** Small tracked label above a value (stat tiles, card kickers). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11px] font-semibold tracking-[0.12em] text-ink-subtle uppercase', className)}>{children}</p>
}

type TileTone = 'neutral' | 'green' | 'amber' | 'red' | 'primary'
const tileTones: Record<TileTone, string> = {
  neutral: 'bg-surface-highest text-ink-muted',
  green: 'bg-secondary-container text-on-secondary-container',
  amber: 'bg-tertiary-container text-on-tertiary-container',
  red: 'bg-danger-container text-on-danger-container',
  primary: 'bg-primary text-on-primary',
}

/** Square icon tile. */
export function IconTile({ icon: Icon, tone = 'neutral', size = 'md' }: { icon: LucideIcon; tone?: TileTone; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-14' : 'size-11'
  const glyph = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'
  return (
    <span className={cn('grid shrink-0 place-items-center', box, tileTones[tone])} aria-hidden>
      <Icon className={glyph} />
    </span>
  )
}

/** Flat, square-ended progress bar (the palette's thick bars). `value` is 0..1. */
export function ProgressBar({ value, tone = 'primary', className, label }: { value: number; tone?: 'primary' | 'green' | 'amber'; className?: string; label?: string }) {
  const fill = tone === 'green' ? 'bg-secondary-fill' : tone === 'amber' ? 'bg-tertiary-fill' : 'bg-primary'
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      className={cn('h-2 w-full bg-surface-highest', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div className={cn('h-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatTile({ label, value, accent, testId }: { label: string; value: ReactNode; accent?: 'green' | 'amber'; testId?: string }) {
  return (
    <div className="card flex flex-col justify-between gap-3 bg-surface-low p-5 sm:p-6">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={cn(
          'font-headline text-3xl font-semibold tracking-tight tabular-nums',
          accent === 'green' ? 'text-secondary' : accent === 'amber' ? 'text-tertiary' : 'text-ink',
        )}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-ink-muted" role="status">
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

/** A segmented radio group built on native inputs, so arrow keys and screen readers just work. */
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
      <legend className="mb-1.5 text-xs font-medium text-ink-subtle">{legend}</legend>
      <div className="inline-flex bg-surface-highest p-1">
        {options.map((option) => (
          <label
            key={option.value}
            data-testid={option.testId}
            className={cn(
              'cursor-pointer px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-secondary-fill',
              value === option.value ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
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

/** Square segmented tabs (code views and the like). The active one takes the primary fill. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  role = 'tablist',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  role?: 'tablist'
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto bg-surface-highest p-1" role={role}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
            value === option.value ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="card flex items-center justify-between gap-3 bg-danger-container p-5 text-sm text-on-danger-container" role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
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
      className={cn('overflow-x-auto border border-line bg-surface-lowest p-3.5 font-mono text-xs leading-relaxed text-ink', className)}
      {...props}
    />
  )
}

export function StatusChip({ status, ...props }: { status: number } & HTMLAttributes<HTMLSpanElement>) {
  const tone: Tone = status >= 500 ? 'red' : status >= 400 ? 'amber' : status >= 200 && status < 300 ? 'green' : 'neutral'
  return (
    <Badge tone={tone} className="font-mono" {...props}>
      {status}
    </Badge>
  )
}
