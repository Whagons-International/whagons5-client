import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetType } from '@/store/types';

interface AssetFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    assetTypeId: string;
    onAssetTypeChange: (value: string) => void;
    assetTypes: AssetType[];
    viewMode: 'grid' | 'table';
    onViewModeChange: (mode: 'grid' | 'table') => void;
}

export const AssetFilters = ({
    search,
    onSearchChange,
    status,
    onStatusChange,
    assetTypeId,
    onAssetTypeChange,
    assetTypes,
    viewMode,
    onViewModeChange,
}: AssetFiltersProps) => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Input
                placeholder={t('assets.filters.search', 'Search assets...')}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full sm:w-64"
            />
            <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder={t('assets.filters.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('assets.filters.allStatuses', 'All Statuses')}</SelectItem>
                    <SelectItem value="active">{t('assets.status.active', 'Active')}</SelectItem>
                    <SelectItem value="inactive">{t('assets.status.inactive', 'Inactive')}</SelectItem>
                    <SelectItem value="maintenance">{t('assets.status.maintenance', 'Maintenance')}</SelectItem>
                    <SelectItem value="retired">{t('assets.status.retired', 'Retired')}</SelectItem>
                </SelectContent>
            </Select>
            <Select value={assetTypeId} onValueChange={onAssetTypeChange}>
                <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder={t('assets.filters.allTypes', 'All Types')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('assets.filters.allTypes', 'All Types')}</SelectItem>
                    {assetTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                            {type.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex gap-1 ml-auto">
                <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => onViewModeChange('grid')}
                    className="h-9 w-9"
                >
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => onViewModeChange('table')}
                    className="h-9 w-9"
                >
                    <List className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
