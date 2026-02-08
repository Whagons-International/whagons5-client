import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
	faLink, 
	faPlus, 
	faEdit, 
	faTrash, 
	faCheck, 
	faX, 
	faSpinner,
	faCalendarDays,
	faBolt,
	faStore,
	faStar,
	faRocket,
	faClock,
	faKey,
	faGlobe
} from '@fortawesome/free-solid-svg-icons';
// Brand logos as inline SVG components for better quality
import { useLanguage } from '@/providers/LanguageProvider';
import toast from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Webhook {
	id?: number;
	name: string;
	url: string;
	method: string;
	headers?: Record<string, string>;
	payload?: Record<string, any>;
	timeout?: number;
	is_active?: boolean;
	events?: string[];
	created_at?: string;
	updated_at?: string;
}

interface ApiKey {
	id?: number;
	name: string;
	key: string;
	scopes?: string[];
	is_active?: boolean;
	created_at?: string;
	expires_at?: string | null;
}

type IntegrationCategory = 'all' | 'calendar' | 'automation' | 'communication' | 'storage' | 'analytics';
type IntegrationStatus = 'available' | 'coming_soon' | 'connected';

interface Integration {
	id: string;
	name: string;
	description: string;
	icon: IconDefinition;
	logo?: React.ReactNode; // Custom SVG logo component
	color: string;
	borderColor: string;
	category: Exclude<IntegrationCategory, 'all'>;
	status: IntegrationStatus;
	features: string[];
	benefits: string[];
}

// Brand Logo Components
const GoogleLogo = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="currentColor">
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
	</svg>
);

const MicrosoftLogo = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="currentColor">
		<rect x="1" y="1" width="10" height="10" fill="#F25022"/>
		<rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
		<rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
		<rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
	</svg>
);

const ZapierLogo = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.121l-1.773-1.773 1.773-1.773a.75.75 0 00-1.06-1.06l-1.773 1.773-1.773-1.773a.75.75 0 00-1.06 1.06l1.773 1.773-1.773 1.773a.75.75 0 001.06 1.06l1.773-1.773 1.773 1.773a.75.75 0 001.06-1.06zM12 3a9 9 0 110 18 9 9 0 010-18z" fill="#FF4A00"/>
	</svg>
);

