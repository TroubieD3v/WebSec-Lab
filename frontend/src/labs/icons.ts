import {
  ArrowLeftRight,
  CodeXml,
  Database,
  FileKey,
  FolderTree,
  KeyRound,
  MessageSquareWarning,
  Settings2,
  ShieldOff,
  Ticket,
  Timer,
  Upload,
  type LucideIcon,
} from 'lucide-react'

/** One icon per lab, used on the dashboard cards and the lab header. */
export const LAB_ICONS: Record<string, LucideIcon> = {
  'sql-injection': Database,
  xss: CodeXml,
  'stored-xss': MessageSquareWarning,
  idor: FileKey,
  'broken-access-control': ShieldOff,
  csrf: ArrowLeftRight,
  'broken-auth': KeyRound,
  jwt: Ticket,
  'path-traversal': FolderTree,
  'file-upload': Upload,
  'security-misconfiguration': Settings2,
  'race-condition': Timer,
}
