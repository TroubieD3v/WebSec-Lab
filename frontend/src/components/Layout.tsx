import { NavLink, Outlet } from 'react-router-dom'
import { ChartColumn, LayoutGrid, Moon, ShieldCheck, Sun, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import { useTheme } from '../theme'
import { cn } from './ui'

function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <fieldset className="flex rounded-[3px] border border-line bg-surface-low p-0.5">
      <legend className="sr-only">Language / Язык</legend>
      {(['en', 'ru'] as Lang[]).map((l) => (
        <button
          type="button"
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'cursor-pointer rounded-[2px] px-2 py-0.5 font-mono text-xs transition-colors',
            lang === l ? 'bg-surface-highest text-ink' : 'text-ink-subtle hover:text-ink',
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
      className="grid size-7 cursor-pointer place-items-center rounded-[3px] text-ink-subtle transition-colors hover:bg-surface-high hover:text-ink"
    >
      <Icon className="size-4" aria-hidden />
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
          'flex flex-1 flex-col items-center gap-0.5 pt-1 text-[11px] font-medium transition-colors',
          'sm:h-12 sm:flex-none sm:flex-row sm:gap-2 sm:border-b-2 sm:px-3 sm:pt-0 sm:text-[13px]',
          isActive ? 'text-ink sm:border-accent' : 'text-ink-subtle hover:text-ink sm:border-transparent',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('grid size-8 place-items-center rounded-[3px] sm:size-auto', isActive && 'bg-surface-highest sm:bg-transparent')}>
            <Icon className="size-[18px] sm:size-4" aria-hidden />
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
      <header className="sticky top-0 z-30 border-b border-line bg-chrome">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-[3px] bg-primary text-on-primary">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-semibold">{t('app.name')}</span>
              <span className="hidden text-[11px] text-ink-subtle md:block">{t('app.tagline')}</span>
            </span>
          </NavLink>
          <nav
            aria-label={t('nav.main')}
            className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-chrome px-6 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:h-12 sm:justify-start sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0"
          >
            <NavItem to="/" end icon={LayoutGrid} label={t('nav.labs')} />
            <NavItem to="/progress" icon={ChartColumn} label={t('nav.progress')} />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LangSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pb-10">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-chrome pb-24 sm:pb-0">
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-xs text-ink-subtle sm:px-6">
          <TriangleAlert className="size-3.5 shrink-0 text-tertiary" aria-hidden /> {t('footer.warning')}
        </p>
      </footer>
    </div>
  )
}
