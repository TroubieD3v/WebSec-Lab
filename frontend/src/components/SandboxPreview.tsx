import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { Badge, Card } from './ui'

interface LabMessage {
  source: 'websec-lab'
  lab: string
  type: 'xss-executed'
  detail: string
}

interface Props {
  /** URL on the isolated lab origin, or null before the first render. */
  src: string | null
  labId: string
  /** Called after the page loaded and after injected JavaScript ran, so progress can be re-checked. */
  onActivity: () => void
}

/**
 * Renders untrusted lab HTML in `sandbox="allow-scripts"` (no allow-same-origin) from a separate origin.
 * The frame has an opaque origin, so messages are authenticated by source window, not by origin.
 */
export function SandboxPreview({ src, labId, onActivity }: Props) {
  const { t } = useI18n()
  const frame = useRef<HTMLIFrameElement>(null)
  const [executed, setExecuted] = useState<string | null>(null)

  useEffect(() => setExecuted(null), [src])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as Partial<LabMessage> | null
      if (
        event.source !== frame.current?.contentWindow ||
        data?.source !== 'websec-lab' ||
        data.type !== 'xss-executed' ||
        data.lab !== labId
      )
        return
      setExecuted(String(data.detail ?? ''))
      setTimeout(onActivity, 250) // give the beacon request time to land
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [labId, onActivity])

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('xss.preview')}</h3>
        {executed !== null ? (
          <Badge tone="red" className="whitespace-normal" data-testid="xss-executed">
            {t('xss.executed', { detail: executed })}
          </Badge>
        ) : (
          <Badge data-testid="xss-waiting">{t('xss.waiting')}</Badge>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-white">
        {src ? (
          <iframe
            ref={frame}
            src={src}
            title={t('xss.preview')}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="h-56 w-full"
            onLoad={onActivity}
            data-testid="xss-frame"
          />
        ) : (
          <div className="grid h-56 place-items-center text-sm text-zinc-400">—</div>
        )}
      </div>
    </Card>
  )
}
