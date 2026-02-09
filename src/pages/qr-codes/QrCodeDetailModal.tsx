import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, Copy, ExternalLink, BarChart3, Calendar, Clock, QrCode, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/api/whagonsApi';

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

interface QrCodeDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qrCode: QrCodeItem | null;
}

const entityTypeLabels: Record<string, { label: string; color: string }> = {
    spot: { label: 'Spot', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    task: { label: 'Task', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    form: { label: 'Form', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    document: { label: 'Document', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    asset: { label: 'Asset', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
};

const actionLabels: Record<string, string> = {
    view: 'View',
    create_task: 'Create Task',
    open_form: 'Open Form',
    navigate: 'Navigate',
    submit_form: 'Submit Form',
    acknowledge: 'Acknowledge',
};

export const QrCodeDetailModal: React.FC<QrCodeDetailModalProps> = ({
    open,
    onOpenChange,
    qrCode,
}) => {
    const { t } = useLanguage();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<'png' | 'svg'>('svg');
    const [selectedSize, setSelectedSize] = useState<number>(256);

    // Logo state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoSize, setLogoSize] = useState<number>(20); // percentage (10-30)
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    // Use ref to track current blob URL for proper cleanup
    const currentBlobUrlRef = useRef<string | null>(null);

    // Fetch QR code image when modal opens or format/size/logo changes
    useEffect(() => {
        if (open && qrCode) {
            fetchQrImage();
        }
        return () => {
            // Cleanup object URL on unmount - use ref to get current blob URL
            if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(currentBlobUrlRef.current);
                currentBlobUrlRef.current = null;
            }
        };
    }, [open, qrCode?.id, selectedFormat, selectedSize, logoFile, logoSize]);

    const fetchQrImage = async () => {
        if (!qrCode) return;
        
        setLoading(true);
        setImageError(null);

        try {
            let response;

            if (logoFile) {
                // Use FormData to send the logo file along with params
                const formData = new FormData();
                formData.append('logo_file', logoFile);
                formData.append('logo_size', String(logoSize));

                response = await api.post(
                    `/qr-codes/${qrCode.id}/image?format=${selectedFormat}&size=${selectedSize}`,
                    formData,
                    {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        responseType: 'blob',
                    }
                );
            } else {
                response = await api.get(`/qr-codes/${qrCode.id}/image`, {
                    params: {
                        format: selectedFormat,
                        size: selectedSize,
                    },
                    responseType: 'blob',
                });
            }

            // response.data is already a Blob when responseType is 'blob'
            // Just use it directly instead of wrapping in new Blob()
            const blob = response.data;
            const url = URL.createObjectURL(blob);
            
            // Cleanup previous URL using ref
            if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(currentBlobUrlRef.current);
            }
            
            setImageUrl(url);
            currentBlobUrlRef.current = url;
        } catch (error: any) {
            console.error('Failed to fetch QR code image:', error);
            setImageError(error?.response?.data?.message || 'Failed to load QR code image');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (format: 'png' | 'svg') => {
        if (!qrCode) return;

        try {
            let response;

            if (logoFile) {
                const formData = new FormData();
                formData.append('logo_file', logoFile);
                formData.append('logo_size', String(logoSize));

                response = await api.post(
                    `/qr-codes/${qrCode.id}/image?format=${format}&size=${selectedSize}`,
                    formData,
                    {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        responseType: 'blob',
                    }
                );
            } else {
                response = await api.get(`/qr-codes/${qrCode.id}/image`, {
                    params: {
                        format,
                        size: selectedSize,
                    },
                    responseType: 'blob',
                });
            }

            // response.data is already a Blob when responseType is 'blob'
            // Just use it directly instead of wrapping in new Blob()
            const blob = response.data;
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${qrCode.label || `QR-${qrCode.id}`}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            toast.success(t('qrCodes.downloaded', 'QR code downloaded'));
        } catch (error: any) {
            console.error('Failed to download QR code:', error);
            toast.error(error?.response?.data?.message || t('qrCodes.downloadError', 'Failed to download QR code'));
        }
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error(t('qrCodes.logo.invalidType', 'Please select a valid image file'));
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error(t('qrCodes.logo.tooLarge', 'Logo image must be under 2MB'));
            return;
        }

        setLogoFile(file);

        // Create preview URL
        if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
        }
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleLogoRemove = () => {
        setLogoFile(null);
        if (logoPreview) {
            URL.revokeObjectURL(logoPreview);
            setLogoPreview(null);
        }
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const copyUuid = () => {
        if (!qrCode) return;
        navigator.clipboard.writeText(qrCode.uuid);
        toast.success(t('qrCodes.uuidCopied', 'UUID copied to clipboard'));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!qrCode) return null;

    const entityInfo = entityTypeLabels[qrCode.entity_type] || { 
        label: qrCode.entity_type, 
        color: 'bg-gray-100 text-gray-800' 
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-cyan-500" />
                        {qrCode.label || `QR-${qrCode.id}`}
                    </DialogTitle>
                    <DialogDescription>
                        {qrCode.description || t('qrCodes.viewDetails', 'View and download your QR code')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview">{t('qrCodes.tabs.preview', 'Preview')}</TabsTrigger>
                        <TabsTrigger value="details">{t('qrCodes.tabs.details', 'Details')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="space-y-4">
                        {/* QR Code Image */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 w-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('qrCodes.loading', 'Loading QR code...')}
                                    </p>
                                </div>
                            ) : imageError ? (
                                <div className="flex flex-col items-center justify-center h-64 w-64 text-center">
                                    <QrCode className="h-12 w-12 text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-destructive">{imageError}</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={fetchQrImage}
                                    >
                                        {t('common.retry', 'Retry')}
                                    </Button>
                                </div>
                            ) : imageUrl ? (
                                <img 
                                    src={imageUrl} 
                                    alt={qrCode.label || 'QR Code'} 
                                    className="max-w-full h-auto"
                                    style={{ maxHeight: '280px' }}
                                />
                            ) : null}
                        </div>

                        {/* Logo overlay controls */}
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <ImagePlus className="h-4 w-4" />
                                    {t('qrCodes.logo.title', 'Center Logo')}
                                </Label>
                                {logoFile && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLogoRemove}
                                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        {t('common.remove', 'Remove')}
                                    </Button>
                                )}
                            </div>

                            {logoFile && logoPreview ? (
                                <div className="flex items-center gap-3">
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="h-10 w-10 rounded object-contain border bg-white"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground truncate">{logoFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(logoFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    <ImagePlus className="h-4 w-4 mr-2" />
                                    {t('qrCodes.logo.upload', 'Upload Logo Image')}
                                </Button>
                            )}

                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                                className="hidden"
                                onChange={handleLogoSelect}
                            />

                            {logoFile && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">
                                            {t('qrCodes.logo.size', 'Logo Size')}
                                        </Label>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {logoSize}%
                                        </span>
                                    </div>
                                    <Slider
                                        value={[logoSize]}
                                        onValueChange={([value]) => setLogoSize(value)}
                                        min={10}
                                        max={30}
                                        step={1}
                                        className="w-full"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {t('qrCodes.logo.sizeHint', 'Recommended: 15-20%. Larger logos may affect scannability.')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Size selector */}
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('qrCodes.size', 'Size')}:</span>
                            {[128, 256, 512].map((size) => (
                                <Button
                                    key={size}
                                    variant={selectedSize === size ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedSize(size)}
                                >
                                    {size}px
                                </Button>
                            ))}
                        </div>

                        {/* Download buttons */}
                        <div className="flex gap-2 justify-center">
                            <Button 
                                variant="outline" 
                                onClick={() => handleDownload('png')}
                                className="flex-1"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {t('qrCodes.downloadPng', 'Download PNG')}
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => handleDownload('svg')}
                                className="flex-1"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {t('qrCodes.downloadSvg', 'Download SVG')}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4">
                        {/* Status badges */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={qrCode.is_active ? 'default' : 'secondary'}>
                                {qrCode.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                            </Badge>
                            <Badge variant="outline">
                                {qrCode.is_public ? t('qrCodes.public', 'Public') : t('qrCodes.private', 'Private')}
                            </Badge>
                            <Badge className={`border-0 ${entityInfo.color}`}>
                                {entityInfo.label} #{qrCode.entity_id}
                            </Badge>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">{t('qrCodes.action', 'Action')}</p>
                                <p className="font-medium">{actionLabels[qrCode.action] || qrCode.action}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('qrCodes.format', 'Format')}</p>
                                <p className="font-medium">{qrCode.content_format || 'URL'}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <BarChart3 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-muted-foreground">{t('qrCodes.totalScans', 'Total Scans')}</p>
                                    <p className="font-medium">{qrCode.scan_count}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-muted-foreground">{t('qrCodes.lastScanned', 'Last Scanned')}</p>
                                    <p className="font-medium">{formatDate(qrCode.last_scanned_at)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-muted-foreground">{t('qrCodes.created', 'Created')}</p>
                                    <p className="font-medium">{formatDate(qrCode.created_at)}</p>
                                </div>
                            </div>
                            {qrCode.expires_at && (
                                <div className="flex items-start gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-muted-foreground">{t('qrCodes.expires', 'Expires')}</p>
                                        <p className="font-medium">{formatDate(qrCode.expires_at)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* UUID section */}
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground mb-1">{t('qrCodes.uuid', 'UUID')}</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-muted p-2 rounded font-mono truncate">
                                    {qrCode.uuid}
                                </code>
                                <Button variant="ghost" size="icon" onClick={copyUuid}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
