import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type NginxCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type NginxCheckResult = {
  ok: boolean;
  locationsDir: string;
  checks: NginxCheckItem[];
};

export type ProjectTemplateFile = {
  path: string;
  content: string;
};

export type ProjectTemplatesResult = {
  cliCommand: string;
  files: ProjectTemplateFile[];
};

export async function fetchNginxCheck(): Promise<NginxCheckResult> {
  const token = getTokenClient();
  return await httpJson<NginxCheckResult>(`${apiBaseClient()}/setup/nginx-check`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchProjectTemplates(): Promise<ProjectTemplatesResult> {
  const token = getTokenClient();
  return await httpJson<ProjectTemplatesResult>(
    `${apiBaseClient()}/setup/project-templates`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}
