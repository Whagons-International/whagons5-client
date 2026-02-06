import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { genericActions } from '@/store/genericSlices';
import { MaintenanceScheduleForm } from './MaintenanceScheduleForm';
import { MaintenanceLogForm } from './MaintenanceLogForm';
import type { AssetMaintenanceSchedule, AssetMaintenanceLog } from '@/store/types';
import type { AppDispatch } from '@/store/store';

interface MaintenanceTabProps {
    assetItemId: number;
    schedules: AssetMaintenanceSchedule[];
    logs: AssetMaintenanceLog[];
    teams: any[];
    users: any[];
}

const isOverdue = (schedule: AssetMaintenanceSchedule) => {
    if (!schedule.is_active || !schedule.next_due_date) return false;
    return new Date(schedule.next_due_date) < new Date();
};

const isDueSoon = (schedule: AssetMaintenanceSchedule, days = 7) => {
    if (!schedule.is_active || !schedule.next_due_date || isOverdue(schedule)) return false;
    const due = new Date(schedule.next_due_date);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= days;
};

export const MaintenanceTab = ({ assetItemId, schedules, logs, teams, users }: MaintenanceTabProps) => {
    const { t } = useLanguage();
    const dispatch = useDispatch<AppDispatch>();
    const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<AssetMaintenanceSchedule | null>(null);
    const [logFormOpen, setLogFormOpen] = useState(false);
    const [logScheduleId, setLogScheduleId] = useState<number | null>(null);

    const handleCreateSchedule = async (data: any) => {
        await dispatch(genericActions.assetMaintenanceSchedules.addAsync(data) as any);
    };

    const handleUpdateSchedule = async (data: any) => {
        if (!editingSchedule) return;
        await dispatch(genericActions.assetMaintenanceSchedules.updateAsync({ id: editingSchedule.id, ...data }) as any);
    };

    const handleCreateLog = async (data: any) => {
        await dispatch(genericActions.assetMaintenanceLogs.addAsync(data) as any);
    };

    const handleLogFromSchedule = (scheduleId: number) => {
        setLogScheduleId(scheduleId);
        setLogFormOpen(true);
    };

    const sortedSchedules = [...schedules].sort((a, b) => {
        if (isOverdue(a) && !isOverdue(b)) return -1;
        if (!isOverdue(a) && isOverdue(b)) return 1;
        return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
    });

    const sortedLogs = [...logs].sort((a, b) =>
        new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
    );

    const getUserName = (userId: number | null | undefined) => {
        if (!userId) return null;
        const user = users.find((u: any) => u.id === userId);
        return user?.name || null;
    };

    return (
        <div className="space-y-6">
            {/* Schedules */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">
                        {t('assets.maintenance.schedules', 'Maintenance Schedules')}
                    </CardTitle>
                    <Button size="sm" onClick={() => { setEditingSchedule(null); setScheduleFormOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('assets.maintenance.addSchedule', 'Add Schedule')}
                    </Button>
                </CardHeader>
                <CardContent>
                    {sortedSchedules.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {t('assets.maintenance.noSchedules', 'No maintenance schedules configured.')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {sortedSchedules.map((schedule) => (
                                <div
                                    key={schedule.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                        isOverdue(schedule)
                                            ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                                            : isDueSoon(schedule)
                                                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                                : 'border-border'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{schedule.title}</span>
                                            {!schedule.is_active && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {t('assets.maintenance.paused', 'Paused')}
                                                </Badge>
                                            )}
                                            {isOverdue(schedule) && (
                                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    {t('assets.maintenance.overdue', 'Overdue')}
                                                </Badge>
                                            )}
                                            {isDueSoon(schedule) && !isOverdue(schedule) && (
                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {t('assets.maintenance.dueSoon', 'Due Soon')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {t('assets.maintenance.due', 'Due')}: {new Date(schedule.next_due_date).toLocaleDateString()}
                                            </span>
                                            <span>
                                                {t('assets.maintenance.every', 'Every')} {schedule.frequency_value} {schedule.frequency_unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleLogFromSchedule(schedule.id)}
                                        >
                                            <Wrench className="h-3 w-3 mr-1" />
                                            {t('assets.maintenance.log', 'Log')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setEditingSchedule(schedule); setScheduleFormOpen(true); }}
                                        >
                                            {t('common.edit', 'Edit')}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Logs */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">
                        {t('assets.maintenance.history', 'Maintenance History')}
                    </CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setLogScheduleId(null); setLogFormOpen(true); }}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('assets.maintenance.logMaintenance', 'Log Maintenance')}
                    </Button>
                </CardHeader>
                <CardContent>
                    {sortedLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {t('assets.maintenance.noLogs', 'No maintenance logs recorded.')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {sortedLogs.map((log) => {
                                const performerName = getUserName(log.performed_by);
                                const linkedSchedule = schedules.find(s => s.id === log.schedule_id);
                                return (
                                    <div key={log.id} className="flex items-start justify-between p-3 rounded-lg border border-border">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-medium">
                                                    {new Date(log.performed_at).toLocaleDateString()}
                                                </span>
                                                {performerName && (
                                                    <span className="text-muted-foreground">
                                                        {t('assets.maintenance.by', 'by')} {performerName}
                                                    </span>
                                                )}
                                            </div>
                                            {linkedSchedule && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {linkedSchedule.title}
                                                </p>
                                            )}
                                            {log.notes && (
                                                <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                                            )}
                                        </div>
                                        {log.cost != null && parseFloat(String(log.cost)) > 0 && (
                                            <span className="text-sm font-medium ml-2 shrink-0">
                                                ${parseFloat(String(log.cost)).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Forms */}
            <MaintenanceScheduleForm
                open={scheduleFormOpen}
                onOpenChange={setScheduleFormOpen}
                onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                schedule={editingSchedule}
                assetItemId={assetItemId}
                teams={teams}
            />
            <MaintenanceLogForm
                open={logFormOpen}
                onOpenChange={setLogFormOpen}
                onSubmit={handleCreateLog}
                assetItemId={assetItemId}
                scheduleId={logScheduleId}
                users={users}
            />
        </div>
    );
};
