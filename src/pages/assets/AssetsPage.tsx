import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings2 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { AssetFilters } from './components/AssetFilters';
import { AssetItemCard } from './components/AssetItemCard';
import { AssetForm } from './components/AssetForm';
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

    // Fetch data on mount
    useEffect(() => {
        dispatch(genericInternalActions.assetItems.getFromIndexedDB());
        dispatch(genericInternalActions.assetItems.fetchFromAPI());
        dispatch(genericInternalActions.assetTypes.getFromIndexedDB());
        dispatch(genericInternalActions.assetTypes.fetchFromAPI());
    }, [dispatch]);

    // Filter assets
    const filteredAssets = useMemo(() => {
        return (assetItems as AssetItem[]).filter((asset) => {
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
    }, [assetItems, search, statusFilter, typeFilter]);

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

    return (
        <PageContainer
            title={t('assets.title', 'Assets')}
            subtitle={t('assets.subtitle', 'Track and manage your organization\'s assets')}
        >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAssets.map((asset: AssetItem) => (
                        <AssetItemCard
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
