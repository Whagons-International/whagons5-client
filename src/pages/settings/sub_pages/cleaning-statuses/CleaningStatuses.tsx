import { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faBroom,
	faPlus,
	faTrash,
	faCircleQuestion
} from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/store/store";
import type { CleaningStatus } from "@/store/types";
import { genericActions, genericInternalActions } from "@/store/genericSlices";
import { Button } from "@/components/ui/button";
import { iconService } from "@/database/iconService";
import { UrlTabs } from "@/components/ui/url-tabs";
import {
	SettingsLayout,
	SettingsGrid,
	SettingsDialog,
	useSettingsState,
	createActionsCellRenderer,
	ColorIndicatorCellRenderer,
	TextField,
	CheckboxField,
	IconPicker
} from "../../components";
import { useLanguage } from "@/providers/LanguageProvider";

// Name cell with dynamic icon and color
const CleaningStatusNameCellRenderer = (props: ICellRendererParams) => {
	const [icon, setIcon] = useState<any>(faBroom);
	const statusIcon = props.data?.icon as string | undefined;
	const statusColor = (props.data?.color as string | undefined) || "#6b7280";
	const statusName = props.value as string;

	useEffect(() => {
		const loadIcon = async () => {
			if (!statusIcon) {
				setIcon(faBroom);
				return;
			}
			try {
				const iconClasses = statusIcon.split(" ");
				const iconName = iconClasses[iconClasses.length - 1];
				const loadedIcon = await iconService.getIcon(iconName);
				setIcon(loadedIcon || faBroom);
			} catch {
				setIcon(faBroom);
			}
		};
		loadIcon();
	}, [statusIcon]);

	return (
		<div className="flex items-center space-x-3 h-full">
			<FontAwesomeIcon icon={icon} className="w-4 h-4" style={{ color: statusColor }} />
			<span>{statusName}</span>
		</div>
	);
};

