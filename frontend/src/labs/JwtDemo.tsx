import { useState } from 'react'
import { Badge, Button, Card, CodeBlock, fieldBase, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson, type LabResponse } from '../services/api'
import type { DemoProps } from './types'

const LAB = 'jwt'
const field = `w-full text-xs ${fieldBase}`

const encoder = new TextEncoder()
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const b64urlJson = (value: unknown) => b64url(encoder.encode(JSON.stringify(value)))
const decodePart = (part: string) => {
  try {
    const padded = part.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (part.length % 4)) % 4)
    return JSON.stringify(JSON.parse(atob(padded)), null, 2)
  } catch {
    return ''
  }
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

export function JwtDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('alice')
  const [password, setPassword] = useState('wonderland')
  const [token, setToken] = useState('')
  const [header, setHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [payload, setPayload] = useState('{\n  "sub": "alice",\n  "role": "user"\n}')
  const [secret, setSecret] = useState('secret')
  const [result, setResult] = useState<{ path: string; response: LabResponse } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = (value: string) => {
    setToken(value)
    const [h, p] = value.split('.')
    if (h) setHeader(decodePart(h) || header)
    if (p) setPayload(decodePart(p) || payload)
  }

  const login = async () => {
    setBusy(true)
    try {
      const r = await labRequest(LAB, mode, {
        method: 'POST',
        path: 'login',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = tryJson(r.body) as { token?: string } | undefined
      if (data?.token) load(data.token)
      setResult({ path: 'login', response: r })
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const build = async (signed: boolean) => {
    setError(null)
    try {
      const head = JSON.parse(header) as Record<string, unknown>
      const body = JSON.parse(payload)
      if (!signed) head.alg = 'none'
      const input = `${b64urlJson(head)}.${b64urlJson(body)}`
      setToken(`${input}.${signed ? b64url(await hmacSha256(secret, input)) : ''}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const call = async (path: 'me' | 'admin') => {
    setBusy(true)
    try {
      const response = await labRequest(LAB, mode, { method: 'GET', path, headers: { Authorization: `Bearer ${token}` } })
      setResult({ path, response })
      onActivity()
    } finally {
      setBusy(false)
    }
  }

  const admin = result?.path === 'admin' && result.response.status === 200
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-6">
        <h3 className="text-sm font-semibold">{t('jwt.login')}</h3>
        <div className="flex gap-2">
          <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} aria-label={t('auth.user')} data-testid="jwt-user" />
          <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} aria-label={t('auth.pass')} data-testid="jwt-pass" />
          <Button variant="primary" onClick={login} disabled={busy} data-testid="jwt-login">
            {t('auth.login')}
          </Button>
        </div>
        <h3 className="pt-2 text-sm font-semibold">{t('jwt.workbench')}</h3>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('jwt.header')}</span>
          <textarea className={field} rows={4} value={header} onChange={(e) => setHeader(e.target.value)} spellCheck={false} data-testid="jwt-header" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('jwt.payload')}</span>
          <textarea className={field} rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} spellCheck={false} data-testid="jwt-payload" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('jwt.secret')}</span>
          <input className={field} value={secret} onChange={(e) => setSecret(e.target.value)} spellCheck={false} data-testid="jwt-secret" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => build(true)} data-testid="jwt-sign">
            {t('jwt.sign')}
          </Button>
          <Button onClick={() => build(false)} data-testid="jwt-none">
            {t('jwt.none')}
          </Button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </Card>

      <Card surface="lowest" className="space-y-4 p-6" aria-live="polite">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-subtle">{t('jwt.token')}</span>
          <textarea className={field} rows={4} value={token} onChange={(e) => load(e.target.value.trim())} spellCheck={false} data-testid="jwt-token" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call('me')} disabled={busy || !token} data-testid="jwt-me">
            GET /me
          </Button>
          <Button variant="primary" onClick={() => call('admin')} disabled={busy || !token} data-testid="jwt-admin">
            GET /admin
          </Button>
        </div>
        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={result.response.status} data-testid="jwt-status" />
              {admin && (
                <Badge tone="red" data-testid="jwt-admin-open">
                  {t('jwt.adminOpen')}
                </Badge>
              )}
            </div>
            <CodeBlock className="whitespace-pre-wrap break-words" data-testid="jwt-body">
              {JSON.stringify(tryJson(result.response.body) ?? result.response.body, null, 2)}
            </CodeBlock>
          </>
        )}
        <p className="text-xs text-ink-subtle">{t('jwt.note')}</p>
      </Card>
    </div>
  )
}
