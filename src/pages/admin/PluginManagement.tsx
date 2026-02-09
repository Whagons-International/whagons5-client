import { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faPlug,
	faToggleOn,
	faToggleOff,
	faCog,
	faCheck,
	faTimes,
	faRefresh,
	faCircleInfo,
	faShieldHalved,
	faRoute,
	faBroom,
	faBoxesStacked,
	faUsers,
	faDollarSign,
	faWarehouse,
	faClock,
	faFileAlt,
	faChartLine,
	faHammer,
	faBell,
	faTrophy,
	faRocket,
	faHotel,
	faCalendar,
	faQrcode,
	faChartBar,
	faGripVertical,
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useLanguage } from '@/providers/LanguageProvider';
import { actionsApi } from '@/api/whagonsActionsApi';
import { genericActions, genericInternalActions, genericCaches } from '@/store/genericSlices';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Logger } from '@/utils/logger';
interface Plugin {
	id: number;
	slug: string;
	name: string;
	description: string;
	version: string;
	is_enabled: boolean;
	settings: Record<string, any>;
	required_permissions?: string[] | null;
	routes_count?: number;
	created_at: string;
	updated_at: string;
}

const pluginMeta: Record<string, { color: string; icon: any }> = {
	boards: { color: '#8b5cf6', icon: faUsers },
	broadcasts: { color: '#ef4444', icon: faBell },
	cleaning: { color: '#10b981', icon: faBroom },
	assets: { color: '#0ea5e9', icon: faBoxesStacked },
	compliance: { color: '#10b981', icon: faFileAlt },
	analytics: { color: '#3b82f6', icon: faChartLine },
	'kpi-cards': { color: '#3b82f6', icon: faChartBar },
	clockin: { color: '#6366f1', icon: faClock },
	costs: { color: '#f59e0b', icon: faDollarSign },
	inventory: { color: '#14b8a6', icon: faWarehouse },
	tools: { color: '#f97316', icon: faHammer },
	gamification: { color: '#a855f7', icon: faTrophy },
	motivation: { color: '#eab308', icon: faRocket },
	'hotel-analytics': { color: '#10b981', icon: faHotel },
	'working-hours': { color: '#f97316', icon: faCalendar },
	'qr-codes': { color: '#06b6d4', icon: faQrcode },
};

const getPluginMeta = (slug: string) => pluginMeta[slug] || { color: '#6b7280', icon: faPlug };

// Map plugin slugs to translation key prefixes (slugs are kebab-case, keys are camelCase)
const slugToTranslationKey: Record<string, string> = {
	boards: 'plugins.boards',
	broadcasts: 'plugins.broadcasts',
	cleaning: 'plugins.cleaning',
	assets: 'plugins.assets',
	compliance: 'plugins.compliance',
	analytics: 'plugins.analytics',
	'kpi-cards': 'plugins.kpiCards',
	clockin: 'plugins.clockin',
	costs: 'plugins.costs',
	inventory: 'plugins.inventory',
	tools: 'plugins.tools',
	gamification: 'plugins.gamification',
	motivation: 'plugins.motivation',
	'hotel-analytics': 'plugins.hotelAnalytics',
	'working-hours': 'plugins.workingHours',
	'qr-codes': 'plugins.qrCodes',
	teamconnect: 'plugins.teamconnect',
};

const STORAGE_KEY = 'wh-plugins-order-v1';

const loadOrder = (): number[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map((id: any) => Number(id)) : [];
	} catch {
		return [];
	}
};

const saveOrder = (ids: number[]) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
	} catch {}
};

interface SortablePluginCardProps {
	plugin: Plugin;
	isExpanded: boolean;
	onExpandToggle: (id: number | null) => void;
	onToggle: (plugin: Plugin) => void;
	toggling: Record<string, boolean>;
	t: (key: string, fallback?: string) => string;
}

