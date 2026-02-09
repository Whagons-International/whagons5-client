import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpWideShort, faPlus, faGlobe, faChartBar, faTrash } from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/store/store";
import type { Priority } from "@/store/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UrlTabs } from "@/components/ui/url-tabs";
import {
  SettingsLayout,
  SettingsGrid,
  SettingsDialog,
  useSettingsState,
  ColorIndicatorCellRenderer,
  TextField,
  SelectField
} from "../../components";
import { StatisticsTab } from "./components/StatisticsTab";

const PriorityNameCellRenderer = (props: ICellRendererParams) => {
  const name = props.data?.name as string;
  const color = props.data?.color as string | undefined;
  return (
    <ColorIndicatorCellRenderer value={name} name={name} color={color || "#6b7280"} />
  );
};

function Priorities() {
  const { value: priorities } = useSelector((state: RootState) => state.priorities);
  const { value: categories } = useSelector((state: RootState) => state.categories);

  const {
    loading,
    error,
    searchQuery,
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
  } = useSettingsState<Priority>({
    entityName: "priorities",
    searchFields: ["name"]
  });

  // Form state for controlled components
  const [createFormData, setCreateFormData] = useState<{
    name: string;
    color: string;
    category_id: string;
  }>({
    name: '',
    color: '#ef4444',
    category_id: ''
  });

  const [editFormData, setEditFormData] = useState<{
    name: string;
    color: string;
    category_id: string;
  }>({
    name: '',
    color: '#ef4444',
    category_id: ''
  });

  // Reset create form when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      setCreateFormData({
        name: '',
        color: '#ef4444',
        category_id: ''
      });
    }
  }, [isCreateDialogOpen]);

  // Update edit form data when editing item changes
  useEffect(() => {
    if (editingItem) {
      setEditFormData({
        name: editingItem.name || '',
        color: editingItem.color || '#ef4444',
        category_id: editingItem.category_id?.toString() || 'none'
      });
    }
  }, [editingItem]);

  // Count global vs category priorities
  const globalCount = useMemo(() => {
    return (priorities as any[]).filter((p: any) => p.category_id === null || p.category_id === undefined).length;
  }, [priorities]);

  const categoryCount = useMemo(() => {
    return (priorities as any[]).filter((p: any) => p.category_id !== null && p.category_id !== undefined).length;
  }, [priorities]);

  // Priorities grouped by category (for statistics)
  const prioritiesByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    (priorities as any[]).forEach((p: any) => {
      const cid = p.category_id as number | null | undefined;
      if (!cid) return;
      counts.set(cid, (counts.get(cid) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([categoryId, count]) => {
        const cat = (categories as any[])?.find(
          (c: any) => c.id === Number(categoryId)
        );
        return cat ? { category: cat, count } : null;
      })
      .filter(
        (item): item is { category: any; count: number } => !!item
      )
      .sort((a, b) => b.count - a.count);
  }, [priorities, categories]);

  // Unified columns for all priorities
  const columns = useMemo<ColDef[]>(() => [
    {
      field: "name",
      headerName: "Priority",
      flex: 2,
      minWidth: 200,
      cellRenderer: PriorityNameCellRenderer
    },
    {
      colId: "scope",
      headerName: "Scope",
      flex: 1.5,
      minWidth: 180,
      valueGetter: (params: any) => {
        const catId = params.data?.category_id as number | null | undefined;
        if (!catId) return 'Global';
        const cat = (categories as any[])?.find((c: any) => c.id === Number(catId));
        return cat?.name || 'Unknown Category';
      },
      cellRenderer: (params: ICellRendererParams) => {
        const catId = params.data?.category_id as number | null | undefined;
        if (!catId) {
          return (
            <div className="flex items-center gap-2 h-full">
              <FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Global</span>
            </div>
          );
        }
        const cat = (categories as any[])?.find((c: any) => c.id === Number(catId));
        if (!cat) {
          return <span className="text-muted-foreground text-sm">Unknown</span>;
        }
        return (
          <ColorIndicatorCellRenderer value={cat.name} name={cat.name} color={cat.color || "#6b7280"} />
        );
      },
      comparator: (a: any, b: any) => String(a || '').localeCompare(String(b || '')),
      sortable: true,
      filter: true
    }
  ], [categories]);

  // Filter and sort priorities: globals first, then category priorities
  const filteredPriorities = useMemo(() => {
    let list = priorities as any[];
    if (searchQuery) {
      list = list.filter((item: Priority) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Sort: global priorities (no category_id) first, then the rest
    return [...list].sort((a, b) => {
      const aIsGlobal = a.category_id === null || a.category_id === undefined ? 0 : 1;
      const bIsGlobal = b.category_id === null || b.category_id === undefined ? 0 : 1;
      return aIsGlobal - bIsGlobal;
    });
  }, [priorities, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: createFormData.name,
      color: createFormData.color,
      category_id: createFormData.category_id ? parseInt(createFormData.category_id) : null
    } as Omit<Priority, "id" | "created_at" | "updated_at">;

    await createItem(data as any);

    // Reset form after successful creation
    setCreateFormData({
      name: '',
      color: '#ef4444',
      category_id: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updates = {
      name: editFormData.name,
      color: editFormData.color,
      category_id: editFormData.category_id && editFormData.category_id !== 'none'
        ? parseInt(editFormData.category_id)
        : null
    } as Partial<Priority>;

    await updateItem(editingItem.id, updates);
  };

  const renderPriorityPreview = (p: Priority) => (
    <div className="flex items-center space-x-3">
      <div
        className="w-6 h-6 rounded-full border"
        style={{ backgroundColor: p.color || "#6b7280" }}
      />
      <div>
        <div className="font-medium">{p.name}</div>
        {typeof p.level === "number" && (
          <div className="text-xs text-muted-foreground">Level {p.level}</div>
        )}
      </div>
    </div>
  );

  return (
    <SettingsLayout
      title="Priorities"
      description="Manage priority levels used across tasks and templates"
      icon={faArrowUpWideShort}
      iconColor="#ef4444"
      backPath="/settings"
      loading={{ isLoading: loading, message: "Loading priorities..." }}
      error={error ? { message: error, onRetry: () => window.location.reload() } : undefined}
      headerActions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal gap-1.5 py-1 px-2.5">
            <FontAwesomeIcon icon={faGlobe} className="w-3 h-3 text-blue-500" />
            {globalCount} Global
          </Badge>
          <Badge variant="outline" className="text-xs font-normal gap-1.5 py-1 px-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {categoryCount} Category
          </Badge>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            size="default"
            className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-[0.98]"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Priority
          </Button>
        </div>
      }
    >
      <UrlTabs
        tabs={[
          {
            value: "priorities",
            label: (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowUpWideShort} className="w-4 h-4" />
                <span>Priorities</span>
              </div>
            ),
            content: (
              <div className="flex h-full flex-col">
                <div className="flex-1 min-h-0">
                  <SettingsGrid
                    rowData={filteredPriorities}
                    columnDefs={columns}
                    onRowClicked={handleEdit}
                    gridOptions={{
                      getRowStyle: (params: any) => {
                        const catId = params.data?.category_id;
                        if (catId === null || catId === undefined) {
                          return { backgroundColor: 'var(--color-blue-50, #eff6ff)', fontWeight: '500' } as any;
                        }
                        return undefined as any;
                      }
                    }}
                    noRowsMessage="No priorities found. Click 'Add Priority' to create one."
                  />
                </div>
              </div>
            )
          },
          {
            value: "statistics",
            label: (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faChartBar} className="w-4 h-4" />
                <span>Statistics</span>
              </div>
            ),
            content: (
              <StatisticsTab
                globalCount={globalCount}
                categoryCount={categoryCount}
                totalCount={priorities.length}
                prioritiesByCategory={prioritiesByCategory as any}
              />
            )
          }
        ]}
        defaultValue="priorities"
        basePath="/settings/priorities"
        className="h-full flex flex-col"
      />

      {/* Create Dialog */}
      <SettingsDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        type="create"
        title="Add New Priority"
        description="Create a new priority level."
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        error={formError}
        submitDisabled={isSubmitting}
      >
        <div className="grid gap-4">
          <TextField
            id="name"
            label="Name"
            value={createFormData.name}
            onChange={(value) => setCreateFormData(prev => ({ ...prev, name: value }))}
            required
          />
          <TextField
            id="color"
            label="Color"
            type="color"
            value={createFormData.color}
            onChange={(value) => setCreateFormData(prev => ({ ...prev, color: value }))}
          />
          <SelectField
            id="category"
            label="Category (optional - leave empty for global priority)"
            value={createFormData.category_id || 'none'}
            onChange={(value) => setCreateFormData(prev => ({ ...prev, category_id: value === 'none' ? '' : value }))}
            placeholder="Global Priority (no category)"
            options={(() => {
              const categoryOptions = Array.isArray(categories) && categories.length > 0
                ? categories.map((c: any) => ({ value: String(c.id), label: String(c.name || 'Unnamed') }))
                : [];
              return [
                { value: 'none', label: 'Global Priority (no category)' },
                ...categoryOptions
              ];
            })()}
          />
        </div>
      </SettingsDialog>

      {/* Edit Dialog */}
      <SettingsDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="edit"
        title="Edit Priority"
        description="Update the priority information."
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        error={formError}
        submitDisabled={isSubmitting || !editingItem}
        footerActions={
          editingItem ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => {
                setIsEditDialogOpen(false);
                handleDelete(editingItem);
              }}
              disabled={isSubmitting}
              title="Delete Priority"
              aria-label="Delete Priority"
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          ) : null
        }
      >
        {editingItem && (
          <div className="grid gap-4">
            <TextField
              id="edit-name"
              label="Name"
              value={editFormData.name}
              onChange={(value) => setEditFormData(prev => ({ ...prev, name: value }))}
              required
            />
            <TextField
              id="edit-color"
              label="Color"
              type="color"
              value={editFormData.color}
              onChange={(value) => setEditFormData(prev => ({ ...prev, color: value }))}
            />
            <SelectField
              id="edit-category"
              label="Category (optional - leave empty for global priority)"
              value={editFormData.category_id || 'none'}
              onChange={(value) => setEditFormData(prev => ({ ...prev, category_id: value === 'none' ? '' : value }))}
              placeholder="Global Priority (no category)"
              options={(() => {
                const categoryOptions = Array.isArray(categories) && categories.length > 0
                  ? categories.map((c: any) => ({ value: String(c.id), label: String(c.name || 'Unnamed') }))
                  : [];
                return [
                  { value: 'none', label: 'Global Priority (no category)' },
                  ...categoryOptions
                ];
              })()}
            />
          </div>
        )}
      </SettingsDialog>

      {/* Delete Dialog */}
      <SettingsDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleCloseDeleteDialog}
        type="delete"
        title="Delete Priority"
        description={deletingItem ? `Are you sure you want to delete the priority "${deletingItem.name}"? This action cannot be undone.` : undefined}
        onConfirm={() => deletingItem ? deleteItem(deletingItem.id) : undefined}
        isSubmitting={isSubmitting}
        error={formError}
        submitDisabled={!deletingItem}
        entityName="priority"
        entityData={deletingItem as any}
        renderEntityPreview={(p: Priority) => renderPriorityPreview(p)}
      />
    </SettingsLayout>
  );
}

export default Priorities;

