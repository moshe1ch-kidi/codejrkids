/**
 * Safely resolves an asset path considering Vite's BASE_URL (e.g. for GitHub Pages).
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // import.meta.env.BASE_URL is injected by Vite at build time
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  return `${prefix}${cleanPath}`;
}
