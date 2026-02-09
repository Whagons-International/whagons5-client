import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Users, Shield, ShieldAlert, ShieldOff, GripVertical } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { getAssetTypeIcon } from './assetTypeIcons';
import type { AssetItem, AssetType } from '@/store/types';

interface AssetItemCardProps {
    asset: AssetItem;
    assetType?: AssetType;
    spotName?: string;
    assignedUserName?: string;
    assignedTeamName?: string;
    onClick: () => void;
    isDraggable?: boolean;
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

// Draggable wrapper component - wraps card in a div for proper ref handling
export const DraggableAssetCard = ({
    asset,
    assetType,
    spotName,
    assignedUserName,
    assignedTeamName,
    onClick,
}: Omit<AssetItemCardProps, 'isDraggable'>) => {
    const { t } = useLanguage();
    const status = statusConfig[asset.status] || statusConfig.active;
    const warranty = getWarrantyStatus(asset.warranty_expiration);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: asset.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Handle click - only navigate if not dragging
    const handleCardClick = (e: React.MouseEvent) => {
        // Don't trigger click if we're dragging
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing h-full"
        >
            <Card
                className={`hover:shadow-md transition-shadow group relative overflow-hidden h-full ${
                    isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                }`}
                onClick={handleCardClick}
            >
                {assetType?.color && (
                    <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: assetType.color }}
                    />
                )}
                <CardContent className="p-4 pt-5 h-full flex flex-col">
                    {/* Header - fixed height */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="mr-2 mt-0.5 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 h-10">
                            <h3 className="font-semibold text-sm truncate">{asset.name}</h3>
                            <p className="text-xs text-muted-foreground truncate mt-0.5 h-4">
                                {asset.serial_number || '\u00A0'}
                            </p>
                        </div>
                        <Badge className={`ml-2 shrink-0 border-0 ${status.className}`}>
                            {t(`assets.status.${asset.status}`, status.label)}
                        </Badge>
                    </div>

                    {/* Asset type - fixed height */}
                    <div className="flex items-center gap-1.5 mb-2 h-5">
                        {assetType ? (
                            <>
                                {(() => {
                                    const IconComponent = getAssetTypeIcon(assetType.icon);
                                    return (
                                        <span
                                            className="inline-flex items-center justify-center w-5 h-5 rounded shrink-0"
                                            style={{ backgroundColor: assetType.color || '#94a3b8' }}
                                        >
                                            <IconComponent className="h-3 w-3 text-white" />
                                        </span>
                                    );
                                })()}
                                <span className="text-xs text-muted-foreground truncate">{assetType.name}</span>
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground">&nbsp;</span>
                        )}
                    </div>

                    {/* Details - fixed height for 2 lines */}
                    <div className="space-y-1 text-xs text-muted-foreground flex-1 min-h-[2.5rem]">
                        <div className="flex items-center gap-1.5 h-4">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{spotName || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 h-4">
                            {assignedUserName ? (
                                <>
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{assignedUserName}</span>
                                </>
                            ) : assignedTeamName ? (
                                <>
                                    <Users className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{assignedTeamName}</span>
                                </>
                            ) : (
                                <>
                                    <User className="h-3 w-3 shrink-0 opacity-50" />
                                    <span className="truncate opacity-50">-</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Warranty - fixed height */}
                    <div className={`flex items-center gap-1.5 mt-2 text-xs h-4 ${warranty?.className || 'text-transparent'}`}>
                        {warranty ? (
                            <>
                                <warranty.icon className="h-3 w-3 shrink-0" />
                                <span>{t('assets.warranty', 'Warranty')}: {warranty.label}</span>
                            </>
                        ) : (
                            <span>&nbsp;</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Non-draggable version for backward compatibility
export const AssetItemCard = ({
    asset,
    assetType,
    spotName,
    assignedUserName,
    assignedTeamName,
    onClick,
    isDraggable = false,
}: AssetItemCardProps) => {
    const { t } = useLanguage();
    const status = statusConfig[asset.status] || statusConfig.active;
    const warranty = getWarrantyStatus(asset.warranty_expiration);

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden h-full"
            onClick={onClick}
        >
            {assetType?.color && (
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: assetType.color }}
                />
            )}
            <CardContent className="p-4 pt-5 h-full flex flex-col">
                {/* Header - fixed height */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 h-10">
                        <h3 className="font-semibold text-sm truncate">{asset.name}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 h-4">
                            {asset.serial_number || '\u00A0'}
                        </p>
                    </div>
                    <Badge className={`ml-2 shrink-0 border-0 ${status.className}`}>
                        {t(`assets.status.${asset.status}`, status.label)}
                    </Badge>
                </div>

                {/* Asset type - fixed height */}
                <div className="flex items-center gap-1.5 mb-2 h-5">
                    {assetType ? (
                        <>
                            {(() => {
                                const IconComponent = getAssetTypeIcon(assetType.icon);
                                return (
                                    <span
                                        className="inline-flex items-center justify-center w-5 h-5 rounded shrink-0"
                                        style={{ backgroundColor: assetType.color || '#94a3b8' }}
                                    >
                                        <IconComponent className="h-3 w-3 text-white" />
                                    </span>
                                );
                            })()}
                            <span className="text-xs text-muted-foreground truncate">{assetType.name}</span>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">&nbsp;</span>
                    )}
                </div>

                {/* Details - fixed height for 2 lines */}
                <div className="space-y-1 text-xs text-muted-foreground flex-1 min-h-[2.5rem]">
                    <div className="flex items-center gap-1.5 h-4">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{spotName || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 h-4">
                        {assignedUserName ? (
                            <>
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">{assignedUserName}</span>
                            </>
                        ) : assignedTeamName ? (
                            <>
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{assignedTeamName}</span>
                            </>
                        ) : (
                            <>
                                <User className="h-3 w-3 shrink-0 opacity-50" />
                                <span className="truncate opacity-50">-</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Warranty - fixed height */}
                <div className={`flex items-center gap-1.5 mt-2 text-xs h-4 ${warranty?.className || 'text-transparent'}`}>
                    {warranty ? (
                        <>
                            <warranty.icon className="h-3 w-3 shrink-0" />
                            <span>{t('assets.warranty', 'Warranty')}: {warranty.label}</span>
                        </>
                    ) : (
                        <span>&nbsp;</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
