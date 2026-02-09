import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { genericActions } from '@/store/genericSlices';
import { AppDispatch, RootState } from '@/store/store';
import { useLanguage } from '@/providers/LanguageProvider';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

interface GenerateQrCodeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ENTITY_TYPES = [
    { value: 'spot', label: 'Spot' },
    { value: 'task', label: 'Task' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'form', label: 'Form' },
    { value: 'document', label: 'Document' },
    { value: 'template', label: 'Template' },
];

const ACTIONS = [
    { value: 'view', label: 'View' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'submit_form', label: 'Submit Form' },
    { value: 'acknowledge', label: 'Acknowledge' },
    { value: 'navigate', label: 'Navigate' },
];

export const GenerateQrCodeModal: React.FC<GenerateQrCodeModalProps> = ({
    open,
    onOpenChange,
}) => {
    const { t } = useLanguage();
    const dispatch = useDispatch<AppDispatch>();

    // Get entities from Redux store
    const spots = useSelector((state: RootState) => state.spots?.value || []);
    const tasks = useSelector((state: RootState) => state.tasks?.value || []);
    const workspaces = useSelector((state: RootState) => state.workspaces?.value || []);
    const forms = useSelector((state: RootState) => state.forms?.value || []);
    const documents = useSelector((state: RootState) => state.documents?.value || []);
    const templates = useSelector((state: RootState) => state.templates?.value || []);

    // Form state
    const [entityType, setEntityType] = useState<string>('spot');
    const [entityId, setEntityId] = useState<string>('');
    const [action, setAction] = useState<string>('view');
    const [label, setLabel] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [isPublic, setIsPublic] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState(false);

    // Get entities based on selected entity type
    const availableEntities = useMemo(() => {
        switch (entityType) {
            case 'spot':
                return spots.map((s: any) => ({ id: s.id, name: s.name }));
            case 'task':
                return tasks.map((t: any) => ({ id: t.id, name: t.name || `Task #${t.id}` }));
            case 'workspace':
                return workspaces.map((w: any) => ({ id: w.id, name: w.name }));
            case 'form':
                return forms.map((f: any) => ({ id: f.id, name: f.name }));
            case 'document':
                return documents.map((d: any) => ({ id: d.id, name: d.title || d.name || `Document #${d.id}` }));
            case 'template':
                return templates.map((t: any) => ({ id: t.id, name: t.name }));
            default:
                return [];
        }
    }, [entityType, spots, tasks, workspaces, forms, documents, templates]);

    // Handle entity type change - reset entity selection
    const handleEntityTypeChange = (value: string) => {
        setEntityType(value);
        setEntityId('');
    };

    const resetForm = () => {
        setEntityType('spot');
        setEntityId('');
        setAction('view');
        setLabel('');
        setDescription('');
        setIsActive(true);
        setIsPublic(false);
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!entityId || !entityType) {
            toast.error(t('qrCodes.validation.required', 'Entity type and ID are required'));
            return;
        }

        const parsedEntityId = parseInt(entityId, 10);
        if (isNaN(parsedEntityId) || parsedEntityId < 1) {
            toast.error(t('qrCodes.validation.invalidEntityId', 'Entity ID must be a positive number'));
            return;
        }

        setSubmitting(true);

        try {
            await dispatch(
                genericActions.qrCodes.addAsync({
                    entity_type: entityType,
                    entity_id: parsedEntityId,
                    action: action || 'view',
                    label: label || null,
                    description: description || null,
                    is_active: isActive,
                    is_public: isPublic,
                })
            ).unwrap();

            toast.success(t('qrCodes.created', 'QR code generated successfully'));
            handleClose();
        } catch (error: any) {
            toast.error(error?.message || t('qrCodes.createError', 'Failed to generate QR code'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('qrCodes.generateTitle', 'Generate QR Code')}</DialogTitle>
                    <DialogDescription>
                        {t('qrCodes.generateDescription', 'Create a new QR code linked to an entity in your organization.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="entityType">{t('qrCodes.form.entityType', 'Entity Type')} *</Label>
                            <Select value={entityType} onValueChange={handleEntityTypeChange}>
                                <SelectTrigger id="entityType">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENTITY_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="entityId">{t('qrCodes.form.entity', 'Entity')} *</Label>
                            <Select value={entityId} onValueChange={setEntityId}>
                                <SelectTrigger id="entityId">
                                    <SelectValue placeholder={t('qrCodes.form.selectEntity', 'Select an entity')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableEntities.length === 0 ? (
                                        <SelectItem value="_empty" disabled>
                                            {t('qrCodes.form.noEntities', 'No entities available')}
                                        </SelectItem>
                                    ) : (
                                        availableEntities.map((entity) => (
                                            <SelectItem key={entity.id} value={String(entity.id)}>
                                                {entity.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="action">{t('qrCodes.form.action', 'Action')}</Label>
                        <Select value={action} onValueChange={setAction}>
                            <SelectTrigger id="action">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACTIONS.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>
                                        {a.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="label">{t('qrCodes.form.label', 'Label')}</Label>
                        <Input
                            id="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={t('qrCodes.form.labelPlaceholder', 'Optional label for this QR code')}
                            maxLength={255}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">{t('qrCodes.form.description', 'Description')}</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('qrCodes.form.descriptionPlaceholder', 'Optional description')}
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                            <Label htmlFor="isActive" className="cursor-pointer">
                                {t('qrCodes.form.active', 'Active')}
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isPublic"
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                            />
                            <Label htmlFor="isPublic" className="cursor-pointer">
                                {t('qrCodes.form.public', 'Public')}
                            </Label>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting
                                ? t('common.creating', 'Creating...')
                                : t('qrCodes.generate', 'Generate QR Code')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
