import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

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
  const { value: plugins, loading } = useSelector(
    (state: RootState) => state.plugins
  ) as { value: Plugin[]; loading: boolean };

  const result = useMemo(() => {
    const plugin = plugins.find(p => p.slug === pluginSlug);
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
