import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/providers/LanguageProvider';
import { 
    Package, 
    CheckCircle2, 
    XCircle, 
    Wrench, 
    Archive,
    TrendingUp,
    MapPin,
    Users,
    AlertTriangle,
    Calendar
} from 'lucide-react';
import type { AssetItem, AssetType } from '@/store/types';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    description?: string;
    trend?: number;
    color?: string;
}

const StatCard = ({ title, value, icon, description, color = 'text-primary' }: StatCardProps) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
                <div className={`p-3 rounded-full bg-muted ${color}`}>
                    {icon}
                </div>
            </div>
        </CardContent>
    </Card>
);

interface TypeDistribution {
    type: AssetType;
    count: number;
    percentage: number;
}

interface StatusDistribution {
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
}

export const AssetStats = () => {
    const { t } = useLanguage();

    const { value: assetItems } = useSelector(
        (state: RootState) => (state as any).assetItems || { value: [] }
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

    // Filter out deleted assets
    const activeAssets = useMemo(() => 
        (assetItems as AssetItem[]).filter(a => !a.deleted_at), 
        [assetItems]
    );

    // Calculate stats
    const stats = useMemo(() => {
        const total = activeAssets.length;
        
        // Status counts
        const statusCounts = activeAssets.reduce((acc, asset) => {
            acc[asset.status] = (acc[asset.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Type distribution
        const typeCounts = activeAssets.reduce((acc, asset) => {
            acc[asset.asset_type_id] = (acc[asset.asset_type_id] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const typeDistribution: TypeDistribution[] = Object.entries(typeCounts)
            .map(([typeId, count]) => {
                const type = (assetTypes as AssetType[]).find(t => t.id === parseInt(typeId));
                return {
                    type: type!,
                    count: count as number,
                    percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
                };
            })
            .filter(t => t.type)
            .sort((a, b) => b.count - a.count);

        // Location stats
        const assetsWithLocation = activeAssets.filter(a => a.spot_id).length;
        const uniqueLocations = new Set(activeAssets.filter(a => a.spot_id).map(a => a.spot_id)).size;

        // Assignment stats
        const assignedToUsers = activeAssets.filter(a => a.assigned_user_id).length;
        const assignedToTeams = activeAssets.filter(a => a.assigned_team_id && !a.assigned_user_id).length;
        const unassigned = total - assignedToUsers - assignedToTeams;

        // Warranty stats
        const now = new Date();
        const warrantyExpiringSoon = activeAssets.filter(a => {
            if (!a.warranty_expiration) return false;
            const expDate = new Date(a.warranty_expiration);
            const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntil > 0 && daysUntil <= 30;
        }).length;

        const warrantyExpired = activeAssets.filter(a => {
            if (!a.warranty_expiration) return false;
            return new Date(a.warranty_expiration) < now;
        }).length;

        // Assets added this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const addedThisMonth = activeAssets.filter(a => 
            new Date(a.created_at) >= thisMonth
        ).length;

        return {
            total,
            statusCounts,
            typeDistribution,
            assetsWithLocation,
            uniqueLocations,
            assignedToUsers,
            assignedToTeams,
            unassigned,
            warrantyExpiringSoon,
            warrantyExpired,
            addedThisMonth
        };
    }, [activeAssets, assetTypes]);

    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
        active: { label: t('assets.status.active', 'Active'), color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
        inactive: { label: t('assets.status.inactive', 'Inactive'), color: 'text-gray-600', bgColor: 'bg-gray-400' },
        maintenance: { label: t('assets.status.maintenance', 'Maintenance'), color: 'text-amber-600', bgColor: 'bg-amber-500' },
        retired: { label: t('assets.status.retired', 'Retired'), color: 'text-red-600', bgColor: 'bg-red-500' },
    };

    const statusDistribution: StatusDistribution[] = Object.entries(statusConfig).map(([status, config]) => ({
        status,
        label: config.label,
        count: stats.statusCounts[status] || 0,
        percentage: stats.total > 0 ? Math.round(((stats.statusCounts[status] || 0) / stats.total) * 100) : 0,
        color: config.bgColor
    }));

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('assets.stats.totalAssets', 'Total Assets')}
                    value={stats.total}
                    icon={<Package className="h-6 w-6" />}
                    description={`+${stats.addedThisMonth} ${t('assets.stats.thisMonth', 'this month')}`}
                    color="text-primary"
                />
                <StatCard
                    title={t('assets.stats.active', 'Active')}
                    value={stats.statusCounts.active || 0}
                    icon={<CheckCircle2 className="h-6 w-6" />}
                    description={`${stats.total > 0 ? Math.round(((stats.statusCounts.active || 0) / stats.total) * 100) : 0}% ${t('assets.stats.ofTotal', 'of total')}`}
                    color="text-emerald-600"
                />
                <StatCard
                    title={t('assets.stats.inMaintenance', 'In Maintenance')}
                    value={stats.statusCounts.maintenance || 0}
                    icon={<Wrench className="h-6 w-6" />}
                    color="text-amber-600"
                />
                <StatCard
                    title={t('assets.stats.retired', 'Retired')}
                    value={stats.statusCounts.retired || 0}
                    icon={<Archive className="h-6 w-6" />}
                    color="text-red-600"
                />
            </div>

            {/* Status Distribution & Type Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('assets.stats.statusDistribution', 'Status Distribution')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Progress bar */}
                            <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                                {statusDistribution.map((item) => (
                                    item.count > 0 && (
                                        <div
                                            key={item.status}
                                            className={`h-full ${item.color} transition-all`}
                                            style={{ width: `${item.percentage}%` }}
                                            title={`${item.label}: ${item.count}`}
                                        />
                                    )
                                ))}
                            </div>
                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-3">
                                {statusDistribution.map((item) => (
                                    <div key={item.status} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        <span className="text-sm text-muted-foreground">{item.label}</span>
                                        <span className="text-sm font-medium ml-auto">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Type Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('assets.stats.byType', 'Assets by Type')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.typeDistribution.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('assets.stats.noTypes', 'No asset types defined')}</p>
                            ) : (
                                stats.typeDistribution.slice(0, 6).map((item) => (
                                    <div key={item.type.id} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: item.type.color || '#94a3b8' }}
                                                />
                                                <span className="truncate">{item.type.name}</span>
                                            </div>
                                            <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ 
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: item.type.color || '#94a3b8'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('assets.stats.locations', 'Locations')}
                    value={stats.uniqueLocations}
                    icon={<MapPin className="h-6 w-6" />}
                    description={`${stats.assetsWithLocation} ${t('assets.stats.assetsAssigned', 'assets assigned')}`}
                    color="text-blue-600"
                />
                <StatCard
                    title={t('assets.stats.assignedToUsers', 'Assigned to Users')}
                    value={stats.assignedToUsers}
                    icon={<Users className="h-6 w-6" />}
                    description={`${stats.unassigned} ${t('assets.stats.unassigned', 'unassigned')}`}
                    color="text-violet-600"
                />
                <StatCard
                    title={t('assets.stats.warrantyExpiring', 'Warranty Expiring')}
                    value={stats.warrantyExpiringSoon}
                    icon={<AlertTriangle className="h-6 w-6" />}
                    description={t('assets.stats.within30Days', 'Within 30 days')}
                    color="text-amber-600"
                />
                <StatCard
                    title={t('assets.stats.warrantyExpired', 'Warranty Expired')}
                    value={stats.warrantyExpired}
                    icon={<XCircle className="h-6 w-6" />}
                    description={t('assets.stats.needsAttention', 'Needs attention')}
                    color="text-red-600"
                />
            </div>

            {/* Assignment Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('assets.stats.assignmentOverview', 'Assignment Overview')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-3xl font-bold text-violet-600">{stats.assignedToUsers}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('assets.stats.assignedToUsers', 'Assigned to Users')}</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-3xl font-bold text-blue-600">{stats.assignedToTeams}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('assets.stats.assignedToTeams', 'Assigned to Teams')}</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-3xl font-bold text-gray-600">{stats.unassigned}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('assets.stats.unassigned', 'Unassigned')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
