/**
 * Backend `status_color` alanları Bootstrap renk ADI döndürür
 * (hex değil): 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary'.
 * Schema tek doğruluk kaynağı olduğundan backend'i değiştirmiyoruz; bunun
 * yerine bu semantik adı koyu temaya uygun hex'e çeviriyoruz.
 */
export type BootstrapColor =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'primary'
  | 'secondary';

const COLOR_MAP: Record<string, string> = {
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#38bdf8',
  primary: '#0891b2',
  secondary: '#64748b',
};

export function statusHex(token: string | null | undefined): string {
  if (!token) return COLOR_MAP.secondary;
  return COLOR_MAP[token] ?? COLOR_MAP.secondary;
}
