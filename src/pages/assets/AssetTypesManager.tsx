import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { AssetTypeForm } from './components/AssetTypeForm';
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left panel: Asset Types list */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-base">{t('assets.types.types', 'Types')}</CardTitle>
                            <Button size="sm" onClick={() => { setEditingType(null); setTypeFormOpen(true); }}>
                                <Plus className="h-4 w-4 mr-1" />
                                {t('assets.types.add', 'Add')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {activeTypes.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {t('assets.types.noTypes', 'No asset types yet.')}
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {activeTypes.map((type) => {
                                        const count = getItemCount(type.id);
                                        const isSelected = selectedTypeId === type.id;
                                        return (
                                            <div
                                                key={type.id}
                                                className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/10 border border-primary/20'
                                                        : 'hover:bg-muted/50'
                                                }`}
                                                onClick={() => setSelectedTypeId(type.id)}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="w-3 h-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: type.color || '#94a3b8' }}
                                                    />
                                                    <span className="text-sm font-medium truncate">{type.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="text-xs shrink-0 ml-2">
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
                <div className="md:col-span-2">
                    {selectedType ? (
                        <div className="space-y-6">
                            {/* Type header */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: selectedType.color || '#94a3b8' }}
                                        />
                                        <CardTitle>{selectedType.name}</CardTitle>
                                        <Badge variant="secondary">{getItemCount(selectedType.id)} {t('assets.types.items', 'items')}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                </CardHeader>
                            </Card>

                            {/* Custom fields */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <CardTitle className="text-base">
                                        {t('assets.types.customFields', 'Custom Fields')}
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            // For now, direct API call -- a custom field form can be built later
                                        }}
                                        disabled
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {t('assets.types.addField', 'Add Field')}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {selectedTypeFields.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {t('assets.types.noFields', 'No custom fields defined for this type.')}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedTypeFields.map((field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-border"
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
                                                    <div className="flex items-center gap-1">
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
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    {t('assets.types.selectType', 'Select a type from the list to view its details and custom fields.')}
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
