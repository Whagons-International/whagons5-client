import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetMaintenanceSchedule } from '@/store/types';

interface MaintenanceScheduleFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    schedule?: AssetMaintenanceSchedule | null;
    assetItemId: number;
    teams: any[];
}

export const MaintenanceScheduleForm = ({
    open,
    onOpenChange,
    onSubmit,
    schedule,
    assetItemId,
    teams,
}: MaintenanceScheduleFormProps) => {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        frequency_value: '1',
        frequency_unit: 'months',
        next_due_date: '',
        assigned_team_id: '',
        is_active: true,
    });

    const isEditing = !!schedule;

    useEffect(() => {
        if (schedule) {
            setForm({
                title: schedule.title || '',
                description: schedule.description || '',
                frequency_value: String(schedule.frequency_value || 1),
                frequency_unit: schedule.frequency_unit || 'months',
                next_due_date: schedule.next_due_date ? String(schedule.next_due_date).split('T')[0] : '',
                assigned_team_id: schedule.assigned_team_id ? String(schedule.assigned_team_id) : '',
                is_active: schedule.is_active ?? true,
            });
        } else {
            setForm({
                title: '',
                description: '',
                frequency_value: '1',
                frequency_unit: 'months',
                next_due_date: new Date().toISOString().split('T')[0],
                assigned_team_id: '',
                is_active: true,
            });
        }
    }, [schedule, open]);

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.next_due_date) return;
        setIsSubmitting(true);
        try {
            const data: any = {
                asset_item_id: assetItemId,
                title: form.title,
                description: form.description || null,
                frequency_value: parseInt(form.frequency_value),
                frequency_unit: form.frequency_unit,
                next_due_date: form.next_due_date,
                is_active: form.is_active,
            };
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? t('assets.maintenance.editSchedule', 'Edit Schedule')
                            : t('assets.maintenance.addSchedule', 'Add Maintenance Schedule')}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="schedTitle">{t('assets.maintenance.title', 'Title')} *</Label>
                        <Input
                            id="schedTitle"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder={t('assets.maintenance.titlePlaceholder', 'e.g., Monthly filter replacement')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.description', 'Description')}</Label>
                        <Textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={2}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>{t('assets.maintenance.frequency', 'Frequency')} *</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.frequency_value}
                                    onChange={(e) => setForm({ ...form, frequency_value: e.target.value })}
                                    className="w-20"
                                />
                                <Select value={form.frequency_unit} onValueChange={(v) => setForm({ ...form, frequency_unit: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="days">{t('assets.maintenance.days', 'Days')}</SelectItem>
                                        <SelectItem value="weeks">{t('assets.maintenance.weeks', 'Weeks')}</SelectItem>
                                        <SelectItem value="months">{t('assets.maintenance.months', 'Months')}</SelectItem>
                                        <SelectItem value="years">{t('assets.maintenance.years', 'Years')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('assets.maintenance.nextDueDate', 'Next Due Date')} *</Label>
                            <Input
                                type="date"
                                value={form.next_due_date}
                                onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('assets.maintenance.assignedTeam', 'Assigned Team')}</Label>
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
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={form.is_active}
                            onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                        />
                        <Label>{t('assets.maintenance.active', 'Active')}</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.title.trim() || !form.next_due_date}>
                        {isSubmitting ? t('common.saving', 'Saving...') : isEditing ? t('common.save', 'Save') : t('common.create', 'Create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
