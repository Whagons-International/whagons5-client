import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/providers/LanguageProvider';

interface MaintenanceLogFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    assetItemId: number;
    scheduleId?: number | null;
    users: any[];
}

export const MaintenanceLogForm = ({
    open,
    onOpenChange,
    onSubmit,
    assetItemId,
    scheduleId,
    users,
}: MaintenanceLogFormProps) => {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        performed_by: '',
        performed_at: '',
        notes: '',
        cost: '',
    });

    useEffect(() => {
        if (open) {
            setForm({
                performed_by: '',
                performed_at: new Date().toISOString().slice(0, 16),
                notes: '',
                cost: '',
            });
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!form.performed_at) return;
        setIsSubmitting(true);
        try {
            const data: any = {
                asset_item_id: assetItemId,
                performed_at: form.performed_at,
            };
            if (scheduleId) data.schedule_id = scheduleId;
            if (form.performed_by) data.performed_by = parseInt(form.performed_by);
            if (form.notes) data.notes = form.notes;
            if (form.cost) data.cost = parseFloat(form.cost);

            await onSubmit(data);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>{t('assets.maintenance.logMaintenance', 'Log Maintenance')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.performedBy', 'Performed By')}</Label>
                        <Select value={form.performed_by || 'none'} onValueChange={(v) => setForm({ ...form, performed_by: v === 'none' ? '' : v })}>
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
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.performedAt', 'Performed At')} *</Label>
                        <Input
                            type="datetime-local"
                            value={form.performed_at}
                            onChange={(e) => setForm({ ...form, performed_at: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.cost', 'Cost')}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.cost}
                            onChange={(e) => setForm({ ...form, cost: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.notes', 'Notes')}</Label>
                        <Textarea
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
                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.performed_at}>
                        {isSubmitting ? t('common.saving', 'Saving...') : t('assets.maintenance.logAction', 'Log Maintenance')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
