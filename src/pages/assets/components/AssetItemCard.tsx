import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Users, Shield, ShieldAlert, ShieldOff } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetItem, AssetType } from '@/store/types';

interface AssetItemCardProps {
    asset: AssetItem;
    assetType?: AssetType;
    spotName?: string;
    assignedUserName?: string;
    assignedTeamName?: string;
    onClick: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400' },
    maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    retired: { label: 'Retired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const getWarrantyStatus = (warrantyExpiration: string | null | undefined) => {
    if (!warrantyExpiration) return null;
    const expDate = new Date(warrantyExpiration);
    const now = new Date();
    const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { icon: ShieldOff, label: 'Expired', className: 'text-red-500' };
    if (daysUntil <= 30) return { icon: ShieldAlert, label: `${daysUntil}d left`, className: 'text-amber-500' };
    return { icon: Shield, label: 'Valid', className: 'text-emerald-500' };
};

export const AssetItemCard = ({
    asset,
    assetType,
    spotName,
    assignedUserName,
    assignedTeamName,
    onClick,
}: AssetItemCardProps) => {
    const { t } = useLanguage();
    const status = statusConfig[asset.status] || statusConfig.active;
    const warranty = getWarrantyStatus(asset.warranty_expiration);

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
            onClick={onClick}
        >
            {assetType?.color && (
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: assetType.color }}
                />
            )}
            <CardContent className="p-4 pt-5">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{asset.name}</h3>
                        {asset.serial_number && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {asset.serial_number}
                            </p>
                        )}
                    </div>
                    <Badge className={`ml-2 shrink-0 border-0 ${status.className}`}>
                        {t(`assets.status.${asset.status}`, status.label)}
                    </Badge>
                </div>

                {assetType && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: assetType.color || '#94a3b8' }}
                        />
                        <span className="text-xs text-muted-foreground truncate">{assetType.name}</span>
                    </div>
                )}

                <div className="space-y-1 text-xs text-muted-foreground">
                    {spotName && (
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{spotName}</span>
                        </div>
                    )}
                    {assignedUserName && (
                        <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{assignedUserName}</span>
                        </div>
                    )}
                    {assignedTeamName && (
                        <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="truncate">{assignedTeamName}</span>
                        </div>
                    )}
                </div>

                {warranty && (
                    <div className={`flex items-center gap-1.5 mt-2 text-xs ${warranty.className}`}>
                        <warranty.icon className="h-3 w-3 shrink-0" />
                        <span>{t('assets.warranty', 'Warranty')}: {warranty.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
