 /**
 * Safely resolves an asset path for local dev, GitHub Pages, and production deployments.
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return path.startsWith('/') ? path : `/${path}`;
}



