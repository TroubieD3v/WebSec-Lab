import { BookOpen, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useI18n } from '../i18n'
import type { LabDetail } from '../services/api'
import { Card, IconTile, Inline } from './ui'

export function LearnPanel({ lab }: { lab: LabDetail }) {
  const { t } = useI18n()
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-6">
        <IconTile icon={TriangleAlert} tone="amber" />
        <h3 className="text-xl font-bold tracking-tight">{t('learn.why')}</h3>
        <p className="text-sm leading-relaxed text-ink-muted">
          <Inline text={lab.root_cause} />
        </p>
      </Card>
      <Card className="space-y-4 p-6">
        <IconTile icon={ShieldCheck} tone="green" />
        <h3 className="text-xl font-bold tracking-tight">{t('learn.fix')}</h3>
        <p className="text-sm leading-relaxed text-ink-muted">
          <Inline text={lab.fix} />
        </p>
      </Card>
      {/* The inverse card (the palette's "Inverted"): references are the way out of the lab. */}
      <div className="card flex flex-col gap-6 bg-inverse p-6 text-on-inverse sm:flex-row sm:p-8 lg:col-span-2">
        <span className="grid size-14 shrink-0 place-items-center bg-on-inverse text-inverse" aria-hidden>
          <BookOpen className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-4">
          <h3 className="text-2xl font-bold tracking-tight">{t('learn.refs')}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-on-inverse-muted/40 px-3 py-1 text-xs font-semibold text-on-inverse">
              OWASP {lab.owasp} {lab.owasp_name}
            </span>
            {lab.cwe.map((cwe) => (
              <span key={cwe} className="rounded-full border border-on-inverse-muted/40 px-3 py-1 font-mono text-xs font-semibold text-on-inverse">
                {cwe}
              </span>
            ))}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lab.references.map((ref) => (
              <li key={ref.url + ref.label}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-on-inverse underline decoration-on-inverse-muted/50 underline-offset-4 hover:decoration-on-inverse"
                >
                  {ref.label} <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
