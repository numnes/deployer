/**
 * Espelha `sanitize_branch_slug` + `pm2_app_name` do core (`core/lib/common.sh`).
 */
export function sanitizeBranchSlug(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pm2AppName(projectSlug: string, branch: string): string {
  return `${projectSlug}-${sanitizeBranchSlug(branch)}`;
}
