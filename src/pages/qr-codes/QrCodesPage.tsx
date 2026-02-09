import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { genericInternalActions, genericActions } from '@/store/genericSlices';
import { RootState, AppDispatch } from '@/store/store';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, QrCode, Search, LayoutGrid, List, ExternalLink, Eye, BarChart3, Copy, Download } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { GenerateQrCodeModal } from './GenerateQrCodeModal';
import { QrCodeDetailModal } from './QrCodeDetailModal';

interface QrCodeItem {
    id: number;
    uuid: string;
    entity_type: string;
    entity_id: number;
    action: string;
    context: Record<string, any>;
    content_format: string;
    is_active: boolean;
    is_public: boolean;
    expires_at: string | null;
    label: string | null;
    description: string | null;
    scan_count: number;
    last_scanned_at: string | null;
    created_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

const entityTypeLabels: Record<string, { label: string; color: string }> = {
    spot: { label: 'Spot', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    task: { label: 'Task', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    workspace: { label: 'Workspace', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
    form: { label: 'Form', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    document: { label: 'Document', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    template: { label: 'Template', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
    asset: { label: 'Asset', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
};

const actionLabels: Record<string, string> = {
    view: 'View',
    create_task: 'Create Task',
    open_form: 'Open Form',
    navigate: 'Navigate',
};

export const QrCodesPage = () => {
    const { t } = useLanguage();
    const dispatch = useDispatch<AppDispatch>();

    // Redux state
    const { value: qrCodes, loading } = useSelector(
        (state: RootState) => (state as any).qrCodes || { value: [], loading: false }
    );

    // Get entities from Redux store for name resolution
    const spots = useSelector((state: RootState) => state.spots?.value || []);
    const tasks = useSelector((state: RootState) => state.tasks?.value || []);
    const workspaces = useSelector((state: RootState) => state.workspaces?.value || []);
    const forms = useSelector((state: RootState) => state.forms?.value || []);
    const documents = useSelector((state: RootState) => state.documents?.value || []);
    const templates = useSelector((state: RootState) => state.templates?.value || []);

    // Helper function to get entity name by type and ID
    const getEntityName = useMemo(() => {
        const entityMaps: Record<string, Map<number, string>> = {
            spot: new Map(spots.map((s: any) => [s.id, s.name])),
            task: new Map(tasks.map((t: any) => [t.id, t.name || `Task #${t.id}`])),
            workspace: new Map(workspaces.map((w: any) => [w.id, w.name])),
            form: new Map(forms.map((f: any) => [f.id, f.name])),
            document: new Map(documents.map((d: any) => [d.id, d.title || d.name || `Document #${d.id}`])),
            template: new Map(templates.map((t: any) => [t.id, t.name])),
        };

        return (entityType: string, entityId: number): string => {
            const map = entityMaps[entityType];
            if (map) {
                return map.get(entityId) || `#${entityId}`;
            }
            return `#${entityId}`;
        };
    }, [spots, tasks, workspaces, forms, documents, templates]);

    // Local state
    const [search, setSearch] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQrCode, setSelectedQrCode] = useState<QrCodeItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleQrCodeClick = (qr: QrCodeItem) => {
        setSelectedQrCode(qr);
        setIsDetailModalOpen(true);
    };

    // Fetch data on mount
    useEffect(() => {
        dispatch(genericInternalActions.qrCodes.getFromIndexedDB());
        dispatch(genericInternalActions.qrCodes.fetchFromAPI());
    }, [dispatch]);

    // Filter QR codes
    const filteredQrCodes = useMemo(() => {
        return (qrCodes as QrCodeItem[]).filter((qr) => {
            if (qr.deleted_at) return false;

            // Search filter
            if (search) {
                const q = search.toLowerCase();
                const matches = (qr.label && qr.label.toLowerCase().includes(q))
                    || (qr.description && qr.description.toLowerCase().includes(q))
                    || qr.uuid.toLowerCase().includes(q)
                    || qr.entity_type.toLowerCase().includes(q);
                if (!matches) return false;
            }

            // Entity type filter
            if (entityTypeFilter !== 'all' && qr.entity_type !== entityTypeFilter) return false;

            // Status filter
            if (statusFilter === 'active' && !qr.is_active) return false;
            if (statusFilter === 'inactive' && qr.is_active) return false;

            return true;
        });
    }, [qrCodes, search, entityTypeFilter, statusFilter]);

    // Stats
    const stats = useMemo(() => {
        const all = (qrCodes as QrCodeItem[]).filter(q => !q.deleted_at);
        return {
            total: all.length,
            active: all.filter(q => q.is_active).length,
            totalScans: all.reduce((sum, q) => sum + (q.scan_count || 0), 0),
            publicCodes: all.filter(q => q.is_public).length,
        };
    }, [qrCodes]);

    const copyUuid = (uuid: string) => {
        navigator.clipboard.writeText(uuid);
        toast.success(t('qrCodes.uuidCopied', 'UUID copied to clipboard'));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get unique entity types for filter
    const entityTypes = useMemo(() => {
        const types = new Set((qrCodes as QrCodeItem[]).map(q => q.entity_type));
        return Array.from(types).sort();
    }, [qrCodes]);

    return (
        <PageContainer
            title={t('qrCodes.title', 'QR Codes')}
            subtitle={t('qrCodes.subtitle', 'Generate and manage QR codes for your organization')}
        >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                                <QrCode className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">{t('qrCodes.stats.total', 'Total QR Codes')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.active}</p>
                                <p className="text-xs text-muted-foreground">{t('qrCodes.stats.active', 'Active')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.totalScans}</p>
                                <p className="text-xs text-muted-foreground">{t('qrCodes.stats.totalScans', 'Total Scans')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.publicCodes}</p>
                                <p className="text-xs text-muted-foreground">{t('qrCodes.stats.public', 'Public')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('qrCodes.search', 'Search QR codes...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder={t('qrCodes.entityType', 'Entity Type')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                            {entityTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                    {entityTypeLabels[type]?.label || type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[120px] h-9">
                            <SelectValue placeholder={t('qrCodes.status', 'Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                            <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                            <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex border rounded-md">
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 rounded-r-none"
                            onClick={() => setViewMode('table')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 rounded-l-none"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => setIsModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t('qrCodes.generate', 'Generate QR Code')}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : filteredQrCodes.length === 0 ? (
                <div className="text-center py-12">
                    <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {search || entityTypeFilter !== 'all' || statusFilter !== 'all'
                            ? t('qrCodes.noResults', 'No QR codes match your filters.')
                            : t('qrCodes.empty', 'No QR codes yet. Generate your first QR code to get started.')}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredQrCodes.map((qr: QrCodeItem) => {
                        const entityInfo = entityTypeLabels[qr.entity_type] || { label: qr.entity_type, color: 'bg-gray-100 text-gray-800' };
                        return (
                            <Card key={qr.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleQrCodeClick(qr)}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <QrCode className="h-5 w-5 text-cyan-500" />
                                            <CardTitle className="text-sm font-medium truncate">
                                                {qr.label || `QR-${qr.id}`}
                                            </CardTitle>
                                        </div>
                                        <Badge variant={qr.is_active ? 'default' : 'secondary'} className="text-xs">
                                            {qr.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className={`border-0 text-xs ${entityInfo.color}`}>
                                            {entityInfo.label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={getEntityName(qr.entity_type, qr.entity_id)}>
                                            {getEntityName(qr.entity_type, qr.entity_id)}
                                        </span>
                                    </div>
                                    {qr.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{qr.description}</p>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                        <span className="flex items-center gap-1">
                                            <BarChart3 className="h-3 w-3" />
                                            {qr.scan_count} {t('qrCodes.scans', 'scans')}
                                        </span>
                                        <span>{formatDate(qr.created_at)}</span>
                                    </div>
                                    <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title={t('qrCodes.copyUuid', 'Copy UUID')}
                                            onClick={(e) => { e.stopPropagation(); copyUuid(qr.uuid); }}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title={t('qrCodes.viewQrCode', 'View QR Code')}
                                            onClick={(e) => { e.stopPropagation(); handleQrCodeClick(qr); }}
                                        >
                                            <Download className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('qrCodes.table.label', 'Label')}</TableHead>
                                <TableHead>{t('qrCodes.table.entityType', 'Entity Type')}</TableHead>
                                <TableHead>{t('qrCodes.table.action', 'Action')}</TableHead>
                                <TableHead>{t('qrCodes.table.status', 'Status')}</TableHead>
                                <TableHead>{t('qrCodes.table.access', 'Access')}</TableHead>
                                <TableHead className="text-right">{t('qrCodes.table.scans', 'Scans')}</TableHead>
                                <TableHead>{t('qrCodes.table.lastScanned', 'Last Scanned')}</TableHead>
                                <TableHead>{t('qrCodes.table.created', 'Created')}</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQrCodes.map((qr: QrCodeItem) => {
                                const entityInfo = entityTypeLabels[qr.entity_type] || { label: qr.entity_type, color: 'bg-gray-100 text-gray-800' };
                                return (
                                    <TableRow key={qr.id} className="cursor-pointer" onClick={() => handleQrCodeClick(qr)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <QrCode className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                                                {qr.label || `QR-${qr.id}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <Badge className={`border-0 text-xs w-fit ${entityInfo.color}`}>
                                                    {entityInfo.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={getEntityName(qr.entity_type, qr.entity_id)}>
                                                    {getEntityName(qr.entity_type, qr.entity_id)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {actionLabels[qr.action] || qr.action}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={qr.is_active ? 'default' : 'secondary'} className="text-xs">
                                                {qr.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {qr.is_public ? t('qrCodes.public', 'Public') : t('qrCodes.private', 'Private')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{qr.scan_count}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(qr.last_scanned_at)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(qr.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                title={t('qrCodes.copyUuid', 'Copy UUID')}
                                                onClick={(e) => { e.stopPropagation(); copyUuid(qr.uuid); }}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <GenerateQrCodeModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />

            <QrCodeDetailModal
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                qrCode={selectedQrCode}
            />
        </PageContainer>
    );
};
