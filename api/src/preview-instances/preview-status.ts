export const PREVIEW_STATUSES = [
  'waiting',
  'deploying',
  'active',
  'paused',
  'error',
] as const;

export type PreviewStatus = (typeof PREVIEW_STATUSES)[number];

export function isPreviewStatus(s: string): s is PreviewStatus {
  return (PREVIEW_STATUSES as readonly string[]).includes(s);
}
