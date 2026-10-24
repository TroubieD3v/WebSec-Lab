import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'websec-theme'

const current = (): Theme => (document.documentElement.classList.contains('light') ? 'light' : 'dark')

/** Dark by default; the choice is kept in localStorage and applied before paint by /theme-init.js. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(current)
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // storage may be unavailable (private mode); the theme still applies for this visit
    }
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return [theme, toggle]
}