function CleaningStatuses() {
	const dispatch = useDispatch();
	const { t } = useLanguage();
	const tt = (key: string, fallback: string) => t(`settings.cleaningStatuses.${key}`, fallback);

	const {
		items: cleaningStatuses,
		filteredItems,
		loading,
		error,
		searchQuery,
		setSearchQuery,
		handleSearch,
		createItem,
		updateItem,
		deleteItem,
		isSubmitting,
		formError,
		isCreateDialogOpen,
		setIsCreateDialogOpen,
		isEditDialogOpen,
		setIsEditDialogOpen,
		isDeleteDialogOpen,
		editingItem,
		deletingItem,
		handleEdit,
		handleDelete,
		handleCloseDeleteDialog
	} = useSettingsState<CleaningStatus>({
		entityName: "cleaningStatuses" as any,
		searchFields: ["name", "code", "description"] as any
	});

	// Load data on mount
	useEffect(() => {
		dispatch(genericInternalActions.cleaningStatuses.getFromIndexedDB() as any);
		dispatch(genericInternalActions.cleaningStatuses.fetchFromAPI() as any);
	}, [dispatch]);

	const [quickFilterText, setQuickFilterText] = useState("");

	const handleManageSearch = (value: string) => {
		setSearchQuery(value);
		handleSearch(value);
		setQuickFilterText(value);
	};

	// Form state
	const [createFormData, setCreateFormData] = useState<{
		name: string;
		code: string;
		color: string;
		icon: string;
		order: number;
		is_initial: boolean;
		is_clean_state: boolean;
		description: string;
	}>({
		name: "",
		code: "",
		color: "#6b7280",
		icon: "fas fa-broom",
		order: 0,
		is_initial: false,
		is_clean_state: false,
		description: ""
	});

	const [editFormData, setEditFormData] = useState<{
		name: string;
		code: string;
		color: string;
		icon: string;
		order: number;
		is_initial: boolean;
		is_clean_state: boolean;
		description: string;
	}>({
		name: "",
		code: "",
		color: "#6b7280",
		icon: "fas fa-broom",
		order: 0,
		is_initial: false,
		is_clean_state: false,
		description: ""
	});

	useEffect(() => {
		if (editingItem) {
			setEditFormData({
				name: editingItem.name || "",
				code: editingItem.code || "",
				color: editingItem.color || "#6b7280",
				icon: editingItem.icon || "fas fa-broom",
				order: editingItem.order || 0,
				is_initial: editingItem.is_initial || false,
				is_clean_state: editingItem.is_clean_state || false,
				description: editingItem.description || ""
			});
		}
	}, [editingItem]);

	// Get max order to set default for new items
	const maxOrder = useMemo(() => {
		if (!cleaningStatuses || cleaningStatuses.length === 0) return 0;
		const orders = cleaningStatuses.map(s => s.order || 0);
		return orders.length > 0 ? Math.max(...orders) : 0;
	}, [cleaningStatuses]);

	useEffect(() => {
		if (maxOrder >= 0) {
			setCreateFormData(prev => ({ ...prev, order: maxOrder + 1 }));
		}
	}, [maxOrder]);

	const columns = useMemo<ColDef[]>(() => [
		{
			field: "name",
			headerName: tt('grid.columns.name', 'Nombre'),
			flex: 2,
			minWidth: 200,
			cellRenderer: CleaningStatusNameCellRenderer,
			editable: false
		},
		{
			field: "code",
			headerName: tt('grid.columns.code', 'Código'),
			flex: 1,
			minWidth: 120,
			editable: false
		},
		{
			field: "order",
			headerName: tt('grid.columns.order', 'Orden'),
			width: 100,
			editable: false
		},
		{
			field: "is_initial",
			headerName: tt('grid.columns.isInitial', 'Inicial'),
			width: 100,
			cellRenderer: (params: ICellRendererParams) => {
				return params.value ? (
					<span className="text-emerald-600 font-medium">{tt('grid.values.yes', 'Sí')}</span>
				) : (
					<span className="text-muted-foreground">{tt('grid.values.no', 'No')}</span>
				);
			},
			editable: false
		},
		{
			field: "is_clean_state",
			headerName: tt('grid.columns.isCleanState', 'Estado Limpio'),
			width: 130,
			cellRenderer: (params: ICellRendererParams) => {
				return params.value ? (
					<span className="text-emerald-600 font-medium">{tt('grid.values.yes', 'Sí')}</span>
				) : (
					<span className="text-muted-foreground">{tt('grid.values.no', 'No')}</span>
				);
			},
			editable: false
		},
		{
			field: "actions",
			headerName: tt('grid.columns.actions', 'Acciones'),
			width: 100,
			suppressSizeToFit: true,
			cellRenderer: () => null,
			sortable: false,
			filter: false,
			resizable: false,
			pinned: "right"
		}
	], [handleEdit, tt]);

	const handleCreateSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const data = {
			name: createFormData.name,
			code: createFormData.code,
			color: createFormData.color,
			icon: createFormData.icon,
			order: createFormData.order,
			is_initial: createFormData.is_initial,
			is_clean_state: createFormData.is_clean_state,
			description: createFormData.description || null
		} as Omit<CleaningStatus, "id" | "created_at" | "updated_at"> & { icon?: string | null; description?: string | null };
		await createItem(data as any);
		setCreateFormData({
			name: "",
			code: "",
			color: "#6b7280",
			icon: "fas fa-broom",
			order: maxOrder + 1,
			is_initial: false,
			is_clean_state: false,
			description: ""
		});
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingItem) return;
		const updates = {
			name: editFormData.name,
			code: editFormData.code,
			color: editFormData.color,
			icon: editFormData.icon,
			order: editFormData.order,
			is_initial: editFormData.is_initial,
			is_clean_state: editFormData.is_clean_state,
			description: editFormData.description || null
		} as Partial<CleaningStatus> & { icon?: string | null; description?: string | null };
		await updateItem(editingItem.id, updates);
	};

	const handleDeleteFromEdit = () => {
		if (!editingItem) return;
		setIsEditDialogOpen(false);
		handleDelete(editingItem);
	};

	const tabsConfig = [
		{
			value: "manage",
			label: (
				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faBroom} className="w-4 h-4" />
					<span>{tt('tabs.manage', 'Gestionar')}</span>
				</div>
			),
			content: (
				<div className="flex h-full flex-col gap-4">
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<input
							type="text"
							placeholder={tt('search.placeholder', 'Buscar estados de limpieza...')}
							value={searchQuery}
							onChange={(event) => handleManageSearch(event.target.value)}
							className="w-full max-w-md px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						/>
					</div>
					<div className="flex-1 min-h-0">
						<SettingsGrid
							rowData={filteredItems || []}
							columnDefs={columns}
							onRowClicked={handleEdit}
							noRowsMessage={tt('grid.noRows', 'No se encontraron estados de limpieza')}
							quickFilterText={quickFilterText}
						/>
					</div>
				</div>
			)
		},
		{
			value: "help",
			label: (
				<div className="flex items-center gap-2">
					<FontAwesomeIcon icon={faCircleQuestion} className="w-4 h-4" />
					<span>{tt('tabs.help', 'Ayuda')}</span>
				</div>
			),
			content: (
				<div className="flex h-full flex-col gap-6 p-6">
					<div>
						<h3 className="text-lg font-semibold mb-2">{tt('help.about.title', 'Acerca de los Estados de Limpieza')}</h3>
						<p className="text-sm text-muted-foreground">
							{tt('help.about.description', 'Los estados de limpieza definen los diferentes estados que puede tener un spot durante las operaciones de limpieza.')}
						</p>
					</div>
					<div>
						<h3 className="text-lg font-semibold mb-2">{tt('help.creating.title', 'Crear Estados')}</h3>
						<p className="text-sm text-muted-foreground mb-2">
							{tt('help.creating.description', 'Haz clic en el botón "Agregar Estado" para crear un nuevo estado. Puedes personalizar:')}
						</p>
						<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
							<li>{tt('help.creating.name', 'Nombre - Un nombre descriptivo para el estado')}</li>
							<li>{tt('help.creating.code', 'Código - Un código único para identificar el estado')}</li>
							<li>{tt('help.creating.color', 'Color - Identificador visual para reconocimiento rápido')}</li>
							<li>{tt('help.creating.icon', 'Icono - Clase de icono FontAwesome para apariencia visual')}</li>
							<li>{tt('help.creating.order', 'Orden - Posición en la secuencia de estados')}</li>
							<li>{tt('help.creating.isInitial', 'Estado Inicial - Marca si este es el estado inicial por defecto')}</li>
							<li>{tt('help.creating.isCleanState', 'Estado Limpio - Marca si este estado representa que el spot está limpio')}</li>
						</ul>
					</div>
					<div>
						<h3 className="text-lg font-semibold mb-2">{tt('help.managing.title', 'Gestionar Estados')}</h3>
						<p className="text-sm text-muted-foreground">
							{tt('help.managing.description', 'Usa la pestaña Gestionar para ver, editar y eliminar estados. Haz clic en cualquier fila para editar un estado, o usa los botones de acción.')}
						</p>
					</div>
				</div>
			)
		}
	];


	return (
		<SettingsLayout
			title={tt('title', 'Estados de Limpieza')}
			description={tt('description', 'Gestiona los estados para operaciones de limpieza')}
			icon={faBroom}
			iconColor="#14b8a6"
			backPath="/settings"
			loading={{ isLoading: loading, message: tt('loading', 'Cargando estados de limpieza...') }}
			error={error ? { message: error, onRetry: () => window.location.reload() } : undefined}
			headerActions={
				<Button
					onClick={() => setIsCreateDialogOpen(true)}
					size="default"
					className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-[0.98]"
				>
					<FontAwesomeIcon icon={faPlus} className="mr-2" />
					{tt('header.addStatus', 'Agregar Estado')}
				</Button>
			}
		>
			<UrlTabs
				tabs={tabsConfig}
				defaultValue="manage"
				basePath="/settings/cleaning-statuses"
				className="h-full flex flex-col"
			/>

			{/* Create Dialog */}
			<SettingsDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				type="create"
				title={tt('dialogs.create.title', 'Agregar Nuevo Estado de Limpieza')}
				description={tt('dialogs.create.description', 'Crea un nuevo estado para operaciones de limpieza.')}
				onSubmit={handleCreateSubmit}
				isSubmitting={isSubmitting}
				error={formError}
				submitDisabled={isSubmitting}
			>
				<div className="grid gap-4">
					<TextField
						id="name"
						label={tt('dialogs.fields.name', 'Nombre')}
						value={createFormData.name}
						onChange={(v) => setCreateFormData(p => ({ ...p, name: v }))}
						required
					/>
					<TextField
						id="code"
						label={tt('dialogs.fields.code', 'Código')}
						value={createFormData.code}
						onChange={(v) => setCreateFormData(p => ({ ...p, code: v.toUpperCase() }))}
						required
						placeholder="Ej: LIMPIO, EN_PROCESO"
					/>
					<TextField
						id="color"
						label={tt('dialogs.fields.color', 'Color')}
						type="color"
						value={createFormData.color}
						onChange={(v) => setCreateFormData(p => ({ ...p, color: v }))}
					/>
					<IconPicker
						id="icon"
						label={tt('dialogs.fields.icon', 'Icono')}
						value={createFormData.icon}
						onChange={(v) => setCreateFormData(p => ({ ...p, icon: v }))}
						color={createFormData.color}
					/>
					<TextField
						id="order"
						label={tt('dialogs.fields.order', 'Orden')}
						type="number"
						value={createFormData.order.toString()}
						onChange={(v) => setCreateFormData(p => ({ ...p, order: parseInt(v) || 0 }))}
					/>
					<TextField
						id="description"
						label={tt('dialogs.fields.description', 'Descripción')}
						value={createFormData.description}
						onChange={(v) => setCreateFormData(p => ({ ...p, description: v }))}
					/>
					<CheckboxField
						id="is_initial"
						label={tt('dialogs.fields.isInitial', 'Estado Inicial')}
						checked={createFormData.is_initial}
						onChange={(checked) => setCreateFormData(p => ({ ...p, is_initial: checked }))}
					/>
					<CheckboxField
						id="is_clean_state"
						label={tt('dialogs.fields.isCleanState', 'Estado Limpio')}
						checked={createFormData.is_clean_state}
						onChange={(checked) => setCreateFormData(p => ({ ...p, is_clean_state: checked }))}
					/>
				</div>
			</SettingsDialog>

			{/* Edit Dialog */}
			<SettingsDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				type="edit"
				title={tt('dialogs.edit.title', 'Editar Estado de Limpieza')}
				description={tt('dialogs.edit.description', 'Actualiza la información del estado.')}
				onSubmit={handleEditSubmit}
				isSubmitting={isSubmitting}
				error={formError}
				submitDisabled={isSubmitting || !editingItem}
				submitText={isSubmitting ? tt('dialogs.edit.saving', 'Guardando...') : tt('dialogs.edit.save', 'Guardar cambios')}
				footerActions={
					<Button
						type="button"
						variant="destructive"
						size="icon"
						onClick={handleDeleteFromEdit}
						disabled={!editingItem}
						title={tt('dialogs.delete.button', 'Eliminar')}
						aria-label={tt('dialogs.delete.button', 'Eliminar')}
					>
						<FontAwesomeIcon icon={faTrash} />
					</Button>
				}
			>
				{editingItem && (
					<div className="grid gap-4">
						<TextField
							id="edit-name"
							label={tt('dialogs.fields.name', 'Nombre')}
							value={editFormData.name}
							onChange={(v) => setEditFormData(p => ({ ...p, name: v }))}
							required
						/>
						<TextField
							id="edit-code"
							label={tt('dialogs.fields.code', 'Código')}
							value={editFormData.code}
							onChange={(v) => setEditFormData(p => ({ ...p, code: v.toUpperCase() }))}
							required
						/>
						<TextField
							id="edit-color"
							label={tt('dialogs.fields.color', 'Color')}
							type="color"
							value={editFormData.color}
							onChange={(v) => setEditFormData(p => ({ ...p, color: v }))}
						/>
						<IconPicker
							id="edit-icon"
							label={tt('dialogs.fields.icon', 'Icono')}
							value={editFormData.icon}
							onChange={(v) => setEditFormData(p => ({ ...p, icon: v }))}
							color={editFormData.color}
						/>
						<TextField
							id="edit-order"
							label={tt('dialogs.fields.order', 'Orden')}
							type="number"
							value={editFormData.order.toString()}
							onChange={(v) => setEditFormData(p => ({ ...p, order: parseInt(v) || 0 }))}
						/>
						<TextField
							id="edit-description"
							label={tt('dialogs.fields.description', 'Descripción')}
							value={editFormData.description}
							onChange={(v) => setEditFormData(p => ({ ...p, description: v }))}
						/>
						<CheckboxField
							id="edit-is_initial"
							label={tt('dialogs.fields.isInitial', 'Estado Inicial')}
							checked={editFormData.is_initial}
							onChange={(checked) => setEditFormData(p => ({ ...p, is_initial: checked }))}
						/>
						<CheckboxField
							id="edit-is_clean_state"
							label={tt('dialogs.fields.isCleanState', 'Estado Limpio')}
							checked={editFormData.is_clean_state}
							onChange={(checked) => setEditFormData(p => ({ ...p, is_clean_state: checked }))}
						/>
					</div>
				)}
			</SettingsDialog>

			{/* Delete Dialog */}
			<SettingsDialog
				open={isDeleteDialogOpen}
				onOpenChange={handleCloseDeleteDialog}
				type="delete"
				title={tt('dialogs.delete.title', 'Eliminar Estado de Limpieza')}
				description={deletingItem ? tt('dialogs.delete.confirm', '¿Estás seguro de que deseas eliminar el estado "{name}"? Esta acción no se puede deshacer.').replace('{name}', deletingItem.name) : undefined}
				onConfirm={() => deletingItem ? deleteItem(deletingItem.id) : undefined}
				isSubmitting={isSubmitting}
				error={formError}
				submitDisabled={!deletingItem}
				entityName="cleaning status"
				entityData={deletingItem as any}
				renderEntityPreview={(s: CleaningStatus) => (
					<div className="flex items-center space-x-3">
						<div className="w-4 h-4 rounded-full border" style={{ backgroundColor: s.color || "#6b7280" }} />
						<div>
							<div className="font-medium">{s.name}</div>
							<div className="text-sm text-muted-foreground">{s.code}</div>
						</div>
					</div>
				)}
			/>
		</SettingsLayout>
	);
}

export default CleaningStatuses;
