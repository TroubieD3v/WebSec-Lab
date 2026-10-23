import { NavLink, Outlet } from 'react-router-dom'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { useI18n, type Lang } from '../i18n'
import { cn } from './ui'

function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <fieldset className="flex rounded-lg border border-zinc-800 p-0.5">
      <legend className="sr-only">Language / Язык</legend>
      {(['en', 'ru'] as Lang[]).map((l) => (
        <button
          type="button"
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors',
            lang === l ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
          )}
        >
          {l}
        </button>
      ))}
    </fieldset>
  )
}

export function Layout() {
  const { t } = useI18n()
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100',
    )
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <ShieldCheck className="size-6 text-emerald-400" aria-hidden />
            <span className="sr-only leading-tight sm:not-sr-only sm:block">
              <span className="block text-sm font-semibold tracking-tight">{t('app.name')}</span>
              <span className="block text-[11px] text-zinc-500">{t('app.tagline')}</span>
            </span>
          </NavLink>
          <nav className="flex min-w-0 gap-1">
            <NavLink to="/" end className={link}>
              {t('nav.labs')}
            </NavLink>
            <NavLink to="/progress" className={link}>
              {t('nav.progress')}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {/* Wrapped: Badge's own inline-flex would override a `hidden` class on the badge itself. */}
            <span className="hidden items-center gap-2 text-xs text-zinc-500 md:flex">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden /> {t('badge.local')}
            </span>
            <LangSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-800/80 py-4">
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 text-xs text-zinc-500">
          <TriangleAlert className="size-3.5 shrink-0 text-amber-400" aria-hidden /> {t('footer.warning')}
        </p>
      </footer>
    </div>
  )
}
