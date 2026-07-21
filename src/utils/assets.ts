 /**
 * Safely resolves an asset path for local dev, GitHub Pages, and production deployments.
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('file:')) {
    return path;
  }
  
  // import.meta.env.BASE_URL is injected by Vite at build time
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${prefix}${cleanPath}`;
}
