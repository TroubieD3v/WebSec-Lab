import { useState } from 'react'
import { Lightbulb, Lock } from 'lucide-react'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { Button, Card, ErrorBox, Inline } from './ui'

interface Props {
  labId: string
  count: number
  revealed: Record<string, string>
  onChange: (revealed: Record<string, string>) => void
}

export function HintsPanel({ labId, count, revealed, onChange }: Props) {
  const { t, lang } = useI18n()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reveal = async (level: number) => {
    setBusy(level)
    setError(null)
    try {
      const hint = await api.hint(labId, level, lang)
      onChange({ ...revealed, [level]: hint.text })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const used = Object.keys(revealed).length
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        {t('hints.intro')} <span className="text-zinc-500">({t('hints.used', { used, total: count })})</span>
      </p>
      {error && <ErrorBox message={error} />}
      {Array.from({ length: count }, (_, i) => i + 1).map((level) => {
        const text = revealed[level]
        return (
          <Card key={level} className="p-4" data-testid={`hint-${level}`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              {text ? <Lightbulb className="size-4 text-amber-300" aria-hidden /> : <Lock className="size-4 text-zinc-500" aria-hidden />}
              {t('hints.title', { n: level })}
            </div>
            {text ? (
              <p className="text-sm leading-relaxed text-zinc-300">
                <Inline text={text} />
              </p>
            ) : (
              <Button onClick={() => reveal(level)} loading={busy === level}>
                {t('hints.reveal', { n: level })}
              </Button>
            )}
          </Card>
        )
      })}
    </div>
  )
}
