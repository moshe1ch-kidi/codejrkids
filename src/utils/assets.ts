/**
 * Safely resolves an asset path considering Vite's BASE_URL.
 */
const resolvedBaseUrl = (() => {
  if (typeof window !== 'undefined') {
    const base = (import.meta as any).env?.BASE_URL || '/';
    if (base && base !== './' && base !== '/') {
      return base.startsWith('/') ? base : '/' + base;
    }
  }
  return (import.meta as any).env?.BASE_URL || '/';
})();

const basePrefix = resolvedBaseUrl.endsWith('/') ? resolvedBaseUrl : resolvedBaseUrl + '/';

export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('file:')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If basePrefix is relative like './', we can just prepend it or use root-relative
  if (basePrefix === './' || basePrefix === '="./') {
    return './' + cleanPath;
  }

  return basePrefix + cleanPath;
}


