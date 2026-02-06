import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetItem, AssetType } from '@/store/types';

interface AssetFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<AssetItem>) => Promise<void>;
    asset?: AssetItem | null;
    assetTypes: AssetType[];
    spots: any[];
    users: any[];
    teams: any[];
}

const emptyForm = {
    name: '',
    asset_type_id: '',
    parent_id: '',
    spot_id: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    purchase_date: '',
    purchase_cost: '',
    warranty_expiration: '',
    status: 'active',
    qr_code: '',
    notes: '',
    assigned_user_id: '',
    assigned_team_id: '',
};

export const AssetForm = ({
    open,
    onOpenChange,
    onSubmit,
    asset,
    assetTypes,
    spots,
    users,
    teams,
}: AssetFormProps) => {
    const { t } = useLanguage();
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = !!asset;

    useEffect(() => {
        if (asset) {
            setForm({
                name: asset.name || '',
                asset_type_id: String(asset.asset_type_id || ''),
                parent_id: asset.parent_id ? String(asset.parent_id) : '',
                spot_id: asset.spot_id ? String(asset.spot_id) : '',
                serial_number: asset.serial_number || '',
                model: asset.model || '',
                manufacturer: asset.manufacturer || '',
                purchase_date: asset.purchase_date ? String(asset.purchase_date).split('T')[0] : '',
                purchase_cost: asset.purchase_cost != null ? String(asset.purchase_cost) : '',
                warranty_expiration: asset.warranty_expiration ? String(asset.warranty_expiration).split('T')[0] : '',
                status: asset.status || 'active',
                qr_code: asset.qr_code || '',
                notes: asset.notes || '',
                assigned_user_id: asset.assigned_user_id ? String(asset.assigned_user_id) : '',
                assigned_team_id: asset.assigned_team_id ? String(asset.assigned_team_id) : '',
            });
        } else {
            setForm(emptyForm);
        }
    }, [asset, open]);

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.asset_type_id) return;
        setIsSubmitting(true);
        try {
            const data: any = {
                name: form.name,
                asset_type_id: parseInt(form.asset_type_id),
                status: form.status,
            };
            if (form.parent_id) data.parent_id = parseInt(form.parent_id);
            else data.parent_id = null;
            if (form.spot_id) data.spot_id = parseInt(form.spot_id);
            else data.spot_id = null;
            if (form.serial_number) data.serial_number = form.serial_number;
            if (form.model) data.model = form.model;
            if (form.manufacturer) data.manufacturer = form.manufacturer;
            if (form.purchase_date) data.purchase_date = form.purchase_date;
            if (form.purchase_cost) data.purchase_cost = parseFloat(form.purchase_cost);
            if (form.warranty_expiration) data.warranty_expiration = form.warranty_expiration;
            if (form.qr_code) data.qr_code = form.qr_code;
            if (form.notes) data.notes = form.notes;
            if (form.assigned_user_id) data.assigned_user_id = parseInt(form.assigned_user_id);
            else data.assigned_user_id = null;
            if (form.assigned_team_id) data.assigned_team_id = parseInt(form.assigned_team_id);
            else data.assigned_team_id = null;

            await onSubmit(data);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? t('assets.form.editTitle', 'Edit Asset')
                            : t('assets.form.createTitle', 'Add New Asset')}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('assets.form.name', 'Name')} *</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t('assets.form.namePlaceholder', 'Asset name')}
                        />
                    </div>

                    {/* Asset Type */}
                    <div className="grid gap-2">
                        <Label>{t('assets.form.assetType', 'Asset Type')} *</Label>
                        <Select value={form.asset_type_id} onValueChange={(v) => setForm({ ...form, asset_type_id: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('assets.form.selectType', 'Select type')} />
                            </SelectTrigger>
                            <SelectContent>
                                {assetTypes.map((type) => (
                                    <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status */}
                    <div className="grid gap-2">
                        <Label>{t('assets.form.status', 'Status')}</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">{t('assets.status.active', 'Active')}</SelectItem>
                                <SelectItem value="inactive">{t('assets.status.inactive', 'Inactive')}</SelectItem>
                                <SelectItem value="maintenance">{t('assets.status.maintenance', 'Maintenance')}</SelectItem>
                                <SelectItem value="retired">{t('assets.status.retired', 'Retired')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Location */}
                    <div className="grid gap-2">
                        <Label>{t('assets.form.location', 'Location')}</Label>
                        <Select value={form.spot_id || 'none'} onValueChange={(v) => setForm({ ...form, spot_id: v === 'none' ? '' : v })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('assets.form.selectLocation', 'Select location')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('assets.form.noLocation', 'No location')}</SelectItem>
                                {spots.map((spot: any) => (
                                    <SelectItem key={spot.id} value={String(spot.id)}>{spot.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Serial Number */}
                        <div className="grid gap-2">
                            <Label htmlFor="serial">{t('assets.form.serialNumber', 'Serial Number')}</Label>
                            <Input
                                id="serial"
                                value={form.serial_number}
                                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                            />
                        </div>
                        {/* Model */}
                        <div className="grid gap-2">
                            <Label htmlFor="model">{t('assets.form.model', 'Model')}</Label>
                            <Input
                                id="model"
                                value={form.model}
                                onChange={(e) => setForm({ ...form, model: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Manufacturer */}
                    <div className="grid gap-2">
                        <Label htmlFor="manufacturer">{t('assets.form.manufacturer', 'Manufacturer')}</Label>
                        <Input
                            id="manufacturer"
                            value={form.manufacturer}
                            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Purchase Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="purchaseDate">{t('assets.form.purchaseDate', 'Purchase Date')}</Label>
                            <Input
                                id="purchaseDate"
                                type="date"
                                value={form.purchase_date}
                                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                            />
                        </div>
                        {/* Purchase Cost */}
                        <div className="grid gap-2">
                            <Label htmlFor="purchaseCost">{t('assets.form.purchaseCost', 'Purchase Cost')}</Label>
                            <Input
                                id="purchaseCost"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.purchase_cost}
                                onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Warranty Expiration */}
                    <div className="grid gap-2">
                        <Label htmlFor="warranty">{t('assets.form.warrantyExpiration', 'Warranty Expiration')}</Label>
                        <Input
                            id="warranty"
                            type="date"
                            value={form.warranty_expiration}
                            onChange={(e) => setForm({ ...form, warranty_expiration: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Assigned User */}
                        <div className="grid gap-2">
                            <Label>{t('assets.form.assignedUser', 'Assigned User')}</Label>
                            <Select value={form.assigned_user_id || 'none'} onValueChange={(v) => setForm({ ...form, assigned_user_id: v === 'none' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('assets.form.selectUser', 'Select user')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('assets.form.noUser', 'None')}</SelectItem>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Assigned Team */}
                        <div className="grid gap-2">
                            <Label>{t('assets.form.assignedTeam', 'Assigned Team')}</Label>
                            <Select value={form.assigned_team_id || 'none'} onValueChange={(v) => setForm({ ...form, assigned_team_id: v === 'none' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('assets.form.selectTeam', 'Select team')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('assets.form.noTeam', 'None')}</SelectItem>
                                    {teams.map((team: any) => (
                                        <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">{t('assets.form.notes', 'Notes')}</Label>
                        <Textarea
                            id="notes"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim() || !form.asset_type_id}>
                        {isSubmitting
                            ? t('common.saving', 'Saving...')
                            : isEditing
                                ? t('common.save', 'Save')
                                : t('common.create', 'Create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
