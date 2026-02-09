import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit, Trash2, MapPin, User, Users, Calendar, DollarSign, Shield, ShieldAlert, ShieldOff, Wrench, FileText, ClipboardList } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { AssetForm } from './components/AssetForm';
import { MaintenanceTab } from './components/MaintenanceTab';
import { CustomFieldsTab } from './components/CustomFieldsTab';
import type { AssetItem, AssetType, AssetMaintenanceSchedule, AssetMaintenanceLog, AssetCustomField, AssetCustomFieldValue, Task } from '@/store/types';

// Lazy load TaskDialog to avoid circular dependencies
const TaskDialog = lazy(() => import('@/pages/spaces/components/TaskDialog'));

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400' },
    maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    retired: { label: 'Retired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export const AssetDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useLanguage();
    const assetId = parseInt(id || '0');

    // Redux state
    const asset = useSelector((state: RootState) =>
        ((state as any).assetItems?.value || []).find((a: AssetItem) => a.id === assetId)
    );
    const assetTypes: AssetType[] = useSelector((state: RootState) =>
        (state as any).assetTypes?.value || []
    );
    const spots: any[] = useSelector((state: RootState) =>
        (state as any).spots?.value || []
    );
    const users: any[] = useSelector((state: RootState) =>
        (state as any).users?.value || []
    );
    const teams: any[] = useSelector((state: RootState) =>
        (state as any).teams?.value || []
    );
    const allSchedules: AssetMaintenanceSchedule[] = useSelector((state: RootState) =>
        (state as any).assetMaintenanceSchedules?.value || []
    );
    const allLogs: AssetMaintenanceLog[] = useSelector((state: RootState) =>
        (state as any).assetMaintenanceLogs?.value || []
    );
    const allCustomFields: AssetCustomField[] = useSelector((state: RootState) =>
        (state as any).assetCustomFields?.value || []
    );
    const allCustomFieldValues: AssetCustomFieldValue[] = useSelector((state: RootState) =>
        (state as any).assetCustomFieldValues?.value || []
    );

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);

    // Get tasks related to this asset
    const { value: tasks } = useSelector(
        (state: RootState) => state.tasks || { value: [] }
    );
    const assetTasks = useMemo(() => 
        (tasks as Task[]).filter(t => t.asset_id === assetId),
        [tasks, assetId]
    );

    // Fetch related data
    useEffect(() => {
        dispatch(genericInternalActions.assetMaintenanceSchedules.getFromIndexedDB());
        dispatch(genericInternalActions.assetMaintenanceSchedules.fetchFromAPI());
        dispatch(genericInternalActions.assetMaintenanceLogs.getFromIndexedDB());
        dispatch(genericInternalActions.assetMaintenanceLogs.fetchFromAPI());
        dispatch(genericInternalActions.assetCustomFields.getFromIndexedDB());
        dispatch(genericInternalActions.assetCustomFields.fetchFromAPI());
        dispatch(genericInternalActions.assetCustomFieldValues.getFromIndexedDB());
        dispatch(genericInternalActions.assetCustomFieldValues.fetchFromAPI());
    }, [dispatch]);

    // Filter related data for this asset
    const schedules = useMemo(() =>
        allSchedules.filter(s => s.asset_item_id === assetId && !s.deleted_at),
    [allSchedules, assetId]);

    const logs = useMemo(() =>
        allLogs.filter(l => l.asset_item_id === assetId && !l.deleted_at),
    [allLogs, assetId]);

    const customFields = useMemo(() => {
        if (!asset) return [];
        return allCustomFields.filter(f => f.asset_type_id === asset.asset_type_id && !f.deleted_at);
    }, [allCustomFields, asset]);

    const customFieldValues = useMemo(() =>
        allCustomFieldValues.filter(v => v.asset_item_id === assetId),
    [allCustomFieldValues, assetId]);

    if (!asset) {
        return (
            <PageContainer title={t('assets.detail.loading', 'Loading...')}>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </PageContainer>
        );
    }

    const assetType = assetTypes.find(t => t.id === asset.asset_type_id);
    const spot = spots.find((s: any) => s.id === asset.spot_id);
    const assignedUser = users.find((u: any) => u.id === asset.assigned_user_id);
    const assignedTeam = teams.find((t: any) => t.id === asset.assigned_team_id);
    const status = statusConfig[asset.status] || statusConfig.active;

    // Warranty
    const getWarrantyInfo = () => {
        if (!asset.warranty_expiration) return null;
        const exp = new Date(asset.warranty_expiration);
        const now = new Date();
        const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) return { icon: ShieldOff, label: t('assets.warranty.expired', 'Expired'), className: 'text-red-500', daysLabel: `${Math.abs(daysUntil)} ${t('assets.warranty.daysAgo', 'days ago')}` };
        if (daysUntil <= 30) return { icon: ShieldAlert, label: t('assets.warranty.expiringSoon', 'Expiring Soon'), className: 'text-amber-500', daysLabel: `${daysUntil} ${t('assets.warranty.daysLeft', 'days left')}` };
        return { icon: Shield, label: t('assets.warranty.valid', 'Valid'), className: 'text-emerald-500', daysLabel: `${daysUntil} ${t('assets.warranty.daysLeft', 'days left')}` };
    };
    const warranty = getWarrantyInfo();

    const handleUpdate = async (data: Partial<AssetItem>) => {
        await dispatch(genericActions.assetItems.updateAsync({ id: assetId, ...data }) as any);
    };

    const handleDelete = async () => {
        await dispatch(genericActions.assetItems.removeAsync(assetId) as any);
        navigate('/assets');
    };

    return (
        <PageContainer title={asset.name} subtitle={assetType?.name}>
            {/* Header actions */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('assets.detail.backToAssets', 'Back to Assets')}
                </Button>
                <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${status.className}`}>
                        {t(`assets.status.${asset.status}`, status.label)}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setCreateTaskDialogOpen(true)}>
                        <ClipboardList className="h-4 w-4 mr-1" />
                        {t('assets.detail.createTask', 'Create Task')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common.edit', 'Edit')}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t('common.delete', 'Delete')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('assets.detail.deleteTitle', 'Delete Asset?')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('assets.detail.deleteDescription', 'This will permanently remove this asset and all its maintenance records. This action cannot be undone.')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>
                                    {t('common.delete', 'Delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Purchase Info */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('assets.detail.purchaseInfo', 'Purchase Info')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {asset.manufacturer && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('assets.detail.manufacturer', 'Manufacturer')}</span>
                                <span className="font-medium">{asset.manufacturer}</span>
                            </div>
                        )}
                        {asset.model && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('assets.detail.model', 'Model')}</span>
                                <span className="font-medium">{asset.model}</span>
                            </div>
                        )}
                        {asset.serial_number && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('assets.detail.serial', 'Serial')}</span>
                                <span className="font-medium font-mono text-xs">{asset.serial_number}</span>
                            </div>
                        )}
                        {asset.purchase_date && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{new Date(asset.purchase_date).toLocaleDateString()}</span>
                            </div>
                        )}
                        {asset.purchase_cost != null && (
                            <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">${parseFloat(String(asset.purchase_cost)).toFixed(2)}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Location & Assignment */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('assets.detail.locationAssignment', 'Location & Assignment')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {spot && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{spot.name}</span>
                            </div>
                        )}
                        {assignedUser && (
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{assignedUser.name}</span>
                            </div>
                        )}
                        {assignedTeam && (
                            <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{assignedTeam.name}</span>
                            </div>
                        )}
                        {!spot && !assignedUser && !assignedTeam && (
                            <p className="text-muted-foreground">{t('assets.detail.noAssignment', 'No location or assignment')}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Warranty */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('assets.detail.warranty', 'Warranty')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        {warranty ? (
                            <div className="space-y-2">
                                <div className={`flex items-center gap-2 ${warranty.className}`}>
                                    <warranty.icon className="h-5 w-5" />
                                    <span className="font-medium">{warranty.label}</span>
                                </div>
                                <p className="text-muted-foreground">
                                    {t('assets.detail.expires', 'Expires')}: {new Date(asset.warranty_expiration!).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">{warranty.daysLabel}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">{t('assets.detail.noWarranty', 'No warranty information')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">
                        <FileText className="h-4 w-4 mr-1" />
                        {t('assets.detail.tabs.overview', 'Overview')}
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                        <ClipboardList className="h-4 w-4 mr-1" />
                        {t('assets.detail.tabs.tasks', 'Tasks')}
                        {assetTasks.length > 0 && (
                            <Badge className="ml-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-xs h-5 min-w-5 px-1">
                                {assetTasks.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="maintenance">
                        <Wrench className="h-4 w-4 mr-1" />
                        {t('assets.detail.tabs.maintenance', 'Maintenance')}
                        {schedules.filter(s => {
                            if (!s.is_active || !s.next_due_date) return false;
                            return new Date(s.next_due_date) < new Date();
                        }).length > 0 && (
                            <Badge className="ml-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs h-5 min-w-5 px-1">
                                {schedules.filter(s => s.is_active && s.next_due_date && new Date(s.next_due_date) < new Date()).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* Notes */}
                    {asset.notes && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t('assets.detail.notes', 'Notes')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Custom fields */}
                    <CustomFieldsTab fields={customFields} values={customFieldValues} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">{t('assets.detail.relatedTasks', 'Related Tasks')}</CardTitle>
                            <Button size="sm" onClick={() => setCreateTaskDialogOpen(true)}>
                                <ClipboardList className="h-4 w-4 mr-1" />
                                {t('assets.detail.createTask', 'Create Task')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {assetTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t('assets.detail.noTasks', 'No tasks linked to this asset yet.')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {assetTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/spaces?task=${task.id}`)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{task.name}</p>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                {task.due_date && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="maintenance" className="mt-6">
                    <MaintenanceTab
                        assetItemId={assetId}
                        schedules={schedules}
                        logs={logs}
                        teams={teams}
                        users={users}
                    />
                </TabsContent>
            </Tabs>

            {/* Edit dialog */}
            <AssetForm
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSubmit={handleUpdate}
                asset={asset}
                assetTypes={assetTypes.filter(t => !t.deleted_at)}
                spots={spots}
                users={users}
                teams={teams}
            />

            {/* Create Task dialog */}
            <Suspense fallback={null}>
                <TaskDialog
                    open={createTaskDialogOpen}
                    onOpenChange={setCreateTaskDialogOpen}
                    mode="create"
                    task={{
                        asset_id: assetId,
                        name: `${asset.name} - `,
                        spot_id: asset.spot_id,
                    }}
                />
            </Suspense>
        </PageContainer>
    );
};
