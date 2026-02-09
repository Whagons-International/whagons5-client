import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import {
    Wrench,
    Monitor,
    Car,
    Hammer,
    Building,
    Server,
    ShieldCheck,
    Armchair,
    Laptop,
    Printer,
    Phone,
    Wifi,
    Camera,
    Lightbulb,
    Fan,
    Thermometer,
    Droplets,
    Zap,
    Cog,
    Package,
    Box,
    Archive,
    Briefcase,
    Clock,
    Key,
    Lock,
    MapPin,
    Truck,
    Plane,
    Ship,
    Bike,
    HeartPulse,
    Stethoscope,
    Syringe,
    Pill,
    FlaskConical,
    Microscope,
    GraduationCap,
    BookOpen,
    PenTool,
    Scissors,
    Paintbrush,
    Music,
    Headphones,
    Speaker,
    Tv,
    Gamepad,
    Dumbbell,
    Trophy,
    Utensils,
    Coffee,
    ShoppingCart,
    CreditCard,
    Banknote,
    BarChart,
    PieChart,
    FileText,
    FolderOpen,
    HardDrive,
    Cpu,
    MemoryStick,
    Router,
    Cable,
    Battery,
    Plug,
    type LucideIcon,
} from 'lucide-react';
import type { AssetType } from '@/store/types';

// Icon options with categories
const ICON_OPTIONS: { name: string; icon: LucideIcon; category: string }[] = [
    // Equipment & Tools
    { name: 'Wrench', icon: Wrench, category: 'tools' },
    { name: 'Hammer', icon: Hammer, category: 'tools' },
    { name: 'Cog', icon: Cog, category: 'tools' },
    { name: 'Scissors', icon: Scissors, category: 'tools' },
    { name: 'PenTool', icon: PenTool, category: 'tools' },
    { name: 'Paintbrush', icon: Paintbrush, category: 'tools' },
    
    // Electronics & IT
    { name: 'Monitor', icon: Monitor, category: 'electronics' },
    { name: 'Laptop', icon: Laptop, category: 'electronics' },
    { name: 'Printer', icon: Printer, category: 'electronics' },
    { name: 'Phone', icon: Phone, category: 'electronics' },
    { name: 'Tv', icon: Tv, category: 'electronics' },
    { name: 'Camera', icon: Camera, category: 'electronics' },
    { name: 'Headphones', icon: Headphones, category: 'electronics' },
    { name: 'Speaker', icon: Speaker, category: 'electronics' },
    { name: 'Gamepad', icon: Gamepad, category: 'electronics' },
    
    // IT Infrastructure
    { name: 'Server', icon: Server, category: 'infrastructure' },
    { name: 'HardDrive', icon: HardDrive, category: 'infrastructure' },
    { name: 'Cpu', icon: Cpu, category: 'infrastructure' },
    { name: 'MemoryStick', icon: MemoryStick, category: 'infrastructure' },
    { name: 'Router', icon: Router, category: 'infrastructure' },
    { name: 'Wifi', icon: Wifi, category: 'infrastructure' },
    { name: 'Cable', icon: Cable, category: 'infrastructure' },
    
    // Power & Electrical
    { name: 'Zap', icon: Zap, category: 'electrical' },
    { name: 'Battery', icon: Battery, category: 'electrical' },
    { name: 'Plug', icon: Plug, category: 'electrical' },
    { name: 'Lightbulb', icon: Lightbulb, category: 'electrical' },
    
    // HVAC & Climate
    { name: 'Fan', icon: Fan, category: 'hvac' },
    { name: 'Thermometer', icon: Thermometer, category: 'hvac' },
    { name: 'Droplets', icon: Droplets, category: 'hvac' },
    
    // Furniture & Office
    { name: 'Armchair', icon: Armchair, category: 'furniture' },
    { name: 'Briefcase', icon: Briefcase, category: 'furniture' },
    { name: 'FileText', icon: FileText, category: 'furniture' },
    { name: 'FolderOpen', icon: FolderOpen, category: 'furniture' },
    
    // Buildings & Locations
    { name: 'Building', icon: Building, category: 'building' },
    { name: 'MapPin', icon: MapPin, category: 'building' },
    { name: 'Key', icon: Key, category: 'building' },
    { name: 'Lock', icon: Lock, category: 'building' },
    
    // Vehicles & Transport
    { name: 'Car', icon: Car, category: 'vehicles' },
    { name: 'Truck', icon: Truck, category: 'vehicles' },
    { name: 'Plane', icon: Plane, category: 'vehicles' },
    { name: 'Ship', icon: Ship, category: 'vehicles' },
    { name: 'Bike', icon: Bike, category: 'vehicles' },
    
    // Safety & Security
    { name: 'ShieldCheck', icon: ShieldCheck, category: 'safety' },
    { name: 'HeartPulse', icon: HeartPulse, category: 'safety' },
    
    // Medical & Lab
    { name: 'Stethoscope', icon: Stethoscope, category: 'medical' },
    { name: 'Syringe', icon: Syringe, category: 'medical' },
    { name: 'Pill', icon: Pill, category: 'medical' },
    { name: 'FlaskConical', icon: FlaskConical, category: 'medical' },
    { name: 'Microscope', icon: Microscope, category: 'medical' },
    
    // Education & Training
    { name: 'GraduationCap', icon: GraduationCap, category: 'education' },
    { name: 'BookOpen', icon: BookOpen, category: 'education' },
    
    // Storage & Inventory
    { name: 'Package', icon: Package, category: 'storage' },
    { name: 'Box', icon: Box, category: 'storage' },
    { name: 'Archive', icon: Archive, category: 'storage' },
    { name: 'ShoppingCart', icon: ShoppingCart, category: 'storage' },
    
    // Finance & Business
    { name: 'CreditCard', icon: CreditCard, category: 'finance' },
    { name: 'Banknote', icon: Banknote, category: 'finance' },
    { name: 'BarChart', icon: BarChart, category: 'finance' },
    { name: 'PieChart', icon: PieChart, category: 'finance' },
    
    // Recreation & Others
    { name: 'Music', icon: Music, category: 'other' },
    { name: 'Dumbbell', icon: Dumbbell, category: 'other' },
    { name: 'Trophy', icon: Trophy, category: 'other' },
    { name: 'Utensils', icon: Utensils, category: 'other' },
    { name: 'Coffee', icon: Coffee, category: 'other' },
    { name: 'Clock', icon: Clock, category: 'other' },
];

