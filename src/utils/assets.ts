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

  if (typeof window !== 'undefined') {
    try {
      const baseUrl = (import.meta as any).env?.BASE_URL || './';
      if (baseUrl !== './' && baseUrl !== '/') {
        const base = baseUrl.startsWith('/') ? baseUrl : '/' + baseUrl;
        const normalizedBase = base.endsWith('/') ? base : base + '/';
        return `${window.location.origin}${normalizedBase}${cleanPath}`;
      }
      // For relative BASE_URL ('./'), resolve against current location with proper trailing slash handling
      const baseHref = window.location.href.endsWith('/') ? window.location.href : window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      return new URL(cleanPath, baseHref).href;
    } catch (e) {
      // Fallback
    }
  }
  
  // import.meta.env.BASE_URL is injected by Vite at build time
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  return `${prefix}${cleanPath}`;
}

