import { useState } from 'react'
import { Lightbulb, Lock } from 'lucide-react'
import { useI18n } from '../i18n'
import { api } from '../services/api'
import { Button, Card, ErrorBox, IconTile, Inline } from './ui'

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
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {t('hints.intro')} <span className="text-ink-subtle">({t('hints.used', { used, total: count })})</span>
      </p>
      {error && <ErrorBox message={error} />}
      {Array.from({ length: count }, (_, i) => i + 1).map((level) => {
        const text = revealed[level]
        return (
          <Card key={level} className="flex gap-4 p-5" data-testid={`hint-${level}`}>
            <IconTile icon={text ? Lightbulb : Lock} tone={text ? 'amber' : 'neutral'} />
            <div className="min-w-0 flex-1 space-y-2">
            <p className="font-headline font-bold">{t('hints.title', { n: level })}</p>
            {text ? (
              <p className="text-sm leading-relaxed text-ink-muted">
                <Inline text={text} />
              </p>
            ) : (
              <Button onClick={() => reveal(level)} loading={busy === level}>
                {t('hints.reveal', { n: level })}
              </Button>
            )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
