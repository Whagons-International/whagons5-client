import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePluginEnabled } from '@/hooks/usePluginEnabled';
import { Loader2 } from 'lucide-react';

interface PluginGuardProps {
  pluginSlug: string;
  children: ReactNode;
  fallbackPath?: string;
  showLoader?: boolean;
}

/**
 * Guard component that only renders children if the specified plugin is enabled.
 * Redirects to fallbackPath (default: '/') if plugin is disabled.
 */
export function PluginGuard({
  pluginSlug,
  children,
  fallbackPath = '/',
  showLoader = true
}: PluginGuardProps) {
  const { isEnabled, loading } = usePluginEnabled(pluginSlug);

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isEnabled) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Specific guard for Working Hours plugin
 */
export function WorkingHoursGuard({
  children,
  fallbackPath = '/plugins',
  showLoader = true
}: Omit<PluginGuardProps, 'pluginSlug'>) {
  return (
    <PluginGuard pluginSlug="working-hours" fallbackPath={fallbackPath} showLoader={showLoader}>
      {children}
    </PluginGuard>
  );
}

export default PluginGuard;
