import { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Droplet, Clock, User, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/providers/LanguageProvider';
import { RootState, AppDispatch } from '@/store/store';
import { genericActions, genericInternalActions } from '@/store/genericSlices';
import { Spot, CleaningStatus } from '@/store/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [showActiveTaskFilter, setShowActiveTaskFilter] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isChangeStatusDialogOpen, setIsChangeStatusDialogOpen] = useState(false);
  const [newStatusId, setNewStatusId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    // Load spots and cleaning statuses from IndexedDB first (for fast initial render)
    dispatch(genericInternalActions.spots.getFromIndexedDB() as any);
    dispatch(genericInternalActions.cleaningStatuses.getFromIndexedDB() as any);
    dispatch(genericInternalActions.users.getFromIndexedDB() as any);
    
    // Then fetch from API to ensure we have the latest data
    dispatch(genericInternalActions.spots.fetchFromAPI() as any);
    dispatch(genericInternalActions.cleaningStatuses.fetchFromAPI() as any);
    dispatch(genericInternalActions.users.fetchFromAPI() as any);
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

  // Filter spots
  const filteredSpots = useMemo(() => {
    return spots.filter((spot: Spot) => {
      // Exclude soft-deleted spots
      if (spot.deleted_at !== null && spot.deleted_at !== undefined) {
        return false;
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
  }, [spots, searchQuery, selectedStatusFilter, showActiveTaskFilter]);

  // Sort cleaning statuses by order
  const sortedCleaningStatuses = useMemo(() => {
    return [...cleaningStatuses].sort((a: CleaningStatus, b: CleaningStatus) => a.order - b.order);
  }, [cleaningStatuses]);

  // Handle spot click
  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
    setNewStatusId(spot.cleaning_status_id || null);
    setIsChangeStatusDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedSpot || newStatusId === selectedSpot.cleaning_status_id) {
      setIsChangeStatusDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        genericActions.spots.updateAsync({
          id: selectedSpot.id,
          updates: { cleaning_status_id: newStatusId },
        }) as any
      );
      setIsChangeStatusDialogOpen(false);
      setSelectedSpot(null);
      setNewStatusId(null);
    } catch (error) {
      console.error('Failed to update cleaning status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = spotsLoading || statusesLoading;

  return (
    <div className="p-6 space-y-6 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            {t('cleaning.title', 'Cleaning Management')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('cleaning.description', 'Manage and track cleaning status of spots')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('cleaning.search.placeholder', 'Search spots...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-64">
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger>
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
              className="w-full sm:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('cleaning.filters.active-tasks', 'Active Tasks')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t('cleaning.loading', 'Loading...')}</p>
        </div>
      )}

      {/* Spots Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSpots.map((spot: Spot) => {
            const cleaningStatus = getCleaningStatus(spot.cleaning_status_id);
            const hasActiveTask = !!spot.current_cleaning_task_id;
            const statusColor = cleaningStatus?.color || '#6b7280';
            const statusName = cleaningStatus?.name || t('cleaning.status.none', 'No Status');

            return (
              <Card
                key={spot.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSpotClick(spot)}
                style={{
                  borderLeft: `4px solid ${statusColor}`,
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{spot.name}</CardTitle>
                    {hasActiveTask && (
                      <Badge variant="secondary" className="ml-2">
                        <Droplet className="w-3 h-3 mr-1" />
                        {t('cleaning.active-task', 'Active')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="text-sm font-medium">{statusName}</span>
                  </div>

                  {/* Last Cleaned Info */}
                  {spot.last_cleaned_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {t('cleaning.last-cleaned', 'Last cleaned')}:{' '}
                        {dayjs(spot.last_cleaned_at).fromNow()}
                      </span>
                    </div>
                  )}

                  {/* Last Cleaned By */}
                  {spot.last_cleaned_by && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{getUserName(spot.last_cleaned_by)}</span>
                    </div>
                  )}

                  {/* Click hint */}
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {t('cleaning.click-to-change', 'Click to change status')}
                  </p>
                </CardContent>
              </Card>
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

      {/* Change Status Dialog */}
      <Dialog open={isChangeStatusDialogOpen} onOpenChange={setIsChangeStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('cleaning.dialog.title', 'Change Cleaning Status')}
            </DialogTitle>
            <DialogDescription>
              {selectedSpot && (
                <>
                  {t('cleaning.dialog.description', 'Select a new cleaning status for')}{' '}
                  <strong>{selectedSpot.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>{t('cleaning.dialog.status-label', 'Cleaning Status')}</Label>
            <Select
              value={newStatusId ? String(newStatusId) : 'none'}
              onValueChange={(value) => setNewStatusId(value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('cleaning.dialog.select-status', 'Select status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('cleaning.status.none', 'No Status')}
                </SelectItem>
                {sortedCleaningStatuses.map((status: CleaningStatus) => (
                  <SelectItem key={status.id} value={String(status.id)}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                      {status.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {status.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangeStatusDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleStatusChange} disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Cleaning;
