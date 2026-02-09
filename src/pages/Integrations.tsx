import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faPlus, faCheck, faX, faSpinner, faCopy, faKey, faEye, faEyeSlash, faWarning } from '@fortawesome/free-solid-svg-icons';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import toast from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listApiKeys, createApiKey, updateApiKey, deleteApiKey, type ApiKey } from '@/api/apiKeyApi';
import { SettingsGrid } from '@/pages/settings/components/SettingsGrid';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import { Logger } from '@/utils/logger';

interface Webhook {
	id?: number;
	name: string;
	url: string;
	method: string;
	headers?: Record<string, string>;
	payload?: Record<string, unknown>;
	timeout?: number;
	is_active?: boolean;
	events?: string[];
	created_at?: string;
	updated_at?: string;
}

const INTEGRATIONS_STORAGE_KEY = 'wh-integrations-webhooks-v1';

// Load webhooks from localStorage (temporary until backend is ready)
const loadWebhooks = (): Webhook[] => {
	try {
		const raw = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
};

// Save webhooks to localStorage
const saveWebhooks = (webhooks: Webhook[]) => {
	try {
		localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(webhooks));
	} catch (error) {
		Logger.error('ui', 'Error saving webhooks:', error);
	}
};


function Integrations() {
	const { t } = useLanguage();
	
	// Webhook state (still using localStorage)
	const [webhooks, setWebhooks] = useState<Webhook[]>(loadWebhooks());
	const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
	const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
	const [testingWebhook, setTestingWebhook] = useState<number | null>(null);
	
	// API Key state (using backend API)
	const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
	const [apiKeysLoading, setApiKeysLoading] = useState(true);
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
	const [savingApiKey, setSavingApiKey] = useState(false);
	const [deletingApiKeyId, setDeletingApiKeyId] = useState<number | null>(null);
	
	// Newly created key (to show the plain text key once)
	const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
	const [showNewKey, setShowNewKey] = useState(true);

	// Webhook form state
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

	// API Key form state
	const [apiKeyForm, setApiKeyForm] = useState<{
		name: string;
		expiration_option: string;
	}>({
		name: '',
		expiration_option: 'never',
	});

	// Convert expiration option to ISO date string
	const getExpirationDate = (option: string): string | null => {
		if (option === 'never') return null;
		
		const now = new Date();
		switch (option) {
			case '1h':
				return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
			case '1d':
				return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
			case '7d':
				return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
			case '30d':
				return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
			case '90d':
				return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
			case '180d':
				return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
			case '1y':
				return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
			default:
				return null;
		}
	};

	// Fetch API keys from backend
	const fetchApiKeys = useCallback(async () => {
		Logger.info('api', 'Fetching API keys...');
		try {
			setApiKeysLoading(true);
			const keys = await listApiKeys();
			Logger.info('api', 'Fetched API keys', { count: keys.length });
			setApiKeys(keys);
		} catch (error) {
			Logger.error('api', 'Error fetching API keys:', error);
			toast.error(t('integrations.errors.loadApiKeys', 'Error loading API keys'));
		} finally {
			setApiKeysLoading(false);
		}
	}, [t]);

	// Load API keys on mount
	useEffect(() => {
		fetchApiKeys();
	}, [fetchApiKeys]);

	// API Key Grid Column Definitions
	const apiKeyColumnDefs = useMemo<ColDef<ApiKey>[]>(() => [
		{
			field: 'name',
			headerName: t('integrations.name', 'Name'),
			flex: 2,
			minWidth: 150,
		},
		{
			field: 'key_hint',
			headerName: t('integrations.key', 'Key'),
			width: 110,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				if (!params.value) return <span className="text-muted-foreground">-</span>;
				return (
					<code className="text-xs bg-muted px-2 py-1 rounded font-mono">
						...{params.value}
					</code>
				);
			},
		},
		{
			field: 'created_at',
			headerName: t('integrations.created', 'Created'),
			width: 100,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				if (!params.value) return null;
				return new Date(params.value).toLocaleDateString();
			},
		},
		{
			field: 'expires_at',
			headerName: t('integrations.expires', 'Expires'),
			width: 100,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				if (!params.value) return <span className="text-muted-foreground">{t('integrations.never', 'Never')}</span>;
				const date = new Date(params.value);
				const isExpired = date < new Date();
				return (
					<span className={isExpired ? 'text-destructive' : ''}>
						{date.toLocaleDateString()}
					</span>
				);
			},
		},
		{
			field: 'last_used_at',
			headerName: t('integrations.lastUsed', 'Last Used'),
			width: 100,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				if (!params.value) return <span className="text-muted-foreground">{t('integrations.never', 'Never')}</span>;
				return new Date(params.value).toLocaleDateString();
			},
		},
		{
			field: 'is_active',
			headerName: t('integrations.enabled', 'Enabled'),
			width: 90,
			sortable: false,
			filter: false,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				const apiKey = params.data;
				if (!apiKey) return null;
				return (
					<Switch
						checked={apiKey.is_active}
						onCheckedChange={() => handleToggleApiKey(apiKey)}
						data-cy={`toggle-key-${apiKey.id}`}
					/>
				);
			},
		},
		{
			headerName: '',
			width: 60,
			sortable: false,
			filter: false,
			cellRenderer: (params: ICellRendererParams<ApiKey>) => {
				const apiKey = params.data;
				if (!apiKey) return null;
				return (
					<Button
						variant="destructive"
						size="icon"
						onClick={() => setDeletingApiKeyId(apiKey.id)}
						className="h-7 w-7"
						data-cy={`delete-key-${apiKey.id}`}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				);
			},
		},
	], [t]);

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
				// Update existing webhook
				const updated = webhooks.map(w =>
					w.id === editingWebhook.id
						? { ...webhookForm, id: editingWebhook.id, updated_at: new Date().toISOString() }
						: w
				);
				setWebhooks(updated);
				saveWebhooks(updated);
				toast.success(t('integrations.webhookUpdated', 'Webhook updated successfully'));
			} else {
				// Create new webhook
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
		} catch {
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
			// TODO: Replace with actual API call when backend is ready
			await new Promise(resolve => setTimeout(resolve, 1000));
			toast.success(t('integrations.webhookTestSuccess', 'Webhook test sent successfully'));
		} catch {
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

	// API Key handlers
	const handleAddApiKey = () => {
		Logger.info('ui', 'Opening create API key dialog');
		setNewlyCreatedKey(null);
		setShowNewKey(true);
		setApiKeyForm({
			name: '',
			expiration_option: 'never',
		});
		setIsApiKeyDialogOpen(true);
	};

	const handleSaveApiKey = async () => {
		if (!apiKeyForm.name.trim()) {
			toast.error(t('integrations.errors.fillRequiredFields', 'Please fill in all required fields'));
			return;
		}

		setSavingApiKey(true);
		try {
			const expiresAt = getExpirationDate(apiKeyForm.expiration_option);
			Logger.info('api', 'Creating API key', { name: apiKeyForm.name, expiration: apiKeyForm.expiration_option });
			const newKey = await createApiKey({
				name: apiKeyForm.name,
				expires_at: expiresAt,
			});
			Logger.info('api', 'API key created successfully', { id: newKey.id, name: newKey.name, hasKey: !!newKey.key });
			
			if (newKey.key) {
				setNewlyCreatedKey(newKey.key);
			} else {
				Logger.warn('api', 'API key created but no plaintext key returned');
				setIsApiKeyDialogOpen(false);
			}
			toast.success(t('integrations.apiKeyCreated', 'API key created successfully'));
			await fetchApiKeys();
		} catch (error) {
			Logger.error('api', 'Error saving API key:', error);
			toast.error(t('integrations.errors.saveError', 'Error saving API key'));
		} finally {
			setSavingApiKey(false);
		}
	};

	const handleConfirmDeleteApiKey = async () => {
		if (!deletingApiKeyId) return;
		
		Logger.info('api', 'Deleting API key', { id: deletingApiKeyId });
		try {
			await deleteApiKey(deletingApiKeyId);
			Logger.info('api', 'API key deleted successfully', { id: deletingApiKeyId });
			toast.success(t('integrations.apiKeyDeleted', 'API key deleted successfully'));
			await fetchApiKeys();
		} catch (error) {
			Logger.error('api', 'Error deleting API key:', error);
			toast.error(t('integrations.errors.deleteError', 'Error deleting API key'));
		} finally {
			setDeletingApiKeyId(null);
		}
	};

	const handleToggleApiKey = async (apiKey: ApiKey) => {
		Logger.info('api', 'Toggling API key status', { id: apiKey.id, currentStatus: apiKey.is_active });
		try {
			await updateApiKey(apiKey.id, { is_active: !apiKey.is_active });
			toast.success(
				apiKey.is_active
					? t('integrations.apiKeyDisabled', 'API key disabled')
					: t('integrations.apiKeyEnabled', 'API key enabled')
			);
			await fetchApiKeys();
		} catch (error) {
			Logger.error('api', 'Error toggling API key:', error);
			toast.error(t('integrations.errors.toggleError', 'Error updating API key'));
		}
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(t('integrations.copiedToClipboard', 'Copied to clipboard'));
		} catch {
			toast.error(t('integrations.errors.copyError', 'Failed to copy'));
		}
	};

	const handleCloseApiKeyDialog = () => {
		setIsApiKeyDialogOpen(false);
		setNewlyCreatedKey(null);
	};

	return (
		<div className="p-6 space-y-6" data-cy="integrations-page">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">{t('integrations.title', 'Integrations')}</h1>
					<p className="text-muted-foreground mt-2">
						{t('integrations.description', 'Manage webhooks, API keys, and external integrations')}
					</p>
				</div>
			</div>

			<Tabs defaultValue="api-keys" className="space-y-4">
				<TabsList>
					<TabsTrigger value="api-keys" data-cy="api-keys-tab">
						<FontAwesomeIcon icon={faKey} className="mr-2" />
						{t('integrations.apiKeys', 'API Keys')}
					</TabsTrigger>
					<TabsTrigger value="webhooks" data-cy="webhooks-tab">
						<FontAwesomeIcon icon={faLink} className="mr-2" />
						{t('integrations.webhooks', 'Webhooks')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="api-keys" className="space-y-4" data-cy="api-keys-content">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							{t('integrations.apiKeysDescription', 'Create long-lived API keys for programmatic access to your account')}
						</p>
						<Button onClick={handleAddApiKey} data-cy="add-api-key-btn">
							<FontAwesomeIcon icon={faPlus} className="mr-2" />
							{t('integrations.addApiKey', 'Add API Key')}
						</Button>
					</div>

					{apiKeysLoading ? (
						<Card data-cy="api-keys-loading">
							<CardContent className="flex items-center justify-center py-12">
								<FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-muted-foreground" />
							</CardContent>
						</Card>
					) : apiKeys.length === 0 ? (
						<Card data-cy="api-keys-empty">
							<CardContent className="flex flex-col items-center justify-center py-12">
								<FontAwesomeIcon icon={faKey} className="text-4xl text-muted-foreground mb-4" />
								<p className="text-muted-foreground mb-4">
									{t('integrations.noApiKeys', 'No API keys configured')}
								</p>
								<Button onClick={handleAddApiKey} variant="outline" data-cy="add-api-key-empty-btn">
									<FontAwesomeIcon icon={faPlus} className="mr-2" />
									{t('integrations.addApiKey', 'Add API Key')}
								</Button>
							</CardContent>
						</Card>
					) : (
						<div data-cy="api-keys-grid">
							<SettingsGrid
								rowData={apiKeys}
								columnDefs={apiKeyColumnDefs}
								height="400px"
								getRowId={(params) => String(params.data.id)}
								noRowsMessage={t('integrations.noApiKeys', 'No API keys configured')}
							/>
						</div>
					)}
				</TabsContent>

				<TabsContent value="webhooks" className="space-y-4">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							{t('integrations.webhooksDescription', 'Configure webhooks to receive real-time notifications from external systems')}
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
									<CardHeader>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<CardTitle className="text-base">{webhook.name}</CardTitle>
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
									</CardHeader>
									<CardContent>
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
				</TabsContent>
			</Tabs>

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
							{t('integrations.webhookDialogDescription', 'Configure webhook settings to receive notifications')}
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
									} catch {
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
									} catch {
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

			{/* API Key Dialog (Create Only) */}
			<Dialog open={isApiKeyDialogOpen} onOpenChange={handleCloseApiKeyDialog}>
				<DialogContent className="max-w-md" data-cy="api-key-dialog">
					<DialogHeader>
						<DialogTitle>
							{newlyCreatedKey
								? t('integrations.apiKeyCreatedTitle', 'API Key Created')
								: t('integrations.addApiKey', 'Create API Key')}
						</DialogTitle>
						<DialogDescription>
							{newlyCreatedKey
								? t('integrations.apiKeyCreatedDescription', 'Make sure to copy your API key now. You will not be able to see it again!')
								: t('integrations.apiKeyDialogDescription', 'Create an API key for programmatic access to your account')}
						</DialogDescription>
					</DialogHeader>

					{newlyCreatedKey ? (
						<div className="space-y-4 py-4" data-cy="api-key-created-view">
							<div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
								<FontAwesomeIcon icon={faWarning} className="text-yellow-500 mt-0.5" />
								<p className="text-sm">
									{t('integrations.apiKeyWarningOnce', 'This is the only time you will see this key. Please copy it and store it securely.')}
								</p>
							</div>
							
							<div className="space-y-2">
								<Label>{t('integrations.yourApiKey', 'Your API Key')}</Label>
								<div className="flex items-center gap-2">
									<div className="flex-1 relative">
										<Input
											value={showNewKey ? newlyCreatedKey : '********************************'}
											readOnly
											className="font-mono pr-10"
											data-cy="api-key-value-input"
										/>
										<Button
											variant="ghost"
											size="sm"
											className="absolute right-1 top-1/2 -translate-y-1/2"
											onClick={() => setShowNewKey(!showNewKey)}
											data-cy="toggle-key-visibility-btn"
										>
											<FontAwesomeIcon icon={showNewKey ? faEyeSlash : faEye} />
										</Button>
									</div>
									<Button
										variant="outline"
										size="icon"
										onClick={() => copyToClipboard(newlyCreatedKey)}
										data-cy="copy-api-key-btn"
									>
										<FontAwesomeIcon icon={faCopy} />
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-4 py-4" data-cy="api-key-form">
							<div>
								<Label htmlFor="api-key-name">{t('integrations.name', 'Name')} *</Label>
								<Input
									id="api-key-name"
									value={apiKeyForm.name}
									onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
									placeholder={t('integrations.apiKeyNamePlaceholder', 'My Integration Key')}
									required
									disabled={savingApiKey}
									data-cy="api-key-name-input"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{t('integrations.apiKeyNameHint', 'Give your key a descriptive name to identify its purpose')}
								</p>
							</div>

							<div>
								<Label htmlFor="api-key-expires">{t('integrations.expiration', 'Expiration')}</Label>
								<Select
									value={apiKeyForm.expiration_option}
									onValueChange={(value) => setApiKeyForm({ ...apiKeyForm, expiration_option: value })}
									disabled={savingApiKey}
								>
									<SelectTrigger data-cy="api-key-expiration-select">
										<SelectValue placeholder={t('integrations.selectExpiration', 'Select expiration')} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="never" data-cy="expiration-never">{t('integrations.expirationNever', 'Never expires')}</SelectItem>
										<SelectItem value="1h" data-cy="expiration-1h">{t('integrations.expiration1h', '1 hour')}</SelectItem>
										<SelectItem value="1d" data-cy="expiration-1d">{t('integrations.expiration1d', '1 day')}</SelectItem>
										<SelectItem value="7d" data-cy="expiration-7d">{t('integrations.expiration7d', '7 days')}</SelectItem>
										<SelectItem value="30d" data-cy="expiration-30d">{t('integrations.expiration30d', '30 days')}</SelectItem>
										<SelectItem value="90d" data-cy="expiration-90d">{t('integrations.expiration90d', '90 days')}</SelectItem>
										<SelectItem value="180d" data-cy="expiration-180d">{t('integrations.expiration180d', '180 days')}</SelectItem>
										<SelectItem value="1y" data-cy="expiration-1y">{t('integrations.expiration1y', '1 year')}</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					)}

					<DialogFooter>
						{newlyCreatedKey ? (
							<Button onClick={handleCloseApiKeyDialog} data-cy="api-key-done-btn">
								{t('common.done', 'Done')}
							</Button>
						) : (
							<>
								<Button variant="outline" onClick={handleCloseApiKeyDialog} disabled={savingApiKey} data-cy="api-key-cancel-btn">
									{t('common.cancel', 'Cancel')}
								</Button>
								<Button onClick={handleSaveApiKey} disabled={savingApiKey} data-cy="api-key-submit-btn">
									{savingApiKey && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
									{t('common.create', 'Create')}
								</Button>
							</>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete API Key Confirmation */}
			<AlertDialog open={!!deletingApiKeyId} onOpenChange={(open) => !open && setDeletingApiKeyId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('integrations.deleteApiKey', 'Delete API Key')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('integrations.confirmDeleteApiKey', 'Are you sure you want to delete this API key? This action cannot be undone.')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDeleteApiKey}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{t('common.delete', 'Delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export default Integrations;
