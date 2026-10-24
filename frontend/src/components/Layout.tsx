import { NavLink, Outlet } from 'react-router-dom'
import { ChartColumn, LayoutGrid, Moon, ShieldCheck, Sun, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import { useTheme } from '../theme'
import { cn } from './ui'

function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <fieldset className="flex bg-surface-low p-1">
      <legend className="sr-only">Language / Язык</legend>
      {(['en', 'ru'] as Lang[]).map((l) => (
        <button
          type="button"
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'cursor-pointer px-2.5 py-1.5 text-xs font-bold uppercase transition-colors',
            lang === l ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
          )}
        >
          {l}
        </button>
      ))}
    </fieldset>
  )
}

function ThemeToggle() {
  const { t } = useI18n()
  const [theme, toggle] = useTheme()
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      data-testid="theme-toggle"
      data-theme={theme}
      className="grid size-10 cursor-pointer place-items-center bg-surface-low text-ink transition-colors hover:bg-surface-high"
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  )
}

function NavItem({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold transition-colors sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-2 sm:text-sm',
          isActive ? 'text-ink sm:bg-primary sm:text-on-primary' : 'text-ink-subtle hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* On phones the active item gets the palette's square icon tile. */}
          <span className={cn('grid size-10 place-items-center sm:size-auto', isActive && 'bg-primary text-on-primary sm:bg-transparent sm:text-inherit')}>
            <Icon className="size-5 sm:size-4" aria-hidden />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30">
        {/* The blur lives on its own layer: backdrop-filter on the header would trap the fixed phone nav inside it. */}
        <div aria-hidden className="absolute inset-0 -z-10 border-b border-line/60 bg-canvas/80 backdrop-blur-xl" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-3">
            <span className="grid size-10 place-items-center bg-primary text-on-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block font-headline text-base font-bold tracking-tight">{t('app.name')}</span>
              <span className="hidden text-[11px] text-ink-subtle md:block">{t('app.tagline')}</span>
            </span>
          </NavLink>
          <nav
            aria-label={t('nav.main')}
            className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line/60 bg-canvas/90 px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:mx-auto sm:justify-start sm:gap-1 sm:border-0 sm:bg-surface-low sm:p-1 sm:backdrop-blur-none"
          >
            <NavItem to="/" end icon={LayoutGrid} label={t('nav.labs')} />
            <NavItem to="/progress" icon={ChartColumn} label={t('nav.progress')} />
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <ThemeToggle />
            <LangSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pb-12">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 sm:pb-8">
        <div aria-hidden className="mb-6 h-px bg-gradient-to-r from-transparent via-line-strong/50 to-transparent" />
        <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-subtle">
          <TriangleAlert className="size-3.5 shrink-0 text-tertiary" aria-hidden /> {t('footer.warning')}
        </p>
      </footer>
    </div>
  )
}
