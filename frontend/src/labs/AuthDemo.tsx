import { useState, type FormEvent } from 'react'
import { Badge, Button, Card, CodeBlock, StatusChip } from '../components/ui'
import { useI18n } from '../i18n'
import { labRequest, tryJson } from '../services/api'
import type { DemoProps } from './types'

// Common passwords, ordered roughly by popularity. Alice's password is in here.
const WORDLIST = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
  '1234567', 'iloveyou', 'adobe123', '123123', 'sunshine', 'welcome', 'admin', 'letmein',
]

interface LogEntry {
  line: string
  status: number
}

export function AuthDemo({ mode, onActivity }: DemoProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('alice')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [oldToken, setOldToken] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [note, setNote] = useState<{ tone: 'green' | 'red' | 'amber'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const push = (line: string, status: number) => setLog((l) => [{ line, status }, ...l].slice(0, 40))

  const bearer = (value: string | null) => (value ? { Authorization: `Bearer ${value}` } : undefined)

  const login = async (user: string, pass: string) => {
    const r = await labRequest('broken-auth', mode, {
      method: 'POST',
      path: 'login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass }),
    })
    const data = tryJson(r.body) as { token?: string; detail?: string } | undefined
    push(`POST /login ${user}:${pass || '∅'} → ${data?.token ?? data?.detail ?? r.body.slice(0, 60)}`, r.status)
    return { status: r.status, token: data?.token }
  }

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await login(username, password)
    if (r.token) {
      setToken(r.token)
      setOldToken(null)
    }
    setBusy(false)
    onActivity()
  }

  const callMe = async (value: string | null, label: string) => {
    setBusy(true)
    const r = await labRequest('broken-auth', mode, { method: 'GET', path: 'me', headers: bearer(value) })
    push(`GET /me [${label}] → ${r.body.slice(0, 70)}`, r.status)
    if (r.status === 200 && label === 'old token') setNote({ tone: 'red', text: t('auth.sessionAlive') })
    setBusy(false)
    onActivity()
  }

  const logout = async () => {
    setBusy(true)
    const r = await labRequest('broken-auth', mode, { method: 'POST', path: 'logout', headers: bearer(token) })
    push('POST /logout', r.status)
    setOldToken(token)
    setToken(null)
    setBusy(false)
    onActivity()
  }

  const runWordlist = async () => {
    setBusy(true)
    setNote(null)
    let attempts = 0
    for (const guess of WORDLIST) {
      attempts += 1
      const r = await login('alice', guess)
      if (r.status === 429) {
        setNote({ tone: 'green', text: t('auth.locked', { n: attempts }) })
        setBusy(false)
        onActivity()
        return
      }
      if (r.status === 200) {
        setNote({ tone: 'red', text: t('auth.found', { pw: guess, n: attempts }) })
        setToken(r.token ?? null)
        setBusy(false)
        onActivity()
        return
      }
    }
    setNote({ tone: 'amber', text: t('auth.exhausted') })
    setBusy(false)
    onActivity()
  }

  const input = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm'
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-4">
        <form onSubmit={onLogin} className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('auth.user')}</span>
            <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} data-testid="auth-user" autoComplete="off" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-zinc-500">{t('auth.pass')}</span>
            <input className={input} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="auth-pass" autoComplete="off" />
          </label>
          <Button type="submit" variant="primary" disabled={busy} className="sm:col-span-2" data-testid="auth-login">
            {t('auth.login')}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => callMe(token, 'token')} disabled={busy || !token} data-testid="auth-me">
            {t('auth.me')}
          </Button>
          <Button onClick={logout} disabled={busy || !token} data-testid="auth-logout">
            {t('auth.logout')}
          </Button>
          <Button onClick={() => callMe(oldToken, 'old token')} disabled={busy || !oldToken} data-testid="auth-old">
            {t('auth.oldToken')}
          </Button>
        </div>
        <Button variant="secondary" onClick={runWordlist} loading={busy} data-testid="auth-wordlist">
          {busy ? t('auth.running') : t('auth.wordlist')}
        </Button>
        <p className="text-xs text-zinc-500">
          {t('auth.token')}: <span className="font-mono text-zinc-300" data-testid="auth-token">{token ?? t('auth.none')}</span>
        </p>
        {note && (
          <Badge tone={note.tone} className="whitespace-normal" data-testid="auth-note">
            {note.text}
          </Badge>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">{t('auth.log')}</h3>
        <CodeBlock className="max-h-80 space-y-1 overflow-y-auto" data-testid="auth-log">
          {log.length === 0 && ' '}
          {log.map((entry, i) => (
            <div key={i} className="flex items-start gap-2">
              <StatusChip status={entry.status} />
              <span className="min-w-0 break-all">{entry.line}</span>
            </div>
          ))}
        </CodeBlock>
      </Card>
    </div>
  )
}
