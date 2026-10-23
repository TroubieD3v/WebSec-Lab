import type { ComponentType } from 'react'
import { AccessControlDemo } from './AccessControlDemo'
import { AuthDemo } from './AuthDemo'
import { CsrfDemo } from './CsrfDemo'
import { FileUploadDemo } from './FileUploadDemo'
import { IdorDemo } from './IdorDemo'
import { JwtDemo } from './JwtDemo'
import { MisconfigDemo } from './MisconfigDemo'
import { PathTraversalDemo } from './PathTraversalDemo'
import { RaceDemo } from './RaceDemo'
import { SqlInjectionDemo } from './SqlInjectionDemo'
import { StoredXssDemo } from './StoredXssDemo'
import type { DemoProps } from './types'
import { XssDemo } from './XssDemo'

/** Interactive widget for each lab, keyed by lab id. */
export const DEMOS: Record<string, ComponentType<DemoProps>> = {
  'sql-injection': SqlInjectionDemo,
  xss: XssDemo,
  'stored-xss': StoredXssDemo,
  idor: IdorDemo,
  'broken-access-control': AccessControlDemo,
  'broken-auth': AuthDemo,
  'path-traversal': PathTraversalDemo,
  'security-misconfiguration': MisconfigDemo,
  csrf: CsrfDemo,
  jwt: JwtDemo,
  'file-upload': FileUploadDemo,
  'race-condition': RaceDemo,
}
