import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings2, Package, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { UrlTabs } from '@/components/ui/url-tabs';
import { AssetFilters } from './components/AssetFilters';
import { AssetItemCard, DraggableAssetCard } from './components/AssetItemCard';
import { AssetForm } from './components/AssetForm';
import { AssetStats } from './components/AssetStats';
import { api } from '@/store/api/internalApi';
import type { AssetItem, AssetType } from '@/store/types';

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400' },
    maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    retired: { label: 'Retired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export const AssetsPage = () => {
    const { t } = useLanguage();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    // Redux state
    const { value: assetItems, loading } = useSelector(
        (state: RootState) => (state as any).assetItems || { value: [], loading: false }
    );
    const { value: assetTypes } = useSelector(
        (state: RootState) => (state as any).assetTypes || { value: [] }
    );
    const { value: spots } = useSelector(
        (state: RootState) => (state as any).spots || { value: [] }
    );
    const { value: users } = useSelector(
        (state: RootState) => (state as any).users || { value: [] }
    );
    const { value: teams } = useSelector(
        (state: RootState) => (state as any).teams || { value: [] }
    );

    // Local state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [localAssetOrder, setLocalAssetOrder] = useState<number[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    
    // Debounce timer for persisting order
    const reorderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch data on mount
    useEffect(() => {
        dispatch(genericInternalActions.assetItems.getFromIndexedDB(undefined));
        dispatch(genericInternalActions.assetItems.fetchFromAPI(undefined));
        dispatch(genericInternalActions.assetTypes.getFromIndexedDB(undefined));
        dispatch(genericInternalActions.assetTypes.fetchFromAPI(undefined));
    }, [dispatch]);

    // Cleanup reorder timeout on unmount
    useEffect(() => {
        return () => {
            if (reorderTimeoutRef.current) {
                clearTimeout(reorderTimeoutRef.current);
            }
        };
    }, []);

    // Filter assets
    const filteredAssets = useMemo(() => {
        const filtered = (assetItems as AssetItem[]).filter((asset) => {
            if (asset.deleted_at) return false;

            // Search filter
            if (search) {
                const q = search.toLowerCase();
                const matches = asset.name.toLowerCase().includes(q)
                    || (asset.serial_number && asset.serial_number.toLowerCase().includes(q))
                    || (asset.model && asset.model.toLowerCase().includes(q))
                    || (asset.manufacturer && asset.manufacturer.toLowerCase().includes(q));
                if (!matches) return false;
            }

            // Status filter
            if (statusFilter !== 'all' && asset.status !== statusFilter) return false;

            // Type filter
            if (typeFilter !== 'all' && asset.asset_type_id !== parseInt(typeFilter)) return false;

            return true;
        });

        // Apply custom ordering if available (local override)
        if (localAssetOrder.length > 0) {
            const orderMap = new Map(localAssetOrder.map((id, index) => [id, index]));
            return [...filtered].sort((a, b) => {
                const orderA = orderMap.get(a.id) ?? Infinity;
                const orderB = orderMap.get(b.id) ?? Infinity;
                return orderA - orderB;
            });
        }

        // Otherwise, sort by display_order from backend (default to 0)
        return [...filtered].sort((a, b) => {
            const orderA = (a as any).display_order ?? 0;
            const orderB = (b as any).display_order ?? 0;
            return orderA - orderB;
        });
    }, [assetItems, search, statusFilter, typeFilter, localAssetOrder]);

    // Update local order when filtered assets change
    useEffect(() => {
        if (localAssetOrder.length === 0 && filteredAssets.length > 0) {
            setLocalAssetOrder(filteredAssets.map(a => a.id));
        }
    }, [filteredAssets.length]);

    // Reset order when filters change
    useEffect(() => {
        setLocalAssetOrder([]);
    }, [search, statusFilter, typeFilter]);

    // Get asset IDs for SortableContext
    const assetIds = useMemo(() => filteredAssets.map(a => a.id), [filteredAssets]);

    // DnD handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            setLocalAssetOrder((items) => {
                const currentOrder = items.length > 0 ? items : filteredAssets.map(a => a.id);
                const oldIndex = currentOrder.indexOf(active.id as number);
                const newIndex = currentOrder.indexOf(over.id as number);
                const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

                // Debounce the API call to avoid too many requests during rapid reordering
                if (reorderTimeoutRef.current) {
                    clearTimeout(reorderTimeoutRef.current);
                }
                reorderTimeoutRef.current = setTimeout(() => {
                    // Build the items array with new display_order values
                    const reorderPayload = newOrder.map((id, index) => ({
                        id,
                        display_order: index,
                    }));

                    // Persist to backend
                    api.post('/asset-items-reorder', { items: reorderPayload })
                        .then(() => {
                            // Refresh assets from API to get updated display_order values
                            dispatch(genericInternalActions.assetItems.fetchFromAPI(undefined));
                        })
                        .catch((err) => {
                            console.error('Failed to persist asset order:', err);
                        });
                }, 500);

                return newOrder;
            });
        }
    }, [filteredAssets, dispatch]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    // Get active asset for DragOverlay
    const activeAsset = activeId ? filteredAssets.find(a => a.id === activeId) : null;

    // Lookup helpers
    const getTypeName = (typeId: number) => {
        const type = (assetTypes as AssetType[]).find(t => t.id === typeId);
        return type?.name || '-';
    };
    const getType = (typeId: number) => {
        return (assetTypes as AssetType[]).find(t => t.id === typeId);
    };
    const getSpotName = (spotId: number | null | undefined) => {
        if (!spotId) return undefined;
        const spot = (spots as any[]).find(s => s.id === spotId);
        return spot?.name;
    };
    const getUserName = (userId: number | null | undefined) => {
        if (!userId) return undefined;
        const user = (users as any[]).find(u => u.id === userId);
        return user?.name;
    };
    const getTeamName = (teamId: number | null | undefined) => {
        if (!teamId) return undefined;
        const team = (teams as any[]).find(t => t.id === teamId);
        return team?.name;
    };

    const handleCreate = async (data: Partial<AssetItem>) => {
        await dispatch(genericActions.assetItems.addAsync(data) as any);
    };

    const activeTypes = (assetTypes as AssetType[]).filter(t => !t.deleted_at);

    // Assets list content
    const assetsListContent = (
        <>
            {/* Actions bar */}
            <div className="flex items-center justify-between mb-6">
                <AssetFilters
                    search={search}
                    onSearchChange={setSearch}
                    status={statusFilter}
                    onStatusChange={setStatusFilter}
                    assetTypeId={typeFilter}
                    onAssetTypeChange={setTypeFilter}
                    assetTypes={activeTypes}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
                <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => navigate('/assets/types')}>
                        <Settings2 className="h-4 w-4 mr-1" />
                        {t('assets.manageTypes', 'Types')}
                    </Button>
                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('assets.addAsset', 'Add Asset')}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {search || statusFilter !== 'all' || typeFilter !== 'all'
                            ? t('assets.noResults', 'No assets match your filters.')
                            : t('assets.empty', 'No assets yet. Create your first asset to get started.')}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <SortableContext items={assetIds} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                            {filteredAssets.map((asset: AssetItem) => (
                                <DraggableAssetCard
                                    key={asset.id}
                                    asset={asset}
                                    assetType={getType(asset.asset_type_id)}
                                    spotName={getSpotName(asset.spot_id)}
                                    assignedUserName={getUserName(asset.assigned_user_id)}
                                    assignedTeamName={getTeamName(asset.assigned_team_id)}
                                    onClick={() => navigate(`/assets/${asset.id}`)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeAsset ? (
                            <AssetItemCard
                                asset={activeAsset}
                                assetType={getType(activeAsset.asset_type_id)}
                                spotName={getSpotName(activeAsset.spot_id)}
                                assignedUserName={getUserName(activeAsset.assigned_user_id)}
                                assignedTeamName={getTeamName(activeAsset.assigned_team_id)}
                                onClick={() => {}}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('assets.table.name', 'Name')}</TableHead>
                                <TableHead>{t('assets.table.type', 'Type')}</TableHead>
                                <TableHead>{t('assets.table.status', 'Status')}</TableHead>
                                <TableHead>{t('assets.table.location', 'Location')}</TableHead>
                                <TableHead>{t('assets.table.serial', 'Serial')}</TableHead>
                                <TableHead>{t('assets.table.assignedTo', 'Assigned To')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssets.map((asset: AssetItem) => {
                                const status = statusConfig[asset.status] || statusConfig.active;
                                return (
                                    <TableRow
                                        key={asset.id}
                                        className="cursor-pointer"
                                        onClick={() => navigate(`/assets/${asset.id}`)}
                                    >
                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                        <TableCell>{getTypeName(asset.asset_type_id)}</TableCell>
                                        <TableCell>
                                            <Badge className={`border-0 ${status.className}`}>
                                                {t(`assets.status.${asset.status}`, status.label)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getSpotName(asset.spot_id) || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{asset.serial_number || '-'}</TableCell>
                                        <TableCell>{getUserName(asset.assigned_user_id) || getTeamName(asset.assigned_team_id) || '-'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    );

    // Tab configuration
    const tabs = [
        {
            value: 'list',
            label: (
                <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('assets.tabs.assets', 'Assets')}
                </span>
            ),
            content: <div className="pt-6">{assetsListContent}</div>,
        },
        {
            value: 'stats',
            label: (
                <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t('assets.tabs.stats', 'Statistics')}
                </span>
            ),
            content: <div className="pt-6"><AssetStats /></div>,
        },
    ];

    return (
        <PageContainer
            title={t('assets.title', 'Assets')}
            subtitle={t('assets.subtitle', 'Track and manage your organization\'s assets')}
        >
            <UrlTabs
                tabs={tabs}
                defaultValue="list"
                basePath="/assets"
                tabParam="tab"
            />

            {/* Create dialog */}
            <AssetForm
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSubmit={handleCreate}
                assetTypes={activeTypes}
                spots={spots}
                users={users}
                teams={teams}
            />
        </PageContainer>
    );
};
