 /**
 * Safely resolves an asset path for local dev, GitHub Pages, and production deployments.
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('file:')) {
    return path;
  }
  
  // Remove leading slash if present so it resolves relative to baseURI correctly
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (typeof window !== 'undefined') {
    try {
      const base = document.baseURI || window.location.href;
      return new URL(cleanPath, base).href;
    } catch (e) {
      // Fallback below
    }
  }

  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${prefix}${cleanPath}`;
}