function SortablePluginCard({
	plugin,
	isExpanded,
	onExpandToggle,
	onToggle,
	toggling,
	t,
}: SortablePluginCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: plugin.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const meta = getPluginMeta(plugin.slug);
	const tKey = slugToTranslationKey[plugin.slug];
	const pluginName = tKey ? t(`${tKey}.title`, plugin.name) : plugin.name;
	const pluginDesc = tKey ? t(`${tKey}.description`, plugin.description) : plugin.description;

	return (
		<div
			ref={setNodeRef}
			style={{ ...style, touchAction: 'none' }}
			className="h-full"
		>
			<Card
				className={`transition-all duration-200 overflow-hidden ${
					plugin.is_enabled
						? 'border-l-3 shadow-sm'
						: 'bg-muted/50 border-muted'
				} ${isDragging ? 'shadow-lg scale-[1.02] opacity-90' : ''}`}
				style={{
					borderLeftColor: plugin.is_enabled ? meta.color : 'hsl(var(--muted-foreground))',
					borderLeftWidth: '3px',
				}}
			>
				<CardContent className="p-3">
					<div className="flex items-center gap-3">
						{/* Drag Handle */}
						<div
							{...listeners}
							{...attributes}
							className="cursor-grab active:cursor-grabbing flex-shrink-0 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
							title={t('plugins.management.dragHandle', 'Drag to reorder')}
						>
							<FontAwesomeIcon icon={faGripVertical} className="text-sm" />
						</div>

						{/* Icon */}
						<div
							className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
								plugin.is_enabled
									? 'text-white'
									: 'bg-muted-foreground/20 text-muted-foreground'
							}`}
							style={plugin.is_enabled ? { backgroundColor: meta.color } : undefined}
						>
							<FontAwesomeIcon icon={meta.icon} className="text-sm" />
						</div>

						{/* Name + description */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<span className={`font-semibold text-sm truncate ${
									plugin.is_enabled ? '' : 'text-muted-foreground'
								}`}>{pluginName}</span>
								<span className="text-[10px] text-muted-foreground font-mono">v{plugin.version}</span>
							</div>
							<p className="text-xs text-muted-foreground truncate">{pluginDesc}</p>
						</div>

						{/* Toggle */}
						<div className="flex-shrink-0 flex items-center gap-2">
							<Switch
								checked={plugin.is_enabled}
								onCheckedChange={() => onToggle(plugin)}
								disabled={toggling[plugin.slug]}
								className="data-[state=checked]:bg-green-500 scale-90"
							/>
						</div>
					</div>

					{/* Expand/collapse for details */}
					<div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
						<div className="flex items-center gap-2">
							<Badge
								variant={plugin.is_enabled ? 'default' : 'secondary'}
								className="text-[10px] h-5 px-1.5"
							>
								{plugin.is_enabled ? (
									<><FontAwesomeIcon icon={faCheck} className="mr-1 text-[8px]" />{t('plugins.management.enabled', 'Enabled')}</>
								) : (
									<><FontAwesomeIcon icon={faTimes} className="mr-1 text-[8px]" />{t('plugins.management.disabled', 'Disabled')}</>
								)}
							</Badge>
							{plugin.routes_count ? (
								<span className="text-[10px] text-muted-foreground flex items-center gap-1">
									<FontAwesomeIcon icon={faRoute} className="text-[8px]" />
									{plugin.routes_count} {t('plugins.management.routes', 'routes')}
								</span>
							) : null}
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
							onClick={() => onExpandToggle(isExpanded ? null : plugin.id)}
						>
							<FontAwesomeIcon icon={faCog} className="mr-1 text-[8px]" />
							{isExpanded ? t('plugins.management.hideDetails', 'Hide details') : t('plugins.management.details', 'Details')}
						</Button>
					</div>

					{/* Expandable details section */}
					{isExpanded && (
						<div className="mt-2 pt-2 border-t border-border/50 space-y-3 animate-in slide-in-from-top-1 duration-200">
							<Tabs defaultValue="info" className="w-full">
								<TabsList className="h-7 w-full">
									<TabsTrigger value="info" className="text-[10px] h-5 px-2 flex-1">
										<FontAwesomeIcon icon={faCircleInfo} className="mr-1 text-[8px]" />
										{t('plugins.management.info', 'Info')}
									</TabsTrigger>
									<TabsTrigger value="settings" className="text-[10px] h-5 px-2 flex-1">
										<FontAwesomeIcon icon={faCog} className="mr-1 text-[8px]" />
										{t('plugins.management.settings', 'Settings')}
									</TabsTrigger>
									<TabsTrigger value="permissions" className="text-[10px] h-5 px-2 flex-1">
										<FontAwesomeIcon icon={faShieldHalved} className="mr-1 text-[8px]" />
										{t('plugins.management.permissions', 'Permissions')}
									</TabsTrigger>
								</TabsList>

								<TabsContent value="info" className="mt-2 space-y-1.5">
									<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
										<div>
											<span className="text-muted-foreground">{t('plugins.management.slug', 'Slug:')}</span>
											<code className="ml-1 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{plugin.slug}</code>
										</div>
										<div>
											<span className="text-muted-foreground">{t('plugins.management.version', 'Version:')}</span>
											<span className="ml-1 font-mono font-semibold">{plugin.version}</span>
										</div>
										<div>
											<span className="text-muted-foreground">{t('plugins.management.routesLabel', 'Routes:')}</span>
											<span className="ml-1 font-semibold">{plugin.routes_count || 0}</span>
										</div>
										<div>
											<span className="text-muted-foreground">{t('plugins.management.updated', 'Updated:')}</span>
											<span className="ml-1">{new Date(plugin.updated_at).toLocaleDateString()}</span>
										</div>
									</div>
								</TabsContent>

								<TabsContent value="settings" className="mt-2">
									{plugin.settings && Object.keys(plugin.settings).length > 0 ? (
										<div className="bg-muted p-2 rounded text-[10px] font-mono max-h-40 overflow-y-auto">
											<pre className="whitespace-pre-wrap">{JSON.stringify(plugin.settings, null, 2)}</pre>
										</div>
									) : (
										<p className="text-xs text-muted-foreground text-center py-3">{t('plugins.management.noSettings', 'No settings configured')}</p>
									)}
								</TabsContent>

								<TabsContent value="permissions" className="mt-2">
									{Array.isArray(plugin.required_permissions) && plugin.required_permissions.length > 0 ? (
										<div className="flex flex-wrap gap-1">
											{plugin.required_permissions.map(perm => (
												<Badge key={perm} variant="outline" className="text-[10px] h-5">
													{perm}
												</Badge>
											))}
										</div>
									) : (
										<p className="text-xs text-muted-foreground text-center py-3">{t('plugins.management.noPermissions', 'No specific permissions required')}</p>
									)}
								</TabsContent>
							</Tabs>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function PluginManagement() {
	const { t } = useLanguage();
	const dispatch = useDispatch();
	const plugins = useSelector((state: RootState) => (state as any).plugins?.value || []) as Plugin[];
	const loading = useSelector((state: RootState) => (state as any).plugins?.loading || false);
	const [toggling, setToggling] = useState<Record<string, boolean>>({});
	const [expandedPlugin, setExpandedPlugin] = useState<number | null>(null);
	const [pluginOrder, setPluginOrder] = useState<number[]>(() => loadOrder());

	// Fetch plugins on mount
	useEffect(() => {
		fetchPlugins();
	}, []);

	// Initialize plugin order if empty
	useEffect(() => {
		if (plugins.length > 0 && pluginOrder.length === 0) {
			const initialOrder = plugins.map(p => p.id);
			setPluginOrder(initialOrder);
			saveOrder(initialOrder);
		}
	}, [plugins, pluginOrder.length]);

	const fetchPlugins = async () => {
		try {
			dispatch(genericInternalActions.plugins.getFromIndexedDB());
			dispatch(genericInternalActions.plugins.fetchFromAPI());
		} catch (error) {
			Logger.error('ui', 'Error fetching plugins:', error);
			toast.error(t('plugins.management.fetchError', 'Failed to fetch plugins'));
		}
	};

	const handleToggle = async (plugin: Plugin) => {
		setToggling(prev => ({ ...prev, [plugin.slug]: true }));
		try {
			const response = await actionsApi.patch(`/plugins/${plugin.slug}/toggle`, {
				is_enabled: !plugin.is_enabled,
			});

			const updatedPlugin = response.data?.data || response.data || response;
			await genericCaches.plugins.update(updatedPlugin.id, updatedPlugin);
			dispatch(genericInternalActions.plugins.updateItem(updatedPlugin));

			toast.success(
				!plugin.is_enabled 
					? t('plugins.management.enabledSuccess', '{name} has been enabled').replace('{name}', plugin.name)
					: t('plugins.management.disabledSuccess', '{name} has been disabled').replace('{name}', plugin.name)
			);
		} catch (error) {
			Logger.error('ui', 'Error toggling plugin:', error);
			toast.error(
				plugin.is_enabled
					? t('plugins.management.disableError', 'Failed to disable {name}').replace('{name}', plugin.name)
					: t('plugins.management.enableError', 'Failed to enable {name}').replace('{name}', plugin.name)
			);
		} finally {
			setToggling(prev => ({ ...prev, [plugin.slug]: false }));
		}
	};

	// Order plugins based on saved order
	const orderedPlugins = useMemo(() => {
		if (pluginOrder.length === 0) return plugins;
		
		const ordered: Plugin[] = [];
		const unordered: Plugin[] = [];
		const orderMap = new Map(pluginOrder.map((id, index) => [id, index]));
		
		plugins.forEach(plugin => {
			if (orderMap.has(plugin.id)) {
				ordered[orderMap.get(plugin.id)!] = plugin;
			} else {
				unordered.push(plugin);
			}
		});
		
		return [...ordered.filter(Boolean), ...unordered];
	}, [plugins, pluginOrder]);

	const enabledCount = plugins.filter(p => p.is_enabled).length;
	const disabledCount = plugins.filter(p => !p.is_enabled).length;

	// dnd-kit sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 3,
			},
		})
	);

	// Refs to track drag state and prevent scroll
	const isDraggingRef = useRef(false);
	const originalOverflowRef = useRef<string>('');
	const originalTouchActionRef = useRef<string>('');
	const originalPositionRef = useRef<string>('');
	const scrollPositionRef = useRef({ x: 0, y: 0 });
	const scrollLockAnimationFrameRef = useRef<number | null>(null);

	// Prevent scrolling during drag
	const handleDragStart = (_event: DragStartEvent) => {
		isDraggingRef.current = true;
		
		// Store original values
		originalOverflowRef.current = document.body.style.overflow || '';
		originalTouchActionRef.current = document.body.style.touchAction || '';
		originalPositionRef.current = document.body.style.position || '';
		
		// Store current scroll position
		scrollPositionRef.current = {
			x: window.scrollX || document.documentElement.scrollLeft,
			y: window.scrollY || document.documentElement.scrollTop
		};
		
		// Prevent scrolling using position: fixed trick (most reliable)
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPositionRef.current.y}px`;
		document.body.style.left = `-${scrollPositionRef.current.x}px`;
		document.body.style.width = '100%';
		document.body.style.overflow = 'hidden';
		document.body.style.touchAction = 'none';
		document.body.style.overscrollBehavior = 'none';
		document.documentElement.style.overflow = 'hidden';
		document.documentElement.style.touchAction = 'none';
		document.documentElement.style.overscrollBehavior = 'none';
		
		// Prevent scroll events with separate handlers for each type
		const preventTouchMove = (e: TouchEvent) => {
			if (isDraggingRef.current) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		
		const preventWheel = (e: WheelEvent) => {
			if (isDraggingRef.current) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		
		const preventScroll = (e: Event) => {
			if (isDraggingRef.current) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		
		// Lock scroll position using requestAnimationFrame (smoother and faster)
		const lockScrollPosition = () => {
			if (isDraggingRef.current) {
				// Lock window scroll
				window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);
				// Lock document scroll
				document.documentElement.scrollTop = scrollPositionRef.current.y;
				document.documentElement.scrollLeft = scrollPositionRef.current.x;
				document.body.scrollTop = scrollPositionRef.current.y;
				document.body.scrollLeft = scrollPositionRef.current.x;
				
				// Continue locking
				scrollLockAnimationFrameRef.current = requestAnimationFrame(lockScrollPosition);
			}
		};
		
		// Start the scroll lock loop
		scrollLockAnimationFrameRef.current = requestAnimationFrame(lockScrollPosition);
		
		window.addEventListener('touchmove', preventTouchMove, { passive: false, capture: true });
		window.addEventListener('wheel', preventWheel, { passive: false, capture: true });
		window.addEventListener('scroll', preventScroll, { passive: false, capture: true });
		document.addEventListener('touchmove', preventTouchMove, { passive: false, capture: true });
		document.addEventListener('wheel', preventWheel, { passive: false, capture: true });
		document.addEventListener('scroll', preventScroll, { passive: false, capture: true });
		
		// Store cleanup function
		(window as any).__dragScrollPreventCleanup = () => {
			if (scrollLockAnimationFrameRef.current !== null) {
				cancelAnimationFrame(scrollLockAnimationFrameRef.current);
				scrollLockAnimationFrameRef.current = null;
			}
			window.removeEventListener('touchmove', preventTouchMove, { capture: true } as any);
			window.removeEventListener('wheel', preventWheel, { capture: true } as any);
			window.removeEventListener('scroll', preventScroll, { capture: true } as any);
			document.removeEventListener('touchmove', preventTouchMove, { capture: true } as any);
			document.removeEventListener('wheel', preventWheel, { capture: true } as any);
			document.removeEventListener('scroll', preventScroll, { capture: true } as any);
		};
	};

	const handleDragEnd = (_event: DragEndEvent, callback: () => void) => {
		isDraggingRef.current = false;
		
		// Clean up event listeners
		if ((window as any).__dragScrollPreventCleanup) {
			(window as any).__dragScrollPreventCleanup();
			delete (window as any).__dragScrollPreventCleanup;
		}
		
		// Restore scroll behavior
		const scrollY = scrollPositionRef.current.y;
		const scrollX = scrollPositionRef.current.x;
		
		document.body.style.position = originalPositionRef.current;
		document.body.style.top = '';
		document.body.style.left = '';
		document.body.style.width = '';
		document.body.style.overflow = originalOverflowRef.current;
		document.body.style.touchAction = originalTouchActionRef.current;
		document.body.style.overscrollBehavior = '';
		document.documentElement.style.overflow = '';
		document.documentElement.style.touchAction = '';
		document.documentElement.style.overscrollBehavior = '';
		
		// Restore scroll position
		window.scrollTo(scrollX, scrollY);
		
		callback();
	};

	// Drag handler for plugins
	const handlePluginDragEnd = (event: DragEndEvent) => {
		handleDragEnd(event, () => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const oldIndex = pluginOrder.indexOf(Number(active.id));
			const newIndex = pluginOrder.indexOf(Number(over.id));

			if (oldIndex !== -1 && newIndex !== -1) {
				const newOrder = arrayMove(pluginOrder, oldIndex, newIndex);
				setPluginOrder(newOrder);
				saveOrder(newOrder);
			} else {
				// If plugin not in order yet, initialize order with all plugin IDs
				const allIds = orderedPlugins.map(p => p.id);
				const activeId = Number(active.id);
				const overId = Number(over.id);
				const activeIdx = allIds.indexOf(activeId);
				const overIdx = allIds.indexOf(overId);
				
				if (activeIdx !== -1 && overIdx !== -1) {
					const newOrder = arrayMove(allIds, activeIdx, overIdx);
					setPluginOrder(newOrder);
					saveOrder(newOrder);
				}
			}
		});
	};

	// IDs for SortableContext
	const pluginIds = useMemo(() => orderedPlugins.map(p => p.id), [orderedPlugins]);

	if (loading && plugins.length === 0) {
		return (
			<div className="p-6 space-y-6 max-w-6xl mx-auto">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<FontAwesomeIcon icon={faPlug} className="text-primary text-lg" />
							{t('plugins.management.title', 'Plugin Management')}
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							{t('plugins.management.description', 'Manage and configure system plugins')}
						</p>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{[1, 2, 3, 4, 5, 6].map(i => (
						<div key={i} className="h-[88px] bg-muted animate-pulse rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-5 max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<FontAwesomeIcon icon={faPlug} className="text-primary text-lg" />
						{t('plugins.management.title', 'Plugin Management')}
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{plugins.length} {t('plugins.management.summary.plugins', 'plugins')} &middot; {enabledCount} {t('plugins.management.summary.enabled', 'enabled')} &middot; {disabledCount} {t('plugins.management.summary.disabled', 'disabled')}
					</p>
				</div>
				<Button
					onClick={fetchPlugins}
					variant="outline"
					size="sm"
					disabled={loading}
				>
					<FontAwesomeIcon icon={faRefresh} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
					{t('plugins.management.refresh', 'Refresh')}
				</Button>
			</div>

			{/* Plugin Grid -- Compact Cards with Drag & Drop */}
			<div className="space-y-3">
				<div className="text-sm text-muted-foreground">
					{t('plugins.management.dragHint', 'Drag cards to reorder.')}
				</div>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handlePluginDragEnd}
				>
					<SortableContext items={pluginIds} strategy={rectSortingStrategy}>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{orderedPlugins.map(plugin => (
								<SortablePluginCard
									key={plugin.id}
									plugin={plugin}
									isExpanded={expandedPlugin === plugin.id}
									onExpandToggle={setExpandedPlugin}
									onToggle={handleToggle}
									toggling={toggling}
									t={t}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>

			{plugins.length === 0 && (
				<Card className="text-center py-12">
					<CardContent>
						<FontAwesomeIcon
							icon={faPlug}
							className="text-5xl text-muted-foreground/30 mb-4"
						/>
						<p className="text-sm font-semibold mb-1">{t('plugins.management.noPlugins', 'No plugins found')}</p>
						<p className="text-xs text-muted-foreground">
							{t('plugins.management.noPluginsDescription', 'Run plugin seeders on the backend to register plugins.')}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
