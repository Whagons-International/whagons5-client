import { useMemo } from 'react';
import { useTable } from '@/store/dexie';

interface Plugin {
  id: number;
  slug: string;
  name: string;
  is_enabled: boolean;
}

/**
 * Hook to check if a specific plugin is enabled
 * @param pluginSlug - The slug of the plugin to check (e.g., 'working-hours')
 * @returns Object with isEnabled boolean and plugin data
 */
export function usePluginEnabled(pluginSlug: string) {
  const plugins = useTable<Plugin>('plugins');
  const loading = plugins === undefined;

  const result = useMemo(() => {
    const pluginList = plugins || [];
    const plugin = pluginList.find(p => p.slug === pluginSlug);
    return {
      isEnabled: plugin?.is_enabled ?? false,
      plugin,
      loading
    };
  }, [plugins, pluginSlug, loading]);

  return result;
}

/**
 * Hook specifically for Working Hours plugin
 */
export function useWorkingHoursPlugin() {
  return usePluginEnabled('working-hours');
}

export default usePluginEnabled;