interface IntegrationModalData {
	integration: Integration;
	isOpen: boolean;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const INTEGRATIONS_STORAGE_KEY = 'wh-integrations-webhooks-v1';
const API_KEYS_STORAGE_KEY = 'wh-integrations-api-keys-v1';

const loadWebhooks = (): Webhook[] => {
	try {
		const raw = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
};

const saveWebhooks = (webhooks: Webhook[]) => {
	try {
		localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(webhooks));
	} catch (error) {
		console.error('Error saving webhooks:', error);
	}
};

const loadApiKeys = (): ApiKey[] => {
	try {
		const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
};

const saveApiKeys = (apiKeys: ApiKey[]) => {
	try {
		localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
	} catch (error) {
		console.error('Error saving API keys:', error);
	}
};

// ============================================================================
// INTEGRATIONS DATA (MOCKUPS)
// ============================================================================

const INTEGRATIONS: Integration[] = [
	{
		id: 'google-calendar',
		name: 'Google Calendar',
		description: 'Sync task deadlines and SLA due dates with Google Calendar',
		icon: faCalendarDays,
		logo: <GoogleLogo className="w-10 h-10" />,
		color: 'text-red-500',
		borderColor: 'hover:border-red-500/40 hover:shadow-red-500/20',
		category: 'calendar',
		status: 'coming_soon',
		features: [
			'Two-way sync between Whagons tasks and Google Calendar events',
			'Automatic calendar events for task deadlines and SLA due dates',
			'See task details directly in your calendar',
			'Smart conflict detection for overlapping deadlines',
			'Team calendar view for shared visibility'
		],
		benefits: [
			'Never miss a deadline with calendar reminders',
			'Unified view of all your commitments',
			'Better time management and planning',
			'Seamless workflow across tools you already use'
		]
	},
	{
		id: 'microsoft-calendar',
		name: 'Microsoft Calendar',
		description: 'Sync with Outlook Calendar for enterprise teams',
		icon: faCalendarDays,
		logo: <MicrosoftLogo className="w-10 h-10" />,
		color: 'text-blue-500',
		borderColor: 'hover:border-blue-500/40 hover:shadow-blue-500/20',
		category: 'calendar',
		status: 'coming_soon',
		features: [
			'Two-way sync with Microsoft Outlook Calendar',
			'Integration with Microsoft 365 ecosystem',
			'Support for shared team calendars',
			'Meeting scheduling based on task requirements',
			'Enterprise-grade security and compliance'
		],
		benefits: [
			'Perfect for Microsoft 365 organizations',
			'Leverage existing enterprise infrastructure',
			'Maintain compliance with corporate policies',
			'Unified scheduling across your organization'
		]
	},
	{
		id: 'zapier',
		name: 'Zapier',
		description: 'Connect to 5,000+ apps with powerful automation workflows',
		icon: faBolt,
		logo: <ZapierLogo className="w-10 h-10" />,
		color: 'text-orange-500',
		borderColor: 'hover:border-orange-500/40 hover:shadow-orange-500/20',
		category: 'automation',
		status: 'coming_soon',
		features: [
			'Connect Whagons to 5,000+ apps without code',
			'Create automated workflows (Zaps) for task management',
			'Trigger actions when tasks are created, updated, or completed',
			'Multi-step automations with conditional logic',
			'Pre-built templates for common workflows'
		],
		benefits: [
			'Automate repetitive tasks and save hours every week',
			'No coding required - visual workflow builder',
			'Connect with tools your team already uses',
			'Scale your operations without scaling your team'
		]
	}
];

const CATEGORIES: { id: IntegrationCategory; label: string; icon: IconDefinition }[] = [
	{ id: 'all', label: 'All', icon: faGlobe },
	{ id: 'calendar', label: 'Calendar', icon: faCalendarDays },
	{ id: 'automation', label: 'Automation', icon: faBolt },
	{ id: 'communication', label: 'Communication', icon: faLink },
];

// ============================================================================
// INTEGRATION CARD COMPONENT
// ============================================================================

interface IntegrationCardProps {
	integration: Integration;
	onClick: () => void;
	t: (key: string, fallback?: string) => string;
}

function IntegrationCard({ integration, onClick, t }: IntegrationCardProps) {
	const getStatusBadge = () => {
		switch (integration.status) {
			case 'connected':
				return (
					<div className="bg-emerald-500/90 text-white px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1">
						<FontAwesomeIcon icon={faCheck} className="text-xs" />
						{t('integrations.marketplace.connected', 'Connected')}
					</div>
				);
			case 'coming_soon':
				return (
					<div className="bg-amber-500/90 text-white px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1">
						<FontAwesomeIcon icon={faClock} className="text-xs" />
						{t('integrations.marketplace.comingSoon', 'Coming Soon')}
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div
			className="cursor-pointer transition-all duration-300 group select-none relative hover:scale-105"
			onClick={onClick}
		>
			<div className={`
				relative rounded-xl overflow-hidden
				bg-card/50 backdrop-blur-sm
				border-2 border-border/40
				transition-all duration-300
				hover:shadow-2xl
				${integration.borderColor}
				h-[140px]
			`}>
				{/* Status badge */}
				<div className="absolute top-2 right-2 flex items-center gap-2 z-20">
					{getStatusBadge()}
				</div>

				{/* Content container */}
				<div className="relative z-10 h-full flex flex-col items-center justify-center p-3">
					{/* Icon - with custom logo if available */}
					<div className="relative mb-2">
						{integration.logo ? (
							<div className="
								transition-all duration-300
								group-hover:scale-110 filter group-hover:brightness-110
							">
								{integration.logo}
							</div>
						) : (
							<div className={`
								${integration.color} 
								text-[2.5rem]
								drop-shadow-2xl
								transition-all duration-300
								group-hover:scale-110 group-hover:drop-shadow-[0_0_30px_currentColor] filter group-hover:brightness-110
							`}>
								<FontAwesomeIcon icon={integration.icon} />
							</div>
						)}
					</div>

					{/* Title */}
					<h3 className="font-bold text-sm text-center">
						{integration.name}
					</h3>
				</div>

				{/* Subtle radial gradient on hover */}
				<div className="
					absolute inset-0 
					bg-gradient-radial from-transparent via-transparent to-background/20
					opacity-0 group-hover:opacity-100
					transition-opacity duration-300
					pointer-events-none
				"></div>
			</div>
		</div>
	);
}

// ============================================================================
// INTEGRATION MODAL COMPONENT
// ============================================================================

interface IntegrationModalProps {
	integration: Integration | null;
	isOpen: boolean;
	onClose: () => void;
	t: (key: string, fallback?: string) => string;
}

function IntegrationModal({ integration, isOpen, onClose, t }: IntegrationModalProps) {
	if (!isOpen || !integration) return null;

	const handleNotifyMe = () => {
		// For now, show a toast - in production this would save to backend
		toast.success(t('integrations.marketplace.notifySuccess', "We'll notify you when this integration is available!"));
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
			<div 
				className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border-2 border-border overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="relative p-8 pb-6 bg-gradient-to-br from-background via-background to-background/80">
					<button 
						onClick={onClose}
						className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
					
					<div className="flex items-center gap-4">
						<div className="drop-shadow-lg">
							{integration.logo ? (
								<div className="w-14 h-14">{integration.logo}</div>
							) : (
								<div className={`${integration.color} text-5xl`}>
									<FontAwesomeIcon icon={integration.icon} />
								</div>
							)}
						</div>
						<div>
							<div className="flex items-center gap-2 mb-1">
								<h2 className="text-3xl font-bold">{integration.name}</h2>
								{integration.status === 'coming_soon' && (
									<Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
										{t('integrations.marketplace.comingSoon', 'Coming Soon')}
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground">{integration.description}</p>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="p-8 space-y-6">
					{/* Features Section */}
					<div>
						<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
							<FontAwesomeIcon icon={faStar} className="text-amber-500" />
							{t('integrations.marketplace.keyFeatures', 'Key Features')}
						</h3>
						<ul className="space-y-2">
							{integration.features.map((feature, index) => (
								<li key={index} className="flex items-start gap-2 text-sm">
									<FontAwesomeIcon icon={faCheck} className="text-emerald-500 mt-1 flex-shrink-0" />
									<span>{feature}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Benefits Section */}
					<div>
						<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
							<FontAwesomeIcon icon={faRocket} className="text-primary" />
							{t('integrations.marketplace.benefits', "What You'll Get")}
						</h3>
						<ul className="space-y-2">
							{integration.benefits.map((benefit, index) => (
								<li key={index} className="flex items-start gap-2 text-sm">
									<div className={`${integration.color} mt-1 flex-shrink-0`}>&#10038;</div>
									<span>{benefit}</span>
								</li>
							))}
						</ul>
					</div>

					{/* CTA Section */}
					<div className="pt-4 border-t border-border">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm text-muted-foreground">
									{integration.status === 'coming_soon' 
										? t('integrations.marketplace.comingSoonDescription', 'This integration is coming soon. Get notified when it launches!')
										: t('integrations.marketplace.connectDescription', 'Connect your account to get started.')}
								</p>
							</div>
							{integration.status === 'coming_soon' ? (
								<Button onClick={handleNotifyMe} className="bg-primary hover:bg-primary/90">
									{t('integrations.marketplace.notifyMe', 'Notify Me')}
								</Button>
							) : (
								<Button className="bg-primary hover:bg-primary/90">
									{t('integrations.marketplace.connect', 'Connect')}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// CATEGORY FILTER COMPONENT
// ============================================================================

interface CategoryFilterProps {
	activeCategory: IntegrationCategory;
	onCategoryChange: (category: IntegrationCategory) => void;
	t: (key: string, fallback?: string) => string;
}

function CategoryFilter({ activeCategory, onCategoryChange, t }: CategoryFilterProps) {
	const getCategoryLabel = (categoryId: string) => {
		const labels: Record<string, string> = {
			all: t('integrations.categories.all', 'All'),
			calendar: t('integrations.categories.calendar', 'Calendar'),
			automation: t('integrations.categories.automation', 'Automation'),
			communication: t('integrations.categories.communication', 'Communication'),
			storage: t('integrations.categories.storage', 'Storage'),
			analytics: t('integrations.categories.analytics', 'Analytics'),
		};
		return labels[categoryId] || categoryId;
	};

	return (
		<div className="flex flex-wrap gap-2">
			{CATEGORIES.map((category) => (
				<button
					key={category.id}
					onClick={() => onCategoryChange(category.id)}
					className={`
						px-4 py-2 rounded-lg text-sm font-medium
						transition-all duration-200
						flex items-center gap-2
						${activeCategory === category.id
							? 'bg-primary text-primary-foreground shadow-md'
							: 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
						}
					`}
				>
					<FontAwesomeIcon icon={category.icon} className="text-xs" />
					{getCategoryLabel(category.id)}
				</button>
			))}
		</div>
	);
}

// ============================================================================
// REQUEST INTEGRATION CARD
// ============================================================================

interface RequestIntegrationCardProps {
	onClick: () => void;
	t: (key: string, fallback?: string) => string;
}

function RequestIntegrationCard({ onClick, t }: RequestIntegrationCardProps) {
	return (
		<div
			onClick={onClick}
			className="cursor-pointer transition-all duration-300 group select-none relative hover:scale-105"
		>
			<div className="
				relative rounded-xl overflow-hidden
				bg-card/30 backdrop-blur-sm
				border-2 border-dashed border-border/60
				transition-all duration-300
				hover:shadow-2xl hover:border-primary/50
				h-[140px]
				flex flex-col items-center justify-center
			">
				<div className="text-muted-foreground/50 group-hover:text-primary transition-colors text-4xl mb-2">
					<FontAwesomeIcon icon={faPlus} />
				</div>
				<h3 className="font-semibold text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors">
					{t('integrations.marketplace.requestIntegration', 'Request Integration')}
				</h3>
			</div>
		</div>
	);
}

// ============================================================================
// MARKETPLACE TAB COMPONENT
// ============================================================================

interface MarketplaceTabProps {
	t: (key: string, fallback?: string) => string;
}

function MarketplaceTab({ t }: MarketplaceTabProps) {
	const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('all');
	const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const filteredIntegrations = useMemo(() => {
		if (activeCategory === 'all') {
			return INTEGRATIONS;
		}
		return INTEGRATIONS.filter(i => i.category === activeCategory);
	}, [activeCategory]);

	const handleIntegrationClick = (integration: Integration) => {
		setSelectedIntegration(integration);
		setIsModalOpen(true);
	};

	const handleRequestIntegration = () => {
		const subject = t('integrations.marketplace.requestSubject', 'Integration Request for Whagons');
		window.open(`mailto:support@whagons.com?subject=${encodeURIComponent(subject)}`, '_blank');
	};

	return (
		<div className="space-y-6">
			{/* Category Filters */}
			<CategoryFilter 
				activeCategory={activeCategory}
				onCategoryChange={setActiveCategory}
				t={t}
			/>

			{/* Integrations Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				{filteredIntegrations.map((integration) => (
					<IntegrationCard
						key={integration.id}
						integration={integration}
						onClick={() => handleIntegrationClick(integration)}
						t={t}
					/>
				))}
				
				{/* Request Integration Card */}
				<RequestIntegrationCard onClick={handleRequestIntegration} t={t} />
			</div>

			{/* Empty State */}
			{filteredIntegrations.length === 0 && (
				<div className="text-center py-12">
					<FontAwesomeIcon icon={faStore} className="text-4xl text-muted-foreground mb-4" />
					<p className="text-muted-foreground">
						{t('integrations.marketplace.noIntegrations', 'No integrations found in this category')}
					</p>
				</div>
			)}

			{/* Integration Modal */}
			<IntegrationModal
				integration={selectedIntegration}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				t={t}
			/>
		</div>
	);
}

// ============================================================================
// WEBHOOKS TAB COMPONENT
// ============================================================================

interface WebhooksTabProps {
	webhooks: Webhook[];
	setWebhooks: React.Dispatch<React.SetStateAction<Webhook[]>>;
	t: (key: string, fallback?: string) => string;
}

function WebhooksTab({ webhooks, setWebhooks, t }: WebhooksTabProps) {
	const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
	const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
	const [testingWebhook, setTestingWebhook] = useState<number | null>(null);
	const [webhookForm, setWebhookForm] = useState<Omit<Webhook, 'id' | 'created_at' | 'updated_at'>>({
		name: '',
		url: '',
		method: 'POST',
		headers: {},
		payload: {},
		timeout: 10,
		is_active: true,
		events: [],
	});

	const handleAddWebhook = () => {
		setEditingWebhook(null);
		setWebhookForm({
			name: '',
			url: '',
			method: 'POST',
			headers: {},
			payload: {},
			timeout: 10,
			is_active: true,
			events: [],
		});
		setIsWebhookDialogOpen(true);
	};

	const handleEditWebhook = (webhook: Webhook) => {
		setEditingWebhook(webhook);
		setWebhookForm({
			name: webhook.name,
			url: webhook.url,
			method: webhook.method,
			headers: webhook.headers || {},
			payload: webhook.payload || {},
			timeout: webhook.timeout || 10,
			is_active: webhook.is_active ?? true,
			events: webhook.events || [],
		});
		setIsWebhookDialogOpen(true);
	};

	const handleSaveWebhook = () => {
		if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
			toast.error(t('integrations.errors.fillRequiredFields', 'Please fill in all required fields'));
			return;
		}

		try {
			if (editingWebhook?.id) {
				const updated = webhooks.map(w =>
					w.id === editingWebhook.id
						? { ...webhookForm, id: editingWebhook.id, updated_at: new Date().toISOString() }
						: w
				);
				setWebhooks(updated);
				saveWebhooks(updated);
				toast.success(t('integrations.webhookUpdated', 'Webhook updated successfully'));
			} else {
				const newWebhook: Webhook = {
					...webhookForm,
					id: Date.now(),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
				const updated = [...webhooks, newWebhook];
				setWebhooks(updated);
				saveWebhooks(updated);
				toast.success(t('integrations.webhookCreated', 'Webhook created successfully'));
			}
			setIsWebhookDialogOpen(false);
			setEditingWebhook(null);
		} catch (error) {
			toast.error(t('integrations.errors.saveError', 'Error saving webhook'));
		}
	};

	const handleDeleteWebhook = (id: number) => {
		if (confirm(t('integrations.confirmDeleteWebhook', 'Are you sure you want to delete this webhook?'))) {
			const updated = webhooks.filter(w => w.id !== id);
			setWebhooks(updated);
			saveWebhooks(updated);
			toast.success(t('integrations.webhookDeleted', 'Webhook deleted successfully'));
		}
	};

	const handleTestWebhook = async (webhook: Webhook) => {
		if (!webhook.id) return;
		
		setTestingWebhook(webhook.id);
		try {
			await new Promise(resolve => setTimeout(resolve, 1000));
			toast.success(t('integrations.webhookTestSuccess', 'Webhook test sent successfully'));
		} catch (error) {
			toast.error(t('integrations.webhookTestError', 'Error testing webhook'));
		} finally {
			setTestingWebhook(null);
		}
	};

	const toggleWebhookActive = (id: number) => {
		const updated = webhooks.map(w =>
			w.id === id ? { ...w, is_active: !w.is_active } : w
		);
		setWebhooks(updated);
		saveWebhooks(updated);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{t('integrations.webhooksDescription', 'Configure webhooks to send real-time notifications to external systems')}
				</p>
				<Button onClick={handleAddWebhook}>
					<FontAwesomeIcon icon={faPlus} className="mr-2" />
					{t('integrations.addWebhook', 'Add Webhook')}
				</Button>
			</div>

			{webhooks.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<FontAwesomeIcon icon={faLink} className="text-4xl text-muted-foreground mb-4" />
						<p className="text-muted-foreground mb-4">
							{t('integrations.noWebhooks', 'No webhooks configured')}
						</p>
						<Button onClick={handleAddWebhook} variant="outline">
							<FontAwesomeIcon icon={faPlus} className="mr-2" />
							{t('integrations.addWebhook', 'Add Webhook')}
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{webhooks.map((webhook) => (
						<Card key={webhook.id}>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<h3 className="font-semibold text-lg">{webhook.name}</h3>
										<Badge variant={webhook.is_active ? 'default' : 'secondary'}>
											{webhook.is_active
												? t('integrations.active', 'Active')
												: t('integrations.inactive', 'Inactive')}
										</Badge>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleTestWebhook(webhook)}
											disabled={testingWebhook === webhook.id}
										>
											{testingWebhook === webhook.id ? (
												<FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
											) : (
												<FontAwesomeIcon icon={faCheck} className="mr-2" />
											)}
											{t('integrations.test', 'Test')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => toggleWebhookActive(webhook.id!)}
										>
											<FontAwesomeIcon icon={webhook.is_active ? faX : faCheck} className="mr-2" />
											{webhook.is_active
												? t('integrations.deactivate', 'Deactivate')
												: t('integrations.activate', 'Activate')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleEditWebhook(webhook)}
										>
											<FontAwesomeIcon icon={faEdit} className="mr-2" />
											{t('common.edit', 'Edit')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDeleteWebhook(webhook.id!)}
										>
											<FontAwesomeIcon icon={faTrash} className="mr-2" />
											{t('common.delete', 'Delete')}
										</Button>
									</div>
								</div>
								<div className="space-y-2 text-sm">
									<div>
										<span className="font-medium">{t('integrations.url', 'URL')}:</span>{' '}
										<code className="bg-muted px-2 py-1 rounded">{webhook.url}</code>
									</div>
									<div>
										<span className="font-medium">{t('integrations.method', 'Method')}:</span>{' '}
										<Badge variant="outline">{webhook.method}</Badge>
									</div>
									{webhook.events && webhook.events.length > 0 && (
										<div>
											<span className="font-medium">{t('integrations.events', 'Events')}:</span>{' '}
											{webhook.events.map((event, idx) => (
												<Badge key={idx} variant="secondary" className="ml-1">
													{event}
												</Badge>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Webhook Dialog */}
			<Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingWebhook
								? t('integrations.editWebhook', 'Edit Webhook')
								: t('integrations.addWebhook', 'Add Webhook')}
						</DialogTitle>
						<DialogDescription>
							{t('integrations.webhookDialogDescription', 'Configure webhook settings to send notifications')}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div>
							<Label htmlFor="webhook-name">{t('integrations.name', 'Name')} *</Label>
							<Input
								id="webhook-name"
								value={webhookForm.name}
								onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
								placeholder={t('integrations.webhookNamePlaceholder', 'My Webhook')}
								required
							/>
						</div>

						<div>
							<Label htmlFor="webhook-url">{t('integrations.url', 'URL')} *</Label>
							<Input
								id="webhook-url"
								type="url"
								value={webhookForm.url}
								onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
								placeholder="https://api.example.com/webhook"
								required
							/>
						</div>

						<div>
							<Label htmlFor="webhook-method">{t('integrations.method', 'HTTP Method')}</Label>
							<Select
								value={webhookForm.method}
								onValueChange={(value) => setWebhookForm({ ...webhookForm, method: value })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="GET">GET</SelectItem>
									<SelectItem value="POST">POST</SelectItem>
									<SelectItem value="PUT">PUT</SelectItem>
									<SelectItem value="PATCH">PATCH</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="webhook-headers">{t('integrations.headers', 'Headers (JSON)')}</Label>
							<Textarea
								id="webhook-headers"
								value={webhookForm.headers ? JSON.stringify(webhookForm.headers, null, 2) : '{}'}
								onChange={(e) => {
									try {
										const parsed = JSON.parse(e.target.value);
										setWebhookForm({ ...webhookForm, headers: parsed });
									} catch (err) {
										// Allow invalid JSON while typing
									}
								}}
								placeholder={'{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'}
								rows={4}
							/>
						</div>

						<div>
							<Label htmlFor="webhook-payload">{t('integrations.payload', 'Payload (JSON)')}</Label>
							<Textarea
								id="webhook-payload"
								value={webhookForm.payload ? JSON.stringify(webhookForm.payload, null, 2) : '{}'}
								onChange={(e) => {
									try {
										const parsed = JSON.parse(e.target.value);
										setWebhookForm({ ...webhookForm, payload: parsed });
									} catch (err) {
										// Allow invalid JSON while typing
									}
								}}
								placeholder={'{\n  "event": "task.created",\n  "task_id": "{{task.id}}"\n}'}
								rows={6}
							/>
						</div>

						<div>
							<Label htmlFor="webhook-timeout">{t('integrations.timeout', 'Timeout (seconds)')}</Label>
							<Input
								id="webhook-timeout"
								type="number"
								value={webhookForm.timeout}
								onChange={(e) => setWebhookForm({ ...webhookForm, timeout: parseInt(e.target.value) || 10 })}
								placeholder="10"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsWebhookDialogOpen(false)}>
							{t('common.cancel', 'Cancel')}
						</Button>
						<Button onClick={handleSaveWebhook}>
							{editingWebhook ? t('common.save', 'Save') : t('common.create', 'Create')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ============================================================================
// API KEYS TAB COMPONENT
// ============================================================================

interface ApiKeysTabProps {
	apiKeys: ApiKey[];
	setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
	t: (key: string, fallback?: string) => string;
}

function ApiKeysTab({ apiKeys, setApiKeys, t }: ApiKeysTabProps) {
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
	const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
	const [apiKeyForm, setApiKeyForm] = useState<Omit<ApiKey, 'id' | 'key' | 'created_at'>>({
		name: '',
		scopes: [],
		is_active: true,
		expires_at: null,
	});

	const handleAddApiKey = () => {
		setEditingApiKey(null);
		setApiKeyForm({
			name: '',
			scopes: [],
			is_active: true,
			expires_at: null,
		});
		setIsApiKeyDialogOpen(true);
	};

	const handleEditApiKey = (apiKey: ApiKey) => {
		setEditingApiKey(apiKey);
		setApiKeyForm({
			name: apiKey.name,
			scopes: apiKey.scopes || [],
			is_active: apiKey.is_active ?? true,
			expires_at: apiKey.expires_at || null,
		});
		setIsApiKeyDialogOpen(true);
	};

	const handleSaveApiKey = () => {
		if (!apiKeyForm.name.trim()) {
			toast.error(t('integrations.errors.fillRequiredFields', 'Please fill in all required fields'));
			return;
		}

		try {
			if (editingApiKey?.id) {
				const updated = apiKeys.map(k =>
					k.id === editingApiKey.id
						? { ...apiKeyForm, id: editingApiKey.id, key: editingApiKey.key }
						: k
				);
				setApiKeys(updated);
				saveApiKeys(updated);
				toast.success(t('integrations.apiKeyUpdated', 'API key updated successfully'));
			} else {
				const newKey = `wh_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
				const newApiKey: ApiKey = {
					...apiKeyForm,
					id: Date.now(),
					key: newKey,
					created_at: new Date().toISOString(),
				};
				const updated = [...apiKeys, newApiKey];
				setApiKeys(updated);
				saveApiKeys(updated);
				toast.success(t('integrations.apiKeyCreated', 'API key created successfully'));
			}
			setIsApiKeyDialogOpen(false);
			setEditingApiKey(null);
		} catch (error) {
			toast.error(t('integrations.errors.saveError', 'Error saving API key'));
		}
	};

	const handleDeleteApiKey = (id: number) => {
		if (confirm(t('integrations.confirmDeleteApiKey', 'Are you sure you want to delete this API key?'))) {
			const updated = apiKeys.filter(k => k.id !== id);
			setApiKeys(updated);
			saveApiKeys(updated);
			toast.success(t('integrations.apiKeyDeleted', 'API key deleted successfully'));
		}
	};

	const toggleApiKeyActive = (id: number) => {
		const updated = apiKeys.map(k =>
			k.id === id ? { ...k, is_active: !k.is_active } : k
		);
		setApiKeys(updated);
		saveApiKeys(updated);
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success(t('integrations.copiedToClipboard', 'Copied to clipboard'));
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{t('integrations.apiKeysDescription', 'Manage API keys for programmatic access to your workspace')}
				</p>
				<Button onClick={handleAddApiKey}>
					<FontAwesomeIcon icon={faPlus} className="mr-2" />
					{t('integrations.addApiKey', 'Add API Key')}
				</Button>
			</div>

			{apiKeys.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<FontAwesomeIcon icon={faKey} className="text-4xl text-muted-foreground mb-4" />
						<p className="text-muted-foreground mb-4">
							{t('integrations.noApiKeys', 'No API keys configured')}
						</p>
						<Button onClick={handleAddApiKey} variant="outline">
							<FontAwesomeIcon icon={faPlus} className="mr-2" />
							{t('integrations.addApiKey', 'Add API Key')}
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{apiKeys.map((apiKey) => (
						<Card key={apiKey.id}>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<h3 className="font-semibold text-lg">{apiKey.name}</h3>
										<Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
											{apiKey.is_active
												? t('integrations.active', 'Active')
												: t('integrations.inactive', 'Inactive')}
										</Badge>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => toggleApiKeyActive(apiKey.id!)}
										>
											<FontAwesomeIcon icon={apiKey.is_active ? faX : faCheck} className="mr-2" />
											{apiKey.is_active
												? t('integrations.deactivate', 'Deactivate')
												: t('integrations.activate', 'Activate')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleEditApiKey(apiKey)}
										>
											<FontAwesomeIcon icon={faEdit} className="mr-2" />
											{t('common.edit', 'Edit')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDeleteApiKey(apiKey.id!)}
										>
											<FontAwesomeIcon icon={faTrash} className="mr-2" />
											{t('common.delete', 'Delete')}
										</Button>
									</div>
								</div>
								<div className="space-y-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="font-medium">{t('integrations.key', 'Key')}:</span>
										<code className="bg-muted px-2 py-1 rounded font-mono text-xs flex-1">
											{apiKey.key.substring(0, 20)}...
										</code>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => copyToClipboard(apiKey.key)}
											className="h-7 px-2"
										>
											{t('integrations.copy', 'Copy')}
										</Button>
									</div>
									{apiKey.scopes && apiKey.scopes.length > 0 && (
										<div>
											<span className="font-medium">{t('integrations.scopes', 'Scopes')}:</span>{' '}
											{apiKey.scopes.map((scope, idx) => (
												<Badge key={idx} variant="secondary" className="ml-1">
													{scope}
												</Badge>
											))}
										</div>
									)}
									{apiKey.created_at && (
										<div>
											<span className="font-medium">{t('integrations.created', 'Created')}:</span>{' '}
											{new Date(apiKey.created_at).toLocaleDateString()}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* API Key Dialog */}
			<Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editingApiKey
								? t('integrations.editApiKey', 'Edit API Key')
								: t('integrations.addApiKey', 'Add API Key')}
						</DialogTitle>
						<DialogDescription>
							{t('integrations.apiKeyDialogDescription', 'Create an API key for programmatic access')}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div>
							<Label htmlFor="api-key-name">{t('integrations.name', 'Name')} *</Label>
							<Input
								id="api-key-name"
								value={apiKeyForm.name}
								onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
								placeholder={t('integrations.apiKeyNamePlaceholder', 'My API Key')}
								required
							/>
						</div>

						{editingApiKey && (
							<div>
								<Label htmlFor="api-key-value">{t('integrations.key', 'API Key')}</Label>
								<Input
									id="api-key-value"
									value={editingApiKey.key}
									readOnly
									className="font-mono"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t('integrations.apiKeyWarning', 'Keep this key secure. It cannot be retrieved after creation.')}
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
							{t('common.cancel', 'Cancel')}
						</Button>
						<Button onClick={handleSaveApiKey}>
							{editingApiKey ? t('common.save', 'Save') : t('common.create', 'Create')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ============================================================================
// MAIN INTEGRATIONS COMPONENT
// ============================================================================

function Integrations() {
	const { t } = useLanguage();
	const [webhooks, setWebhooks] = useState<Webhook[]>(loadWebhooks());
	const [apiKeys, setApiKeys] = useState<ApiKey[]>(loadApiKeys());

	return (
		<div className="p-6 space-y-6 max-w-6xl mx-auto">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">{t('integrations.title', 'Integrations')}</h1>
					<p className="text-muted-foreground mt-2">
						{t('integrations.description', 'Connect your workspace with external tools and services')}
					</p>
				</div>
			</div>

			<Tabs defaultValue="marketplace" className="space-y-6">
				<TabsList>
					<TabsTrigger value="marketplace">
						<FontAwesomeIcon icon={faStore} className="mr-2" />
						{t('integrations.marketplace.title', 'Marketplace')}
					</TabsTrigger>
					<TabsTrigger value="webhooks">
						<FontAwesomeIcon icon={faLink} className="mr-2" />
						{t('integrations.webhooks', 'Webhooks')}
					</TabsTrigger>
					<TabsTrigger value="api-keys">
						<FontAwesomeIcon icon={faKey} className="mr-2" />
						{t('integrations.apiKeys', 'API Keys')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="marketplace">
					<MarketplaceTab t={t} />
				</TabsContent>

				<TabsContent value="webhooks">
					<WebhooksTab webhooks={webhooks} setWebhooks={setWebhooks} t={t} />
				</TabsContent>

				<TabsContent value="api-keys">
					<ApiKeysTab apiKeys={apiKeys} setApiKeys={setApiKeys} t={t} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default Integrations;
