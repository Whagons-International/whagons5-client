import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetType } from '@/store/types';

interface AssetTypeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    assetType?: AssetType | null;
}

export const AssetTypeForm = ({
    open,
    onOpenChange,
    onSubmit,
    assetType,
}: AssetTypeFormProps) => {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        color: '#6366f1',
        icon: '',
    });

    const isEditing = !!assetType;

    useEffect(() => {
        if (assetType) {
            setForm({
                name: assetType.name || '',
                color: assetType.color || '#6366f1',
                icon: assetType.icon || '',
            });
        } else {
            setForm({ name: '', color: '#6366f1', icon: '' });
        }
    }, [assetType, open]);

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setIsSubmitting(true);
        try {
            await onSubmit({
                name: form.name,
                color: form.color || null,
                icon: form.icon || null,
            });
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? t('assets.types.editType', 'Edit Asset Type')
                            : t('assets.types.addType', 'Add Asset Type')}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="typeName">{t('assets.types.name', 'Name')} *</Label>
                        <Input
                            id="typeName"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t('assets.types.namePlaceholder', 'e.g., HVAC, Furniture, IT Equipment')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="typeColor">{t('assets.types.color', 'Color')}</Label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="typeColor"
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                className="flex-1"
                                placeholder="#6366f1"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="typeIcon">{t('assets.types.icon', 'Icon')}</Label>
                        <Input
                            id="typeIcon"
                            value={form.icon}
                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                            placeholder={t('assets.types.iconPlaceholder', 'Icon name (optional)')}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim()}>
                        {isSubmitting ? t('common.saving', 'Saving...') : isEditing ? t('common.save', 'Save') : t('common.create', 'Create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
