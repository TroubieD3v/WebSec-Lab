import type { Mode } from '../services/api'

export interface DemoProps {
  mode: Mode
  /** Call after any request so the platform can re-check whether the challenge was solved. */
  onActivity: () => void
}
