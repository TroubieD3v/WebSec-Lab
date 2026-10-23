import { ExternalLink } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabDetail } from '../services/api'
import { Badge, Card, Inline } from './ui'

export function LearnPanel({ lab }: { lab: LabDetail }) {
  const { t } = useI18n()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-rose-300">{t('learn.why')}</h3>
        <p className="text-sm leading-relaxed text-zinc-300">
          <Inline text={lab.root_cause} />
        </p>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-emerald-300">{t('learn.fix')}</h3>
        <p className="text-sm leading-relaxed text-zinc-300">
          <Inline text={lab.fix} />
        </p>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">{t('learn.refs')}</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="violet">
            OWASP {lab.owasp} · {lab.owasp_name}
          </Badge>
          {lab.cwe.map((cwe) => (
            <Badge key={cwe}>{cwe}</Badge>
          ))}
        </div>
        <ul className="space-y-1.5">
          {lab.references.map((ref) => (
            <li key={ref.url + ref.label}>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-sky-300 hover:underline"
              >
                {ref.label} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
