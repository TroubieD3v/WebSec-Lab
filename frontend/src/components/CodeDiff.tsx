import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { api, type CodePayload, type CodeRow } from '../services/api'
import { Card, ErrorBox, Spinner, cn } from './ui'

type View = 'diff' | 'vulnerable' | 'fixed'

const cellTone = { same: '', del: 'bg-rose-500/10', add: 'bg-emerald-500/10' } as const
const marker = { same: ' ', del: '-', add: '+' } as const

function Cell({ line }: { line: CodeRow['left'] | CodeRow['right'] }) {
  if (!line) return <td colSpan={2} className="bg-zinc-900/40" />
  return (
    <>
      <td className={cn('w-10 select-none px-2 text-right text-zinc-600', cellTone[line.kind])}>{line.n}</td>
      <td className={cn('px-2 whitespace-pre-wrap [overflow-wrap:anywhere]', cellTone[line.kind], line.kind === 'del' && 'text-rose-200', line.kind === 'add' && 'text-emerald-200')}>
        <span className="mr-2 select-none text-zinc-600">{marker[line.kind]}</span>
        {line.text || ' '}
      </td>
    </>
  )
}

function SideBySide({ rows }: { rows: CodeRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse font-mono text-xs leading-6" data-testid="code-diff">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-10" />
          <col />
        </colgroup>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.left?.n ?? '-'}:${row.right?.n ?? '-'}`} className="align-top">
              <Cell line={row.left} />
              <Cell line={row.right} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Plain({ code, tone }: { code: string; tone: 'rose' | 'emerald' }) {
  return (
    <pre className={cn('overflow-x-auto p-4 font-mono text-xs leading-6', tone === 'rose' ? 'text-rose-100' : 'text-emerald-100')} data-testid="code-plain">
      {code}
    </pre>
  )
}

export function CodeDiff({ labId }: { labId: string }) {
  const { t } = useI18n()
  const [code, setCode] = useState<CodePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('diff')

  const load = () => {
    setError(null)
    api.code(labId).then(setCode, (e: Error) => setError(e.message))
  }
  useEffect(load, [labId])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!code) return <Spinner />

  const tabs: { view: View; label: string }[] = [
    { view: 'diff', label: t('code.diff') },
    { view: 'vulnerable', label: t('code.vulnerable') },
    { view: 'fixed', label: t('code.fixed') },
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5" role="tablist">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.view}
              role="tab"
              aria-selected={view === tab.view}
              onClick={() => setView(tab.view)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === tab.view ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{t('code.note', { file: code.file })}</p>
      </div>
      <Card className="overflow-hidden">
        {view === 'diff' && (
          <>
            <div className="grid grid-cols-2 border-b border-zinc-800 text-xs font-medium">
              <div className="bg-rose-500/10 px-3 py-2 text-rose-300">{t('code.vulnerable')}</div>
              <div className="bg-emerald-500/10 px-3 py-2 text-emerald-300">{t('code.fixed')}</div>
            </div>
            <SideBySide rows={code.rows} />
          </>
        )}
        {view === 'vulnerable' && <Plain code={code.vulnerable} tone="rose" />}
        {view === 'fixed' && <Plain code={code.fixed} tone="emerald" />}
      </Card>
    </div>
  )
}
