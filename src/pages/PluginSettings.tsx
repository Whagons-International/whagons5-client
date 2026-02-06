import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getPluginsConfig, togglePluginEnabled, togglePluginPinned, subscribeToPluginsConfig, type PluginConfig } from '@/components/AppSidebar';
import { Pin, PinOff, Save, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar } from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { genericActions, genericInternalActions } from '@/store/genericSlices';
import { actionsApi } from '@/api/whagonsActionsApi';
import { MultiSelect } from '@/components/ui/multi-select';
import { SelectField } from '@/pages/settings/components';
import type { Status, CleaningStatus } from '@/store/types';
import toast from 'react-hot-toast';

interface PluginDetails {
	features: string[];
	benefits: string[];
}

function PluginSettings() {
	const { pluginId } = useParams<{ pluginId: string }>();
	const { t } = useLanguage();
	const dispatch = useDispatch();
	const [searchParams, setSearchParams] = useSearchParams();
	const [pluginsConfig, setPluginsConfigState] = useState<PluginConfig[]>(getPluginsConfig());
	const [selectedSpotTypeIds, setSelectedSpotTypeIds] = useState<string[]>([]);
	const [savedSpotTypeIds, setSavedSpotTypeIds] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	// Change to array of objects: [{status_id: number, cleaning_status_id: number}, ...]
	const [statusToCleaningStatusMap, setStatusToCleaningStatusMap] = useState<Array<{status_id: number, cleaning_status_id: number}>>([]);
	const [savedStatusToCleaningStatusMap, setSavedStatusToCleaningStatusMap] = useState<Array<{status_id: number, cleaning_status_id: number}>>([]);
	const [savingStatusMapping, setSavingStatusMapping] = useState(false);
	const [isAddingMapping, setIsAddingMapping] = useState(false);
	const [newMappingStatusId, setNewMappingStatusId] = useState<string>('');
	const [newMappingCleaningStatusId, setNewMappingCleaningStatusId] = useState<string>('');
	
	// Default to 'settings' tab
	const activeTab = searchParams.get('tab') || 'settings';

	// Get plugin from Redux store
	const plugins = useSelector((state: RootState) => {
		try {
			return (state as any).plugins?.value || [];
		} catch (error) {
			console.error('Error accessing plugins from Redux:', error);
			return [];
		}
	});
	const backendPlugin = pluginId ? plugins.find((p: any) => {
		// First try to match by slug, then by id
		if (p.slug === pluginId) return true;
		if (String(p.id) === String(pluginId)) return true;
		return false;
	}) : undefined;
	
	// Ensure we have a valid slug for API calls
	// If pluginId is numeric, it's likely an ID, so use the plugin's slug
	// Otherwise, use pluginId as slug (it should be 'cleaning', 'broadcasts', etc.)
	const effectivePluginSlug = backendPlugin?.slug || (isNaN(Number(pluginId)) ? pluginId : 'cleaning') || 'cleaning';

	// Get spotTypes from Redux
	const spotTypes = useSelector((state: RootState) => {
		try {
			return (state as any).spotTypes?.value || [];
		} catch (error) {
			console.error('Error accessing spotTypes from Redux:', error);
			return [];
		}
	});

	// Get statuses and cleaningStatuses from Redux
	const statuses = useSelector((state: RootState) => {
		try {
			return (state as any).statuses?.value || [];
		} catch (error) {
			console.error('Error accessing statuses from Redux:', error);
			return [];
		}
	}) as Status[];

	const cleaningStatuses = useSelector((state: RootState) => {
		try {
			// Access the cleaningStatuses slice from the state
			const slice = (state as any).cleaningStatuses;
			if (!slice) {
				console.warn('cleaningStatuses slice not found in Redux state');
				return [];
			}
			const value = Array.isArray(slice.value) ? slice.value : [];
			return value;
		} catch (error) {
			console.error('Error accessing cleaningStatuses from Redux:', error);
			return [];
		}
	}) as CleaningStatus[];

	useEffect(() => {
		const unsubscribe = subscribeToPluginsConfig(setPluginsConfigState);
		return unsubscribe;
	}, []);

	// Load spotTypes, statuses and cleaningStatuses on mount
	useEffect(() => {
		if (pluginId === 'cleaning') {
			try {
				// Load spotTypes
				if (genericInternalActions?.spotTypes?.getFromIndexedDB) {
					dispatch(genericInternalActions.spotTypes.getFromIndexedDB() as any);
				}
				if (genericInternalActions?.spotTypes?.fetchFromAPI) {
					dispatch(genericInternalActions.spotTypes.fetchFromAPI() as any);
				}
				// Load statuses
				if (genericInternalActions?.statuses?.getFromIndexedDB) {
					dispatch(genericInternalActions.statuses.getFromIndexedDB() as any);
				}
				if (genericInternalActions?.statuses?.fetchFromAPI) {
					dispatch(genericInternalActions.statuses.fetchFromAPI() as any);
				}
				// Load cleaningStatuses
				if (genericInternalActions?.cleaningStatuses?.getFromIndexedDB) {
					dispatch(genericInternalActions.cleaningStatuses.getFromIndexedDB() as any);
				}
				if (genericInternalActions?.cleaningStatuses?.fetchFromAPI) {
					dispatch(genericInternalActions.cleaningStatuses.fetchFromAPI() as any);
				}
			} catch (error) {
				console.error('Error loading data:', error);
			}
		}
	}, [pluginId, dispatch]);

	// Parse existing settings from plugin
	useEffect(() => {
		if (backendPlugin && pluginId === 'cleaning') {
			try {
				let settings = {};
				if (backendPlugin.settings) {
					if (typeof backendPlugin.settings === 'string') {
						try {
							settings = JSON.parse(backendPlugin.settings);
						} catch (e) {
							console.error('Error parsing settings JSON:', e);
							settings = {};
						}
					} else if (typeof backendPlugin.settings === 'object') {
						settings = backendPlugin.settings;
					}
				}
				
				const spotTypeIds = (settings as any).spot_type_ids || [];
				const spotTypeIdsString = spotTypeIds.map((id: number) => String(id));
				setSelectedSpotTypeIds(spotTypeIdsString);
				setSavedSpotTypeIds(spotTypeIdsString);

				// Parse status to cleaning status mapping - now expects array of objects
				const statusMapping = (settings as any).status_to_cleaning_status || [];
				
				// Handle migration from old format (object) to new format (array of objects)
				let mappingsArray: Array<{status_id: number, cleaning_status_id: number}> = [];
				
				if (Array.isArray(statusMapping)) {
					// New format: array of objects
					mappingsArray = statusMapping.map((item: any) => ({
						status_id: typeof item.status_id === 'string' ? parseInt(item.status_id, 10) : item.status_id,
						cleaning_status_id: typeof item.cleaning_status_id === 'string' ? parseInt(item.cleaning_status_id, 10) : item.cleaning_status_id
					})).filter((item: any) => !isNaN(item.status_id) && !isNaN(item.cleaning_status_id));
				} else if (statusMapping && typeof statusMapping === 'object' && !Array.isArray(statusMapping)) {
					// Old format: object like {"2": 2, "4": 3} - migrate to new format
					mappingsArray = Object.entries(statusMapping).map(([statusId, cleaningStatusId]) => ({
						status_id: parseInt(String(statusId), 10),
						cleaning_status_id: typeof cleaningStatusId === 'string' ? parseInt(cleaningStatusId, 10) : cleaningStatusId
					})).filter(item => !isNaN(item.status_id) && !isNaN(item.cleaning_status_id));
				}
				
				setStatusToCleaningStatusMap(mappingsArray);
				setSavedStatusToCleaningStatusMap(mappingsArray);
			} catch (error) {
				console.error('Error parsing plugin settings:', error);
				setSelectedSpotTypeIds([]);
				setStatusToCleaningStatusMap([]);
				setSavedStatusToCleaningStatusMap([]);
			}
		} else if (pluginId === 'cleaning' && !backendPlugin) {
			// Reset if plugin not found
			setSelectedSpotTypeIds([]);
			setStatusToCleaningStatusMap([]);
		}
	}, [backendPlugin, pluginId]);

	const currentPlugin = pluginId ? pluginsConfig.find(p => p.id === pluginId) : undefined;

	// Handle spot types selection change (only updates local state)
	const handleSpotTypesChange = (values: string[]) => {
		setSelectedSpotTypeIds(values);
	};

	// Handle saving spot_type_ids
	const handleSaveSpotTypes = async () => {
		if (!backendPlugin) {
			console.error('Backend plugin not found');
			toast.error(t('plugins.cleaning.spotTypesError', 'Failed to save spot types'));
			return;
		}

		setSaving(true);
		
		try {
			const spotTypeIds = selectedSpotTypeIds.map(v => parseInt(v));
			let currentSettings = {};
			
			if (backendPlugin.settings) {
				if (typeof backendPlugin.settings === 'string') {
					try {
						currentSettings = JSON.parse(backendPlugin.settings);
					} catch (e) {
						console.error('Error parsing settings JSON:', e);
						currentSettings = {};
					}
				} else if (typeof backendPlugin.settings === 'object') {
					currentSettings = backendPlugin.settings;
				}
			}
			
			const updatedSettings = {
				...currentSettings,
				spot_type_ids: spotTypeIds
			};

			// Use slug instead of id, and send settings as object (backend will handle it)
			// Ensure we use the slug, not the ID
			const pluginSlug = effectivePluginSlug;
			const response = await actionsApi.patch(`/plugins/${pluginSlug}/settings`, {
				settings: updatedSettings
			});

			// Update Redux store with the response data
			// Use updateItem directly instead of updateAsync to avoid extra API call
			const savedPlugin = response?.data?.data;
			if (savedPlugin) {
				dispatch(genericActions.plugins.updateItem(savedPlugin));
			}

			setSavedSpotTypeIds([...selectedSpotTypeIds]);
			toast.success(t('plugins.cleaning.spotTypesSaved', 'Spot types saved successfully'));
		} catch (error: any) {
			console.error('Error saving spot types:', error);
			const errorMessage = error?.response?.data?.message || error?.message || t('plugins.cleaning.spotTypesError', 'Failed to save spot types');
			toast.error(errorMessage);
			// Revert to saved selection
			setSelectedSpotTypeIds([...savedSpotTypeIds]);
		} finally {
			setSaving(false);
		}
	};

	// Handle saving status to cleaning status mapping
	const handleSaveStatusMapping = async () => {
		if (!backendPlugin) {
			console.error('Backend plugin not found');
			toast.error(t('plugins.cleaning.statusMappingError', 'Failed to save status mapping'));
			return;
		}

		setSavingStatusMapping(true);
		
		try {
			// Convert to array of objects format
			// Ensure statusToCleaningStatusMap is always an array
			const currentMapping = Array.isArray(statusToCleaningStatusMap) ? statusToCleaningStatusMap : [];
			const statusMappingArray = currentMapping.map(item => ({
				status_id: typeof item.status_id === 'string' ? parseInt(item.status_id, 10) : item.status_id,
				cleaning_status_id: typeof item.cleaning_status_id === 'string' ? parseInt(item.cleaning_status_id, 10) : item.cleaning_status_id
			})).filter(item => !isNaN(item.status_id) && !isNaN(item.cleaning_status_id));

			let currentSettings: any = {};
			
			if (backendPlugin.settings) {
				if (typeof backendPlugin.settings === 'string') {
					try {
						currentSettings = JSON.parse(backendPlugin.settings);
					} catch (e) {
						console.error('Error parsing settings JSON:', e);
						currentSettings = {};
					}
				} else if (typeof backendPlugin.settings === 'object') {
					currentSettings = { ...backendPlugin.settings };
				}
			}
			
			// Set status_to_cleaning_status as array of objects
			const updatedSettings = {
				...currentSettings,
				status_to_cleaning_status: statusMappingArray
			};

			// Use slug instead of id, and send settings as object (backend will handle it)
			// Ensure we use the slug, not the ID
			const pluginSlug = effectivePluginSlug;
			
			// Create payload with array of objects format
			const payloadSettings = {
				...updatedSettings,
				status_to_cleaning_status: statusMappingArray
			};
			
			const response = await actionsApi.patch(`/plugins/${pluginSlug}/settings`, {
				settings: payloadSettings
			});

			// Update Redux store with the response data
			// Use updateItem directly instead of updateAsync to avoid extra API call
			const savedPlugin = response?.data?.data;
			if (savedPlugin) {
				dispatch(genericActions.plugins.updateItem(savedPlugin));
			}

			// Parse the saved settings to update local state
			const savedSettings = savedPlugin?.settings || updatedSettings;
			const savedStatusMapping = savedSettings?.status_to_cleaning_status || [];
			const savedMappingsArray = Array.isArray(savedStatusMapping) 
				? savedStatusMapping.map((item: any) => ({
					status_id: typeof item.status_id === 'string' ? parseInt(item.status_id, 10) : item.status_id,
					cleaning_status_id: typeof item.cleaning_status_id === 'string' ? parseInt(item.cleaning_status_id, 10) : item.cleaning_status_id
				})).filter((item: any) => !isNaN(item.status_id) && !isNaN(item.cleaning_status_id))
				: [];
			
			// Update saved mapping state
			setStatusToCleaningStatusMap(savedMappingsArray);
			setSavedStatusToCleaningStatusMap(savedMappingsArray);

			toast.success(t('plugins.cleaning.statusMappingSaved', 'Status mapping saved successfully'));
		} catch (error: any) {
			console.error('Error saving status mapping:', error);
			const errorMessage = error?.response?.data?.message || error?.message || t('plugins.cleaning.statusMappingError', 'Failed to save status mapping');
			toast.error(errorMessage);
			// Revert to saved mapping
			setStatusToCleaningStatusMap([...savedStatusToCleaningStatusMap]);
		} finally {
			setSavingStatusMapping(false);
		}
	};

	// Handle adding new mapping
	const handleAddMapping = () => {
		if (newMappingStatusId && newMappingCleaningStatusId) {
			const newMapping = {
				status_id: parseInt(newMappingStatusId, 10),
				cleaning_status_id: parseInt(newMappingCleaningStatusId, 10)
			};
			setStatusToCleaningStatusMap(prev => {
				const current = Array.isArray(prev) ? prev : [];
				return [...current, newMapping];
			});
			setNewMappingStatusId('');
			setNewMappingCleaningStatusId('');
			setIsAddingMapping(false);
		}
	};

	// Handle removing mapping
	const handleRemoveMapping = (statusId: number) => {
		setStatusToCleaningStatusMap(prev => {
			const current = Array.isArray(prev) ? prev : [];
			return current.filter(mapping => mapping.status_id !== statusId);
		});
	};

	// Get available statuses (not already mapped)
	// Ensure statusToCleaningStatusMap is always an array
	const statusMappingArray = Array.isArray(statusToCleaningStatusMap) ? statusToCleaningStatusMap : [];
	const availableStatuses = statuses.filter(status => 
		!statusMappingArray.some(mapping => mapping.status_id === status.id)
	);

	// Check if there are unsaved changes
	const hasUnsavedChanges = JSON.stringify(selectedSpotTypeIds.sort()) !== JSON.stringify(savedSpotTypeIds.sort());
	const savedMappingArray = Array.isArray(savedStatusToCleaningStatusMap) ? savedStatusToCleaningStatusMap : [];
	const hasUnsavedStatusMappingChanges = JSON.stringify(statusMappingArray.sort((a, b) => a.status_id - b.status_id)) !== JSON.stringify(savedMappingArray.sort((a, b) => a.status_id - b.status_id));

	// Plugin details for summary tab
	const getPluginDetails = (pluginId: string): PluginDetails => {
		const detailsMap: Record<string, PluginDetails> = {
			broadcasts: {
				features: [
					'Send messages to multiple recipients (manual, role-based, or team-based)',
					'Track acknowledgments in real-time with progress bars',
					'Set priority levels (Low, Normal, High, Urgent)',
					'Automated reminders for pending acknowledgments',
					'Detailed reporting on who acknowledged and when'
				],
				benefits: [
					'Ensure important messages reach everyone',
					'Track compliance with communication requirements',
					'Save time with automated acknowledgment tracking',
					'Get real-time visibility into message status'
				]
			},
			cleaning: {
				features: [
					'Automated cleaning schedules and task assignments',
					'Quality inspection checklists with photo documentation',
					'Real-time staff location tracking and route optimization',
					'Inventory management for cleaning supplies',
					'Performance analytics and reporting dashboards'
				],
				benefits: [
					'Reduce cleaning time by up to 30% with optimized workflows',
					'Ensure consistent quality with standardized checklists',
					'Track supply costs and reduce waste',
					'Generate compliance reports automatically'
				]
			},
			assets: {
				features: [
					'Comprehensive asset tracking with QR/barcode scanning',
					'Maintenance scheduling and preventive care alerts',
					'Asset lifecycle management and depreciation tracking',
					'Inspection workflows with photo documentation',
					'Mobile app for field technicians'
				],
				benefits: [
					'Extend asset lifespan with proactive maintenance',
					'Reduce downtime with predictive maintenance alerts',
					'Track asset ROI and optimize capital expenditures',
					'Ensure compliance with safety inspections'
				]
			},
			boards: {
				features: [
					'Team collaboration boards and messaging',
					'Directory integration with user profiles',
					'Real-time notifications and updates',
					'File sharing and document collaboration',
					'Team activity feeds and engagement tracking'
				],
				benefits: [
					'Improve team communication and collaboration',
					'Reduce email clutter with centralized messaging',
					'Keep everyone informed with real-time updates',
					'Foster team engagement and culture'
				]
			},
			analytics: {
				features: [
					'Customizable dashboards with real-time data visualization',
					'Automated report generation and scheduling',
					'Predictive analytics and trend forecasting',
					'Cross-module data integration',
					'Export to Excel, PDF, and custom formats'
				],
				benefits: [
					'Make data-driven decisions with actionable insights',
					'Identify cost-saving opportunities automatically',
					'Monitor KPIs in real-time across all departments',
					'Forecast future needs with AI-powered predictions'
				]
			},
			clockin: {
				features: [
					'Mobile time tracking with GPS verification',
					'Shift scheduling with conflict detection',
					'Overtime and break compliance monitoring',
					'Integration with payroll systems',
					'Attendance insights and reporting'
				],
				benefits: [
					'Eliminate time theft with GPS-verified clock-ins',
					'Reduce scheduling conflicts by 90%',
					'Ensure labor law compliance automatically',
					'Streamline payroll processing with accurate time data'
				]
			},
			costs: {
				features: [
					'Multi-level budget planning and tracking',
					'Purchase order management and approval workflows',
					'Vendor management and invoice processing',
					'Cost allocation across departments and projects',
					'Real-time budget variance alerts'
				],
				benefits: [
					'Reduce operational costs by up to 20%',
					'Prevent budget overruns with automated alerts',
					'Optimize vendor relationships with performance tracking',
					'Simplify financial reporting and audits'
				]
			},
			inventory: {
				features: [
					'Real-time stock level monitoring with auto-reorder',
					'Barcode/QR scanning for quick data entry',
					'Multi-location warehouse management',
					'Supplier management and order tracking',
					'Inventory valuation and FIFO/LIFO tracking'
				],
				benefits: [
					'Never run out of critical supplies with auto-reorder',
					'Reduce inventory costs by 25% with optimization',
					'Minimize waste with expiration date tracking',
					'Speed up stocktakes from days to hours'
				]
			},
			compliance: {
				features: [
					'Document management with version control',
					'Automated compliance checklist workflows',
					'Audit trail and reporting',
					'Certification and license tracking',
					'Training and qualification management'
				],
				benefits: [
					'Pass audits with confidence using automated documentation',
					'Track certifications and prevent lapses',
					'Reduce compliance risks with proactive alerts',
					'Generate audit-ready reports in minutes'
				]
			},
			tools: {
				features: [
					'Digital tool checkout and return system',
					'QR code scanning for quick lending',
					'Automatic return reminders and notifications',
					'Tool condition tracking and maintenance history',
					'Employee borrowing history and accountability'
				],
				benefits: [
					'Eliminate lost tools with digital tracking',
					'Reduce tool replacement costs by up to 40%',
					'Know who has what equipment at any time',
					'Ensure tools are maintained and returned on time'
				]
			},
		};

		return detailsMap[pluginId] || { features: [], benefits: [] };
	};

	const pluginDetails = pluginId ? getPluginDetails(pluginId) : { features: [], benefits: [] };

	const handleToggleEnabled = () => {
		if (pluginId) {
			togglePluginEnabled(pluginId);
		}
	};

	const handleTogglePinned = () => {
		if (pluginId) {
			togglePluginPinned(pluginId);
		}
	};

	const setTab = (tab: string) => {
		setSearchParams({ tab });
	};

	if (!currentPlugin) {
		return (
			<div className="p-6">
				<Card>
					<CardHeader>
						<CardTitle>{t('plugins.notFound', 'Plugin not found')}</CardTitle>
						<CardDescription>
							{t('plugins.notFoundDescription', 'The requested plugin could not be found')}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const Icon = currentPlugin.icon;

	// Get translated plugin name
	const getPluginName = (pluginId: string | undefined) => {
		if (!pluginId || !currentPlugin) return 'Plugin';
		return t(`plugins.${pluginId}.title`, currentPlugin.name);
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center gap-4">
				<div 
					className="grid place-items-center rounded-lg flex-shrink-0"
					style={{
						backgroundColor: currentPlugin.iconColor || '#6b7280',
						width: '48px',
						height: '48px',
					}}
				>
					<Icon size={24} className="text-white" />
				</div>
				<div>
					<h1 className="text-3xl font-bold">{getPluginName(currentPlugin.id)}</h1>
					<p className="text-muted-foreground">
						{activeTab === 'summary' ? t('plugins.summary', 'Overview') : t('plugins.settings', 'Settings')}
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-border">
				<div className="flex gap-6">
					<button
						onClick={() => setTab('settings')}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === 'settings'
								? 'border-primary text-primary font-medium'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						{t('plugins.settings', 'Settings')}
					</button>
					<button
						onClick={() => setTab('summary')}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === 'summary'
								? 'border-primary text-primary font-medium'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						{t('plugins.summary', 'Summary')}
					</button>
				</div>
			</div>

			{/* Tab Content */}
			{activeTab === 'settings' && (
				<div className="grid gap-6 max-w-2xl">
				<Card>
					<CardHeader>
						<CardTitle>{t('plugins.visibility', 'Visibility')}</CardTitle>
						<CardDescription>
							{t('plugins.visibilityDescription', 'Control how this plugin appears in your sidebar')}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<div className="font-medium">{t('plugins.enabled', 'Enabled')}</div>
								<div className="text-sm text-muted-foreground">
									{t('plugins.enabledDescription', 'Show this plugin in the sidebar')}
								</div>
							</div>
							<Switch
								checked={currentPlugin.enabled}
								onCheckedChange={handleToggleEnabled}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<div className="font-medium flex items-center gap-2">
									{currentPlugin.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
									{t('plugins.visibleInSidebar', 'Visible in sidebar')}
								</div>
								<div className="text-sm text-muted-foreground">
									{t('plugins.visibleInSidebarDescription', 'Show this plugin in the sidebar. When off, it will not appear in the navbar.')}
								</div>
							</div>
							<Switch
								checked={currentPlugin.pinned}
								onCheckedChange={handleTogglePinned}
								disabled={!currentPlugin.enabled}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Spot Types Selection for Cleaning Plugin */}
				{pluginId === 'cleaning' && Array.isArray(spotTypes) && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>{t('plugins.cleaning.spotTypes', 'Applicable Spot Types')}</span>
								{hasUnsavedChanges && (
									<span className="text-xs text-amber-500 font-normal">
										{t('plugins.cleaning.unsavedChanges', 'Unsaved changes')}
									</span>
								)}
							</CardTitle>
							<CardDescription>
								{t('plugins.cleaning.spotTypesDescription', 'Select which spot types are applicable for cleaning operations')}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t('plugins.cleaning.selectSpotTypes', 'Select Spot Types')}
								</label>
								<MultiSelect
									options={Array.isArray(spotTypes) ? spotTypes.map((st: any) => ({
										value: String(st.id),
										label: st.name || `Spot Type ${st.id}`
									})) : []}
									onValueChange={handleSpotTypesChange}
									defaultValue={Array.isArray(spotTypes) && spotTypes.length > 0 
										? selectedSpotTypeIds.filter(id => spotTypes.some((st: any) => String(st.id) === id))
										: []}
									placeholder={
										!Array.isArray(spotTypes) || spotTypes.length === 0
											? t('plugins.cleaning.loadingSpotTypes', 'Loading spot types...')
											: t('plugins.cleaning.selectSpotTypesPlaceholder', 'Select spot types...')
									}
									maxCount={10}
									disabled={saving}
									className="w-full"
								/>
								<p className="text-xs text-muted-foreground">
									{t('plugins.cleaning.spotTypesHint', 'Only spots with selected types will be available for cleaning operations')}
								</p>
							</div>
							<div className="flex justify-end pt-2">
								<Button
									onClick={handleSaveSpotTypes}
									disabled={saving || !hasUnsavedChanges || !backendPlugin}
									className="gap-2"
								>
									<Save className="h-4 w-4" />
									{saving 
										? t('plugins.cleaning.saving', 'Saving...')
										: t('plugins.cleaning.save', 'Save')
									}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Status to Cleaning Status Mapping for Cleaning Plugin */}
				{pluginId === 'cleaning' && Array.isArray(statuses) && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>{t('plugins.cleaning.statusMapping', 'Task Status to Cleaning Status Mapping')}</span>
								{hasUnsavedStatusMappingChanges && (
									<span className="text-xs text-amber-500 font-normal">
										{t('plugins.cleaning.unsavedChanges', 'Unsaved changes')}
									</span>
								)}
							</CardTitle>
							<CardDescription>
								{t('plugins.cleaning.statusMappingDescription', 'Configure which cleaning status to assign to spots when a task changes to a specific status. For example: "En Progreso" → "Cleaning", "Finalizado" → "Limpia"')}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{!Array.isArray(cleaningStatuses) || cleaningStatuses.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<p>{t('plugins.cleaning.loadingCleaningStatuses', 'Loading cleaning statuses...')}</p>
									<p className="text-xs mt-2">
										{cleaningStatuses.length === 0 
											? t('plugins.cleaning.noCleaningStatusesFound', 'No cleaning statuses found. Please create cleaning statuses first.')
											: ''
										}
									</p>
								</div>
							) : (
								<>
									{/* Existing mappings */}
									<div className="space-y-3">
										{statusToCleaningStatusMap.length === 0 ? (
											<div className="text-center py-6 text-muted-foreground text-sm">
												{t('plugins.cleaning.noMappingsConfigured', 'No mappings configured. Click "Add Mapping" to create one.')}
											</div>
										) : (
											(Array.isArray(statusToCleaningStatusMap) ? statusToCleaningStatusMap : []).map((mapping) => {
												const status = statuses.find(s => s.id === mapping.status_id);
												const cleaningStatus = cleaningStatuses.find(cs => cs.id === mapping.cleaning_status_id);
												
												if (!status || !cleaningStatus) {
													return null;
												}

												return (
													<div key={`${mapping.status_id}-${mapping.cleaning_status_id}`} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
														<div className="flex-1">
															<div className="flex items-center gap-2">
																{status.color && (
																	<div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
																)}
																<span className="font-medium">{status.name}</span>
															</div>
															<p className="text-xs text-muted-foreground mt-1">
																{t('plugins.cleaning.whenTaskStatus', 'When task status is')} "{status.name}"
															</p>
														</div>
														<div className="flex items-center gap-3 flex-1">
															<span className="text-muted-foreground">→</span>
															<div className="flex items-center gap-2 flex-1">
																{cleaningStatus.color && (
																	<div className="w-3 h-3 rounded-full" style={{ backgroundColor: cleaningStatus.color }} />
																)}
																<span className="font-medium">{cleaningStatus.name}</span>
															</div>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleRemoveMapping(mapping.status_id)}
																className="h-8 w-8 text-destructive hover:text-destructive"
																title={t('plugins.cleaning.removeMapping', 'Remove mapping')}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</div>
												);
											})
										)}
									</div>

									{/* Add new mapping form */}
									{isAddingMapping ? (
										<div className="p-4 border-2 border-dashed rounded-lg space-y-4">
											<div className="grid grid-cols-2 gap-4">
												<div>
													<SelectField
														id="new-status"
														label={t('plugins.cleaning.selectTaskStatus', 'Task Status')}
														value={newMappingStatusId}
														onChange={(v) => setNewMappingStatusId(v)}
														options={availableStatuses.map(s => ({
															value: String(s.id),
															label: s.name,
															color: s.color
														}))}
														placeholder={t('plugins.cleaning.selectTaskStatusPlaceholder', 'Select task status...')}
													/>
												</div>
												<div>
													<SelectField
														id="new-cleaning-status"
														label={t('plugins.cleaning.selectCleaningStatusLabel', 'Cleaning Status')}
														value={newMappingCleaningStatusId}
														onChange={(v) => setNewMappingCleaningStatusId(v)}
														options={cleaningStatuses.map(cs => ({
															value: String(cs.id),
															label: cs.name,
															color: cs.color
														}))}
														placeholder={t('plugins.cleaning.selectCleaningStatus', 'Select cleaning status...')}
													/>
												</div>
											</div>
											<div className="flex justify-end gap-2">
												<Button
													variant="outline"
													onClick={() => {
														setIsAddingMapping(false);
														setNewMappingStatusId('');
														setNewMappingCleaningStatusId('');
													}}
												>
													{t('plugins.cleaning.cancel', 'Cancel')}
												</Button>
												<Button
													onClick={handleAddMapping}
													disabled={!newMappingStatusId || !newMappingCleaningStatusId}
													className="gap-2"
												>
													<Plus className="h-4 w-4" />
													{t('plugins.cleaning.addMapping', 'Add Mapping')}
												</Button>
											</div>
										</div>
									) : (
										<Button
											variant="outline"
											onClick={() => setIsAddingMapping(true)}
											disabled={availableStatuses.length === 0 || cleaningStatuses.length === 0}
											className="w-full gap-2"
										>
											<Plus className="h-4 w-4" />
											{t('plugins.cleaning.addNewMapping', 'Add New Mapping')}
										</Button>
									)}

									<p className="text-xs text-muted-foreground">
										{t('plugins.cleaning.statusMappingHint', 'When a task changes to a status, the associated spot will automatically update its cleaning status.')}
									</p>
									<div className="flex justify-end pt-2">
										<Button
											onClick={handleSaveStatusMapping}
											disabled={savingStatusMapping || !hasUnsavedStatusMappingChanges || !backendPlugin}
											className="gap-2"
										>
											<Save className="h-4 w-4" />
											{savingStatusMapping 
												? t('plugins.cleaning.saving', 'Saving...')
												: t('plugins.cleaning.save', 'Save')
											}
										</Button>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>{t('plugins.about', 'About')}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">{t('plugins.pluginId', 'Plugin ID')}:</span>
								<span className="font-mono">{currentPlugin.id}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">{t('plugins.route', 'Route')}:</span>
								<span className="font-mono">{currentPlugin.route}</span>
							</div>
						</div>
					</CardContent>
				</Card>
				</div>
			)}

			{activeTab === 'summary' && (
				<div className="grid gap-6 max-w-3xl">
					{/* Overview Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FontAwesomeIcon icon={faStar} className="text-amber-500" />
								{t('plugins.keyFeatures', 'Key Features')}
							</CardTitle>
							<CardDescription>
								{t('plugins.keyFeaturesDescription', 'Discover what this plugin can do for you')}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-3">
								{pluginDetails.features.map((feature, index) => (
									<li key={index} className="flex items-start gap-3">
										<FontAwesomeIcon 
											icon={faCheck} 
											className="text-emerald-500 mt-1 flex-shrink-0" 
										/>
										<span className="text-sm">{feature}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					{/* Benefits Card */}
					<Card>
						<CardHeader>
							<CardTitle>{t('plugins.benefits', 'Benefits')}</CardTitle>
							<CardDescription>
								{t('plugins.benefitsDescription', 'How this plugin adds value to your operations')}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-3">
								{pluginDetails.benefits.map((benefit, index) => (
									<li key={index} className="flex items-start gap-3">
										<div 
											className="mt-1 flex-shrink-0"
											style={{ color: currentPlugin.iconColor }}
										>
											✦
										</div>
										<span className="text-sm">{benefit}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					{/* Plugin Info Card */}
					<Card>
						<CardHeader>
							<CardTitle>{t('plugins.about', 'About')}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">{t('plugins.pluginId', 'Plugin ID')}:</span>
									<span className="font-mono">{currentPlugin.id}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">{t('plugins.route', 'Route')}:</span>
									<span className="font-mono">{currentPlugin.route}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">{t('plugins.status', 'Status')}:</span>
									<span className={`font-medium ${currentPlugin.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
										{currentPlugin.enabled ? t('plugins.active', 'Active') : t('plugins.inactive', 'Inactive')}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}

export default PluginSettings;
