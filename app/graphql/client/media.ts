const HTTP_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// http://host:port/graphql/  ->  http://host:port
const API_ORIGIN = HTTP_URL.replace(/\/graphql\/?$/, '');

/** Backend'in döndürdüğü göreli medya yollarını (örn. "/media/...") mutlak URL'e çevirir. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
