import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ArrowLeft, GripVertical, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/providers/LanguageProvider';
import { AssetTypeForm } from './components/AssetTypeForm';
import { getAssetTypeIcon } from './components/assetTypeIcons';
import type { AssetType, AssetItem, AssetCustomField } from '@/store/types';

export const AssetTypesManager = () => {
    const { t } = useLanguage();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { value: assetTypes } = useSelector(
        (state: RootState) => (state as any).assetTypes || { value: [] }
    );
    const { value: assetItems } = useSelector(
        (state: RootState) => (state as any).assetItems || { value: [] }
    );
    const { value: customFields } = useSelector(
        (state: RootState) => (state as any).assetCustomFields || { value: [] }
    );

    const [typeFormOpen, setTypeFormOpen] = useState(false);
    const [editingType, setEditingType] = useState<AssetType | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(genericInternalActions.assetTypes.getFromIndexedDB());
        dispatch(genericInternalActions.assetTypes.fetchFromAPI());
        dispatch(genericInternalActions.assetItems.getFromIndexedDB());
        dispatch(genericInternalActions.assetItems.fetchFromAPI());
        dispatch(genericInternalActions.assetCustomFields.getFromIndexedDB());
        dispatch(genericInternalActions.assetCustomFields.fetchFromAPI());
    }, [dispatch]);

    const activeTypes = useMemo(() =>
        (assetTypes as AssetType[]).filter(t => !t.deleted_at),
    [assetTypes]);

    const filteredTypes = useMemo(() => {
        if (!searchQuery.trim()) return activeTypes;
        const query = searchQuery.toLowerCase();
        return activeTypes.filter(t => 
            t.name.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
        );
    }, [activeTypes, searchQuery]);

    const getItemCount = (typeId: number) => {
        return (assetItems as AssetItem[]).filter(i => i.asset_type_id === typeId && !i.deleted_at).length;
    };

    const selectedType = useMemo(() =>
        activeTypes.find(t => t.id === selectedTypeId),
    [activeTypes, selectedTypeId]);

    const selectedTypeFields = useMemo(() => {
        if (!selectedTypeId) return [];
        return (customFields as AssetCustomField[])
            .filter(f => f.asset_type_id === selectedTypeId && !f.deleted_at)
            .sort((a, b) => a.sort_order - b.sort_order);
    }, [customFields, selectedTypeId]);

    const handleCreateType = async (data: any) => {
        await dispatch(genericActions.assetTypes.addAsync(data) as any);
    };

    const handleUpdateType = async (data: any) => {
        if (!editingType) return;
        await dispatch(genericActions.assetTypes.updateAsync({ id: editingType.id, ...data }) as any);
    };

    const handleDeleteType = async (typeId: number) => {
        await dispatch(genericActions.assetTypes.removeAsync(typeId) as any);
        if (selectedTypeId === typeId) setSelectedTypeId(null);
    };

    // Auto-select first type
    useEffect(() => {
        if (!selectedTypeId && activeTypes.length > 0) {
            setSelectedTypeId(activeTypes[0].id);
        }
    }, [activeTypes, selectedTypeId]);

    return (
        <PageContainer
            title={t('assets.types.title', 'Asset Types')}
            subtitle={t('assets.types.subtitle', 'Manage asset categories and their custom fields')}
        >
            <div className="mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('assets.detail.backToAssets', 'Back to Assets')}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left panel: Asset Types list */}
                <div className="lg:col-span-1">
                    <Card className="h-fit">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{t('assets.types.types', 'Types')}</CardTitle>
                                <Button size="sm" onClick={() => { setEditingType(null); setTypeFormOpen(true); }}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('assets.types.add', 'Add')}
                                </Button>
                            </div>
                            {/* Search */}
                            <div className="relative mt-3">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('assets.types.searchPlaceholder', 'Search types...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {filteredTypes.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery 
                                            ? t('assets.types.noSearchResults', 'No types match your search.')
                                            : t('assets.types.noTypes', 'No asset types yet.')}
                                    </p>
                                    {!searchQuery && (
                                        <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="mt-2"
                                            onClick={() => { setEditingType(null); setTypeFormOpen(true); }}
                                        >
                                            {t('assets.types.createFirst', 'Create your first type')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredTypes.map((type) => {
                                        const count = getItemCount(type.id);
                                        const isSelected = selectedTypeId === type.id;
                                        const IconComponent = getAssetTypeIcon(type.icon);
                                        return (
                                            <div
                                                key={type.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-primary/10 border border-primary/20 shadow-sm'
                                                        : 'hover:bg-muted/50 border border-transparent'
                                                }`}
                                                onClick={() => setSelectedTypeId(type.id)}
                                            >
                                                <div
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: type.color || '#6366f1' }}
                                                >
                                                    <IconComponent className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium truncate">{type.name}</span>
                                                    </div>
                                                    {type.description && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {type.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                    {count}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right panel: Selected type details */}
                <div className="lg:col-span-2">
                    {selectedType ? (
                        <div className="space-y-6">
                            {/* Type header card */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                                style={{ backgroundColor: selectedType.color || '#6366f1' }}
                                            >
                                                {(() => {
                                                    const IconComponent = getAssetTypeIcon(selectedType.icon);
                                                    return <IconComponent className="h-7 w-7 text-white" />;
                                                })()}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-xl font-semibold">{selectedType.name}</h2>
                                                    <Badge variant="secondary">
                                                        {getItemCount(selectedType.id)} {t('assets.types.items', 'items')}
                                                    </Badge>
                                                </div>
                                                {selectedType.description && (
                                                    <p className="text-muted-foreground">
                                                        {selectedType.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                                                    <span>
                                                        {t('assets.types.iconLabel', 'Icon')}: <code className="bg-muted px-1 rounded">{selectedType.icon || 'Package'}</code>
                                                    </span>
                                                    <span>
                                                        {t('assets.types.colorLabel', 'Color')}: <code className="bg-muted px-1 rounded">{selectedType.color || '#6366f1'}</code>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setEditingType(selectedType); setTypeFormOpen(true); }}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                {t('common.edit', 'Edit')}
                                            </Button>
                                            {getItemCount(selectedType.id) === 0 && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm">
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            {t('common.delete', 'Delete')}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('assets.types.deleteTitle', 'Delete Type?')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('assets.types.deleteDescription', 'This will remove this asset type and all its custom field definitions.')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteType(selectedType.id)}>
                                                                {t('common.delete', 'Delete')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold">{getItemCount(selectedType.id)}</div>
                                        <div className="text-xs text-muted-foreground">{t('assets.types.totalAssets', 'Total Assets')}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold">{selectedTypeFields.length}</div>
                                        <div className="text-xs text-muted-foreground">{t('assets.types.customFieldsCount', 'Custom Fields')}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold">
                                            {(assetItems as AssetItem[]).filter(i => 
                                                i.asset_type_id === selectedType.id && 
                                                !i.deleted_at && 
                                                i.status === 'active'
                                            ).length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{t('assets.types.activeAssets', 'Active')}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Custom fields */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div>
                                        <CardTitle className="text-base">
                                            {t('assets.types.customFields', 'Custom Fields')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('assets.types.customFieldsDesc', 'Define additional fields for assets of this type')}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            // TODO: Implement custom field form
                                        }}
                                        disabled
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {t('assets.types.addField', 'Add Field')}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {selectedTypeFields.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                {t('assets.types.noFields', 'No custom fields defined for this type.')}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('assets.types.noFieldsHint', 'Custom fields let you track additional information specific to this asset type.')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedTypeFields.map((field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">{field.name}</span>
                                                                {field.is_required && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {t('assets.types.required', 'Required')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{field.field_type}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-xs">
                                                            #{index + 1}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="h-[400px] flex items-center justify-center">
                            <CardContent className="text-center">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">
                                    {activeTypes.length === 0
                                        ? t('assets.types.createTypePrompt', 'Create an asset type to get started.')
                                        : t('assets.types.selectType', 'Select a type from the list to view its details.')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Type form */}
            <AssetTypeForm
                open={typeFormOpen}
                onOpenChange={setTypeFormOpen}
                onSubmit={editingType ? handleUpdateType : handleCreateType}
                assetType={editingType}
            />
        </PageContainer>
    );
};