// Color palette with semantic names
const COLOR_PALETTE = [
    // Blues
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    // Greens
    { name: 'Emerald', value: '#10b981' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    // Warm
    { name: 'Yellow', value: '#eab308' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    // Others
    { name: 'Pink', value: '#ec4899' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Gray', value: '#6b7280' },
];

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
        description: '',
        color: '#6366f1',
        icon: 'Package',
    });

    const isEditing = !!assetType;

    useEffect(() => {
        if (assetType) {
            setForm({
                name: assetType.name || '',
                description: assetType.description || '',
                color: assetType.color || '#6366f1',
                icon: assetType.icon || 'Package',
            });
        } else {
            setForm({ name: '', description: '', color: '#6366f1', icon: 'Package' });
        }
    }, [assetType, open]);

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setIsSubmitting(true);
        try {
            await onSubmit({
                name: form.name,
                description: form.description || null,
                color: form.color || null,
                icon: form.icon || null,
            });
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get selected icon component
    const selectedIconData = ICON_OPTIONS.find(i => i.name === form.icon);
    const SelectedIcon = selectedIconData?.icon || Package;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? t('assets.types.editType', 'Edit Asset Type')
                            : t('assets.types.addType', 'Add Asset Type')}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid gap-5 py-4">
                        {/* Preview */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: form.color }}
                            >
                                <SelectedIcon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                    {form.name || t('assets.types.untitled', 'Untitled Type')}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {form.description || t('assets.types.noDescription', 'No description')}
                                </p>
                            </div>
                        </div>

                        {/* Name field */}
                        <div className="grid gap-2">
                            <Label htmlFor="typeName">{t('assets.types.name', 'Name')} *</Label>
                            <Input
                                id="typeName"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t('assets.types.namePlaceholder', 'e.g., HVAC, Furniture, IT Equipment')}
                            />
                        </div>

                        {/* Description field */}
                        <div className="grid gap-2">
                            <Label htmlFor="typeDescription">{t('assets.types.description', 'Description')}</Label>
                            <Textarea
                                id="typeDescription"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder={t('assets.types.descriptionPlaceholder', 'Describe what assets belong to this type...')}
                                rows={2}
                            />
                        </div>

                        {/* Color picker */}
                        <div className="grid gap-2">
                            <Label>{t('assets.types.color', 'Color')}</Label>
                            <div className="grid grid-cols-8 gap-2">
                                {COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, color: color.value })}
                                        className={cn(
                                            'w-8 h-8 rounded-lg transition-all hover:scale-110',
                                            form.color === color.value && 'ring-2 ring-offset-2 ring-primary'
                                        )}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                            {/* Custom color input */}
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="h-8 w-10 rounded border cursor-pointer"
                                />
                                <Input
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    placeholder="#6366f1"
                                />
                            </div>
                        </div>

                        {/* Icon picker */}
                        <div className="grid gap-2">
                            <Label>{t('assets.types.icon', 'Icon')}</Label>
                            <ScrollArea className="h-[180px] rounded-lg border p-3">
                                <div className="grid grid-cols-8 gap-2">
                                    {ICON_OPTIONS.map((iconOption) => {
                                        const IconComponent = iconOption.icon;
                                        const isSelected = form.icon === iconOption.name;
                                        return (
                                            <button
                                                key={iconOption.name}
                                                type="button"
                                                onClick={() => setForm({ ...form, icon: iconOption.name })}
                                                className={cn(
                                                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-muted',
                                                    isSelected && 'ring-2 ring-primary bg-primary/10'
                                                )}
                                                title={iconOption.name}
                                            >
                                                <IconComponent 
                                                    className={cn(
                                                        'h-5 w-5',
                                                        isSelected ? 'text-primary' : 'text-muted-foreground'
                                                    )} 
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim()}>
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
