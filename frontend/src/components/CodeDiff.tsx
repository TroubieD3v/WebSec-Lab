import { useEffect, useState } from 'react'
import { FileCode2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { api, type CodePayload, type CodeRow } from '../services/api'
import { Card, ErrorBox, Segmented, Spinner, cn } from './ui'

type View = 'diff' | 'vulnerable' | 'fixed'

const cellTone = { same: '', del: 'bg-danger-container', add: 'bg-secondary-container' } as const
const marker = { same: ' ', del: '-', add: '+' } as const

function Cell({ line }: { line: CodeRow['left'] | CodeRow['right'] }) {
  if (!line) return <td colSpan={2} className="bg-surface [background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--line)_6px_7px)]" />
  return (
    <>
      <td className={cn('w-10 select-none border-r border-line px-2 text-right text-ink-subtle', cellTone[line.kind])}>{line.n}</td>
      <td className={cn('px-2 whitespace-pre-wrap [overflow-wrap:anywhere]', cellTone[line.kind], line.kind === 'del' && 'text-on-danger-container', line.kind === 'add' && 'text-on-secondary-container')}>
        <span className="mr-2 select-none text-ink-subtle">{marker[line.kind]}</span>
        {line.text || ' '}
      </td>
    </>
  )
}

function SideBySide({ rows }: { rows: CodeRow[] }) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the diff can scroll; keyboard users need to focus it
    <div className="overflow-x-auto" tabIndex={0}>
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

function Plain({ code, tone }: { code: string; tone: 'vulnerable' | 'fixed' }) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: long code scrolls; keyboard users need to focus it
    <pre tabIndex={0} className={cn('overflow-x-auto border-l-2 px-4 py-3 font-mono text-xs leading-6 text-ink', tone === 'vulnerable' ? 'border-tertiary-fill' : 'border-secondary-fill')} data-testid="code-plain">
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
    <div className="space-y-2">
      <p className="text-xs text-ink-subtle">{t('code.note', { file: code.file })}</p>
      <Card surface="lowest" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-2 py-1.5">
          <span className="flex min-w-0 items-center gap-1.5 px-1 font-mono text-xs text-ink-muted">
            <FileCode2 className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
            <span className="truncate">{code.file}</span>
          </span>
          <Segmented value={view} onChange={setView} options={tabs.map((tab) => ({ value: tab.view, label: tab.label }))} />
        </div>
        {view === 'diff' && (
          <>
            <div className="grid grid-cols-2 border-b border-line font-mono text-xs">
              <div className="flex items-center gap-1.5 border-r border-line px-3 py-1.5 text-tertiary">
                <span aria-hidden className="size-1.5 rounded-[1px] bg-tertiary-fill" /> {t('code.vulnerable')}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-secondary">
                <span aria-hidden className="size-1.5 rounded-[1px] bg-secondary-fill" /> {t('code.fixed')}
              </div>
            </div>
            <SideBySide rows={code.rows} />
          </>
        )}
        {view === 'vulnerable' && <Plain code={code.vulnerable} tone="vulnerable" />}
        {view === 'fixed' && <Plain code={code.fixed} tone="fixed" />}
      </Card>
    </div>
  )
}
