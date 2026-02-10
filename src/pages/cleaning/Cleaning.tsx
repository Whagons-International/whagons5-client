import { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Droplet, Clock, User, Filter, LayoutGrid, Grid3x3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/providers/LanguageProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBroom } from '@fortawesome/free-solid-svg-icons';
import { RootState, AppDispatch } from '@/store/store';
import { genericActions, genericInternalActions } from '@/store/genericSlices';
import { Spot, CleaningStatus } from '@/store/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const cleanCardShimmerStyles = `
  @keyframes cleaning-shimmer {
    0% { transform: translateX(-100%) skewX(-15deg); }
    100% { transform: translateX(200%) skewX(-15deg); }
  }
  .cleaning-shimmer-band {
    animation: cleaning-shimmer 2.5s ease-in-out infinite;
  }
`;

function Cleaning() {
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { value: spots, loading: spotsLoading } = useSelector(
    (state: RootState) => (state as any).spots || { value: [], loading: false }
  );
  const { value: cleaningStatuses, loading: statusesLoading } = useSelector(
    (state: RootState) => (state as any).cleaningStatuses || { value: [], loading: false }
  );
  const { value: users } = useSelector(
    (state: RootState) => (state as any).users || { value: [] }
  );
  const { value: plugins } = useSelector(
    (state: RootState) => (state as any).plugins || { value: [] }
  );

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [showActiveTaskFilter, setShowActiveTaskFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');

  // Load data on mount
  useEffect(() => {
    // Load spots and cleaning statuses from IndexedDB first (for fast initial render)
    dispatch(genericInternalActions.spots.getFromIndexedDB() as any);
    dispatch(genericInternalActions.cleaningStatuses.getFromIndexedDB() as any);
    dispatch(genericInternalActions.users.getFromIndexedDB() as any);
    dispatch(genericInternalActions.plugins.getFromIndexedDB() as any);
    
    // Then fetch from API to ensure we have the latest data
    dispatch(genericInternalActions.spots.fetchFromAPI() as any);
    dispatch(genericInternalActions.cleaningStatuses.fetchFromAPI() as any);
    dispatch(genericInternalActions.users.fetchFromAPI() as any);
    dispatch(genericInternalActions.plugins.fetchFromAPI() as any);
  }, [dispatch]);

  // Get cleaning status by ID
  const getCleaningStatus = (statusId: number | null | undefined): CleaningStatus | null => {
    if (!statusId) return null;
    return cleaningStatuses.find((status: CleaningStatus) => status.id === statusId) || null;
  };

  // Get user name by ID
  const getUserName = (userId: number | null | undefined): string => {
    if (!userId) return '';
    const user = users.find((u: any) => u.id === userId);
    return user?.name || `User ${userId}`;
  };

  // Convert hex color to rgba with opacity for background
  const getBackgroundColor = (color: string | null | undefined): string => {
    if (!color) return 'rgba(243, 244, 246, 0.3)'; // Default gray with opacity
    
    // If color is already rgba, return as is
    if (color.startsWith('rgba')) return color;
    
    // Convert hex to rgba with 0.2 opacity
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, 0.2)`;
  };

  // Get cleaning plugin and extract spot_type_ids
  const cleaningPluginSpotTypeIds = useMemo(() => {
    const cleaningPlugin = plugins.find((p: any) => p.slug === 'cleaning');
    if (!cleaningPlugin || !cleaningPlugin.settings) {
      return null; // No filter if plugin not found or no settings
    }

    let settings = {};
    if (typeof cleaningPlugin.settings === 'string') {
      try {
        settings = JSON.parse(cleaningPlugin.settings);
      } catch (e) {
        console.error('Error parsing cleaning plugin settings:', e);
        return null;
      }
    } else if (typeof cleaningPlugin.settings === 'object') {
      settings = cleaningPlugin.settings;
    }

    const spotTypeIds = (settings as any).spot_type_ids;
    if (!Array.isArray(spotTypeIds) || spotTypeIds.length === 0) {
      return null; // No filter if no spot_type_ids configured
    }

    return spotTypeIds;
  }, [plugins]);

  // Filter spots
  const filteredSpots = useMemo(() => {
    return spots.filter((spot: Spot) => {
      // Exclude soft-deleted spots
      if (spot.deleted_at !== null && spot.deleted_at !== undefined) {
        return false;
      }

      // Filter by spot_type_ids from cleaning plugin
      if (cleaningPluginSpotTypeIds !== null) {
        if (!spot.spot_type_id || !cleaningPluginSpotTypeIds.includes(spot.spot_type_id)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery && !spot.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'no-status') {
          if (spot.cleaning_status_id !== null && spot.cleaning_status_id !== undefined) {
            return false;
          }
        } else {
          const statusId = parseInt(selectedStatusFilter);
          if (spot.cleaning_status_id !== statusId) {
            return false;
          }
        }
      }

      // Active task filter
      if (showActiveTaskFilter && !spot.current_cleaning_task_id) {
        return false;
      }

      return true;
    });
  }, [spots, cleaningPluginSpotTypeIds, searchQuery, selectedStatusFilter, showActiveTaskFilter]);

  // Sort cleaning statuses by order
  const sortedCleaningStatuses = useMemo(() => {
    return [...cleaningStatuses].sort((a: CleaningStatus, b: CleaningStatus) => a.order - b.order);
  }, [cleaningStatuses]);

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    const counts: Record<number | 'none', number> = { none: 0 };
    
    // Initialize counts for each status
    sortedCleaningStatuses.forEach((status: CleaningStatus) => {
      counts[status.id] = 0;
    });

    // Count filtered spots by status
    filteredSpots.forEach((spot: Spot) => {
      const statusId = spot.cleaning_status_id || 'none';
      if (counts[statusId] !== undefined) {
        counts[statusId]++;
      } else {
        counts['none']++;
      }
    });

    return counts;
  }, [filteredSpots, sortedCleaningStatuses]);

  // Handle status change
  const handleStatusChange = async (spot: Spot, newStatusId: number | null) => {
    if (newStatusId === spot.cleaning_status_id) {
      return;
    }

    try {
      await dispatch(
        genericActions.spots.updateAsync({
          id: spot.id,
          updates: { cleaning_status_id: newStatusId },
        }) as any
      );
    } catch (error) {
      console.error('Failed to update cleaning status:', error);
    }
  };

  const loading = spotsLoading || statusesLoading;

  return (
    <div className="p-4 space-y-4 bg-background text-foreground min-h-screen">
      <style>{cleanCardShimmerStyles}</style>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="text-emerald-500 text-3xl">
          <FontAwesomeIcon icon={faBroom} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
          {t('cleaning.title', 'Cleaning Management')}
        </h1>
      </div>

      {/* Filters */}
      <Card className="!py-2">
        <CardContent className="py-1.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/80 w-5 h-5 z-10" />
              <Input
                placeholder={t('cleaning.search.placeholder', 'Search spots...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-9 border-2 focus-visible:border-ring focus-visible:ring-2"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-56">
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('cleaning.filters.status', 'Filter by status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('cleaning.filters.all', 'All Statuses')}</SelectItem>
                  <SelectItem value="no-status">{t('cleaning.filters.no-status', 'No Status')}</SelectItem>
                  {sortedCleaningStatuses.map((status: CleaningStatus) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Task Filter */}
            <Button
              variant={showActiveTaskFilter ? 'default' : 'outline'}
              onClick={() => setShowActiveTaskFilter(!showActiveTaskFilter)}
              className="w-full sm:w-auto shrink-0 h-9"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('cleaning.filters.active-tasks', 'Active Tasks')}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1 shrink-0">
              <Button
                variant={viewMode === 'full' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('full')}
                className="h-7 px-2"
                title="Vista completa"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="h-7 px-2"
                title="Vista compacta"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      {!loading && (
        <Card className="!py-2">
          <CardContent className="py-2">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {sortedCleaningStatuses.map((status: CleaningStatus) => {
                const isSelected = selectedStatusFilter === String(status.id);
                return (
                  <div
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 rounded-md"
                    style={{
                      backgroundColor: isSelected ? `${status.color}20` : 'transparent',
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStatusFilter('all');
                      } else {
                        setSelectedStatusFilter(String(status.id));
                      }
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {status.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({statusCounts[status.id] || 0})
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t('cleaning.loading', 'Loading...')}</p>
        </div>
      )}

      {/* Spots Grid - min-w-0 on wrapper so long spot names truncate and don't push the status button out */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSpots.map((spot: Spot) => {
            const cleaningStatus = getCleaningStatus(spot.cleaning_status_id);
            const statusColor = cleaningStatus?.color || '#6b7280';
            const statusName = cleaningStatus?.name || t('cleaning.status.none', 'No Status');
            const statusCode = cleaningStatus?.code || null;
            const isCleanState = cleaningStatus?.is_clean_state === true;
            const backgroundColor = getBackgroundColor(statusColor);

            return (
              <div key={spot.id} className="min-w-0">
              <Card
                className={`hover:shadow-lg transition-all relative min-w-0 overflow-hidden ${isCleanState ? 'shadow-[0_0_28px_rgba(16,185,129,0.25)]' : ''}`}
                style={{
                  backgroundColor: backgroundColor,
                }}
              >
                {isCleanState && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[var(--card-radius)]">
                    <div
                      className="cleaning-shimmer-band absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      aria-hidden
                    />
                  </div>
                )}
                <CardHeader className={`relative z-10 ${viewMode === 'compact' ? 'pb-2 pt-2' : 'pb-1 pt-2'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <CardTitle className="text-base font-bold mb-0 truncate block" title={spot.name}>
                        {spot.name?.length > 25 ? `${spot.name.slice(0, 25)}...` : (spot.name ?? '')}
                      </CardTitle>
                      <p className="text-xs text-gray-600">Suite VIP</p>
                    </div>
                    <div className="shrink-0">
                      <Select
                        value={spot.cleaning_status_id ? String(spot.cleaning_status_id) : 'none'}
                        onValueChange={(value) => {
                          const newStatusId = value === 'none' ? null : parseInt(value);
                          handleStatusChange(spot, newStatusId);
                        }}
                      >
                        <SelectTrigger 
                          className={viewMode === 'compact' ? 'h-8 w-auto min-w-[100px] text-xs border-0 rounded-sm' : 'h-7 w-auto min-w-[100px] text-xs border-0 rounded-sm'}
                          style={{
                            backgroundColor: statusColor,
                            color: '#fff',
                          }}
                        >
                          <SelectValue>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{statusName.toUpperCase()}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                              {t('cleaning.status.none', 'No Status')}
                            </div>
                          </SelectItem>
                          {sortedCleaningStatuses.map((status: CleaningStatus) => (
                            <SelectItem key={status.id} value={String(status.id)}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                {status.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                {viewMode === 'full' && (
                  <CardContent className="space-y-2 pt-2">
                    {/* Status-specific content */}
                    {statusCode === 'SUCIA' && (
                      <div className="text-sm text-gray-600">
                        Sin asignar
                      </div>
                    )}
                    {statusCode === 'LIMPIANDO' && (
                      <div className="text-sm text-gray-600">
                        Limpiando...
                      </div>
                    )}
                    {statusCode === 'LIMPIA' && (
                      <div className="text-sm text-gray-600">
                        Lista para check-in
                      </div>
                    )}
                    {statusCode === 'INSPECCIONADA' && (
                      <div className="text-sm text-gray-600">
                        Aprobada por supervisor
                      </div>
                    )}
                    {!statusCode && (
                      <div className="text-sm text-gray-600">
                        Sin estado asignado
                      </div>
                    )}

                    {/* Last Cleaned Section */}
                    <div className="pt-1.5 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-0.5">
                        Última limpieza
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>
                          {spot.last_cleaned_at
                            ? dayjs(spot.last_cleaned_at).fromNow()
                            : 'Nunca'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSpots.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t('cleaning.empty', 'No spots found matching your filters')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Cleaning;
