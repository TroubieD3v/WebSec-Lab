import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button, Card, CodeBlock } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson } from '../services/api'
import type { DemoProps } from './types'

interface Result {
  status: number
  query: string | null
  rows: { id: number; name: string; category: string; price: number | string }[]
  error?: string
}

export function SqlInjectionDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [name, setName] = useState('Laptop Pro')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await labRequest('sql-injection', mode, { method: 'GET', path: `products?name=${encodeURIComponent(name)}` })
      const data = (tryJson(response.body) ?? {}) as Partial<Result>
      setResult({ status: response.status, query: data.query ?? null, rows: data.rows ?? [], error: data.error })
      onActivity()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">{t('sqli.label')}</span>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="sqli-input"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <Button type="submit" variant="primary" loading={loading} data-testid="sqli-submit">
            {!loading && <Search className="size-4" aria-hidden />} {t('sqli.search')}
          </Button>
        </form>
        <p className="text-xs text-zinc-500">{t('sqli.hint')}</p>
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-zinc-400">{t('sqli.sql')}</h3>
          <CodeBlock className="min-h-12 whitespace-pre-wrap break-words" data-testid="sqli-query">
            {result?.query ?? ' '}
          </CodeBlock>
        </div>
      </Card>

      <Card className="p-4" aria-live="polite">
        <h3 className="mb-3 text-sm font-semibold">{t('sqli.results', { n: result?.rows.length ?? 0 })}</h3>
        {result?.error && (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-200" data-testid="sqli-error">
            {t('sqli.error')}: {result.error}
          </p>
        )}
        {result && !result.error && result.rows.length === 0 && <p className="text-sm text-zinc-500">{t('sqli.none')}</p>}
        {result && result.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="sqli-results">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2 font-medium">id</th>
                  <th className="pb-2 font-medium">name</th>
                  <th className="pb-2 font-medium">category</th>
                  <th className="pb-2 font-medium">price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {result.rows.map((row, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: UNION results may repeat ids; each response replaces the whole table
                  <tr key={i}>
                    <td className="py-1.5 pr-3 font-mono text-xs text-zinc-400">{row.id}</td>
                    <td className="py-1.5 pr-3">{row.name}</td>
                    <td className="py-1.5 pr-3 break-all text-zinc-300">{row.category}</td>
                    <td className="py-1.5 font-mono text-xs">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
