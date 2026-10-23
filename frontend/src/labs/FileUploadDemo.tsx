import { useState } from 'react'
import { Upload } from 'lucide-react'
import { SandboxPreview } from '../components/SandboxPreview'
import { Badge, Button, Card, CodeBlock, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { LABS_ORIGIN, labUrl, tryJson } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'file-upload'
const field = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm'

// 1x1 transparent PNG
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))
const SCRIPT = "<script>parent.postMessage({source:'websec-lab',lab:'file-upload',type:'xss-executed',detail:'uploaded script ran'},'*')</script>"

interface Sample {
  id: 'png' | 'html' | 'svg' | 'polyglot'
  filename: string
  type: string
  text: string | null // null = the real PNG
}

const SAMPLES: Sample[] = [
  { id: 'png', filename: 'avatar.png', type: 'image/png', text: null },
  { id: 'html', filename: 'avatar.html', type: 'text/html', text: `<h1>Not an image</h1>${SCRIPT}` },
  { id: 'svg', filename: 'logo.svg', type: 'image/svg+xml', text: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text y="25">SVG</text></svg>` },
  { id: 'polyglot', filename: 'avatar.png', type: 'image/png', text: `<h1>HTML pretending to be a PNG</h1>${SCRIPT}` },
]

interface Uploaded {
  status: number
  filename?: string
  detail?: string
}

export function FileUploadDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [sample, setSample] = useState<Sample>(SAMPLES[0])
  const [filename, setFilename] = useState(SAMPLES[0].filename)
  const [type, setType] = useState(SAMPLES[0].type)
  const [text, setText] = useState('')
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const choose = (next: Sample) => {
    setSample(next)
    setFilename(next.filename)
    setType(next.type)
    setText(next.text ?? '')
  }

  const upload = async () => {
    setBusy(true)
    try {
      const data = text !== '' || sample.text !== null ? encodeText(text) : PNG
      const form = new FormData()
      form.append('file', new File([data as BlobPart], filename, { type }))
      const response = await fetch(labUrl(LAB, mode, 'upload'), { method: 'POST', body: form })
      const body = (tryJson(await response.text()) ?? {}) as { filename?: string; detail?: string }
      setUploaded({ status: response.status, filename: body.filename, detail: body.detail })
      setPreviewSrc(body.filename ? `${LABS_ORIGIN}/${LAB}/${mode}/uploads/${body.filename}?_=${Date.now()}` : null)
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const isImage = mode === 'fixed' && uploaded?.filename && /\.(png|jpe?g)$/.test(uploaded.filename)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <div>
          <span className="mb-1.5 block text-xs text-zinc-500">{t('upload.samples')}</span>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => choose(s)}
                data-testid={`upload-sample-${s.id}`}
                className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
              >
                {t(`upload.sample.${s.id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-500">{t('upload.filename')}</span>
            <input className={field} value={filename} onChange={(e) => setFilename(e.target.value)} data-testid="upload-filename" />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-zinc-500">{t('upload.type')}</span>
            <input className={field} value={type} onChange={(e) => setType(e.target.value)} data-testid="upload-type" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">{t('upload.content')}</span>
          <textarea
            className={field}
            rows={5}
            value={sample.text === null && text === '' ? t('upload.binary') : text}
            onChange={(e) => setText(e.target.value)}
            readOnly={sample.text === null && text === ''}
            spellCheck={false}
            data-testid="upload-content"
          />
        </label>
        <Button variant="primary" onClick={upload} loading={busy} data-testid="upload-send">
          {!busy && <Upload className="size-4" aria-hidden />} {t('upload.send')}
        </Button>
        <p className="text-xs text-zinc-500">{t('upload.note')}</p>
      </Card>

      <div className="space-y-4">
        {uploaded && (
          <Card className="space-y-2 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={uploaded.status} data-testid="upload-status" />
              {uploaded.filename && <Badge data-testid="upload-saved-as">{t('upload.savedAs', { name: uploaded.filename })}</Badge>}
              {uploaded.status === 415 && <Badge tone="green">{t('upload.rejected')}</Badge>}
            </div>
            {uploaded.detail && <CodeBlock data-testid="upload-detail">{uploaded.detail}</CodeBlock>}
          </Card>
        )}
        {isImage ? (
          <Card className="p-4">
            <img src={previewSrc ?? ''} alt="" className="max-h-40 rounded border border-zinc-700 bg-white" data-testid="upload-image" />
          </Card>
        ) : (
          <SandboxPreview src={previewSrc} labId={LAB} onExecuted={onActivity} />
        )}
      </div>
    </div>
  )
}

const encodeText = (text: string) => new TextEncoder().encode(text)
