export type ProjectRegistrationFields = {
  slug: string;
  gitUrl: string;
  serverUrl?: string | null;
};

export function parseProjectRegistrationJson(raw: string): ProjectRegistrationFields {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error('Invalid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON must be an object.');
  }

  const root = parsed as Record<string, unknown>;
  const project =
    root.project && typeof root.project === 'object'
      ? (root.project as Record<string, unknown>)
      : root;

  const slug = String(project.slug ?? '').trim();
  const gitUrl = String(project.gitUrl ?? project.git_url ?? '').trim();
  const serverRaw = project.serverUrl ?? project.server_url;
  const serverUrl =
    serverRaw == null || String(serverRaw).trim() === ''
      ? null
      : String(serverRaw).trim();

  if (!slug) {
    throw new Error('Missing slug in JSON.');
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error('Invalid slug (lowercase letters, numbers, hyphens).');
  }
  if (!gitUrl) {
    throw new Error('Missing gitUrl in JSON.');
  }

  return { slug, gitUrl, serverUrl };
}
