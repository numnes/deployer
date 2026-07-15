import {
  DEMO_PROJECT_STATIC_PARAMS,
} from '@/demo/fixtures';
import ProjectSettingsClient from './ProjectSettingsClient';

export function generateStaticParams() {
  if (process.env.NEXT_PUBLIC_DEMO === '1') {
    return DEMO_PROJECT_STATIC_PARAMS;
  }
  return [];
}

export default function ProjectSettingsPage() {
  return <ProjectSettingsClient />;
}
