import { notFound } from 'next/navigation';
import { DevToolsClientView } from './DevToolsClientView';
import { isProd } from '@/lib/isProd';

export default function DevToolsPage() {
  if (isProd()) {
    notFound();
  }

  return <DevToolsClientView />;
}
