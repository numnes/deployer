import {
  DEMO_INSTANCE_STATIC_PARAMS,
} from '@/demo/fixtures';
import InstanceDetailClient from './InstanceDetailClient';

export function generateStaticParams() {
  if (process.env.NEXT_PUBLIC_DEMO === '1') {
    return DEMO_INSTANCE_STATIC_PARAMS;
  }
  return [];
}

export default function InstanceDetailPage() {
  return <InstanceDetailClient />;
}
