import type { Project } from '@/app/projects/::handlers/projects';

/**
 * Nome PM2 do core: `<slug>-<branch-slug-sanitizado>`.
 * URL nginx: `<serverUrl>/<branch-slug>/`
 */
export function previewUrlFromPm2Name(
  pm2Name: string,
  projects: Project[],
): string | null {
  const sorted = [...projects].sort((a, b) => b.slug.length - a.slug.length);
  for (const p of sorted) {
    const prefix = `${p.slug}-`;
    if (pm2Name.startsWith(prefix)) {
      const branchSlug = pm2Name.slice(prefix.length);
      if (!p.serverUrl?.trim() || !branchSlug) return null;
      const base = p.serverUrl.replace(/\/+$/, '');
      return `${base}/${branchSlug}/`;
    }
  }
  return null;
}
