import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUmbrellaBeach,
  faPlus,
  faCircleInfo
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { UrlTabs } from "@/components/ui/url-tabs";
import {
  SettingsLayout,
  SettingsGrid,
  SettingsDialog,
  useSettingsState,
  TextField,
  CheckboxField
} from "../../components";
import { useLanguage } from "@/providers/LanguageProvider";
import { Trash } from "lucide-react";
import { ColDef } from "ag-grid-enterprise";
import { TimeOffType } from "./types";

function TimeOffTypes() {
  const { t } = useLanguage();
  const tt = (key: string, fallback: string) => t(`settings.timeOffTypes.${key}`, fallback);

  // Use shared state management
  const {
    items: types,
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
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
    setFormError,
    setEditingItem,
    editingItem: editingType,
    deletingItem: deletingType,
    handleEdit,
    handleDelete,
    handleCloseDeleteDialog
  } = useSettingsState<TimeOffType>({
    entityName: 'timeOffTypes',
    searchFields: ['name', 'code', 'description']
  });

  // Form state
  const [createFormData, setCreateFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#22C55E',
    requires_approval: true,
    max_days_per_year: null as number | null,
    is_paid: true,
    is_active: true
  });

  const [editFormData, setEditFormData] = useState(createFormData);

  // Reset forms
  const resetCreateForm = () => {
    setCreateFormData({
      name: '',
      code: '',
      description: '',
      color: '#22C55E',
      requires_approval: true,
      max_days_per_year: null,
      is_paid: true,
      is_active: true
    });
    setFormError(null);
  };

  const resetEditForm = () => {
    if (editingType) {
      setEditFormData({
        name: editingType.name,
        code: editingType.code,
        description: editingType.description || '',
        color: editingType.color || '#22C55E',
        requires_approval: editingType.requires_approval,
        max_days_per_year: editingType.max_days_per_year,
        is_paid: editingType.is_paid,
        is_active: editingType.is_active
      });
    }
  };

  // Column definitions
  const columnDefs = useMemo<ColDef<TimeOffType>[]>(() => [
    {
      headerName: tt('grid.name', 'Name'),
      field: 'name',
      flex: 2,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: params.data.color || '#6B7280' }}
          />
          <span className="font-medium">{params.value}</span>
        </div>
      )
    },
    {
      headerName: tt('grid.code', 'Code'),
      field: 'code',
      flex: 1,
      cellRenderer: (params: any) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
          {params.value}
        </span>
      )
    },
    {
      headerName: tt('grid.maxDays', 'Max Days/Year'),
      field: 'max_days_per_year',
      flex: 1,
      cellRenderer: (params: any) => params.value ? `${params.value} days` : 'Unlimited'
    },
    {
      headerName: tt('grid.approval', 'Approval'),
      field: 'requires_approval',
      flex: 1,
      cellRenderer: (params: any) => (
        <span className={`px-2 py-1 rounded text-xs ${params.value ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
          {params.value ? 'Required' : 'Auto-approve'}
        </span>
      )
    },
    {
      headerName: tt('grid.paid', 'Paid'),
      field: 'is_paid',
      flex: 1,
      cellRenderer: (params: any) => (
        <span className={`px-2 py-1 rounded text-xs ${params.value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {params.value ? 'Paid' : 'Unpaid'}
        </span>
      )
    },
    {
      headerName: tt('grid.actions', 'Actions'),
      field: 'id',
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingItem(params.data);
              resetEditForm();
              setIsEditDialogOpen(true);
            }}
          >
            {tt('actions.edit', 'Edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500"
            onClick={() => handleDelete(params.data)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], [tt, setEditingItem, resetEditForm, setIsEditDialogOpen, handleDelete]);

  // Form validation
  const validateForm = (data: typeof createFormData) => {
    if (!data.name.trim()) {
      return tt('validation.nameRequired', 'Name is required');
    }
    if (!data.code.trim()) {
      return tt('validation.codeRequired', 'Code is required');
    }
    if (data.code.length > 10) {
      return tt('validation.codeTooLong', 'Code must be 10 characters or less');
    }
    return null;
  };

  // Handle create
  const handleCreate = async () => {
    const error = validateForm(createFormData);
    if (error) {
      setFormError(error);
      return;
    }
    await createItem(createFormData);
    setIsCreateDialogOpen(false);
    resetCreateForm();
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingType) return;
    const error = validateForm(editFormData);
    if (error) {
      setFormError(error);
      return;
    }
    await updateItem(editingType.id, editFormData);
    setIsEditDialogOpen(false);
  };

  return (
    <SettingsLayout
      title={tt('title', 'Absence Categories')}
      description={tt('description', 'Configure absence categories like vacation, sick leave, etc.')}
      icon={faUmbrellaBeach}
      statistics={{
        title: tt('stats.title', 'Statistics'),
        items: [
          { label: tt('stats.total', 'Total Categories'), value: String(types.length) },
          { label: tt('stats.active', 'Active'), value: String(types.filter(t => t.is_active).length) }
        ]
      }}
      search={{
        placeholder: tt('search', 'Search absence categories...'),
        value: searchQuery,
        onChange: setSearchQuery
      }}
      headerActions={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {tt('actions.create', 'Create Category')}
        </Button>
      }
    >
      <UrlTabs
        tabs={[
          {
            id: 'types',
            label: tt('tabs.types', 'Types'),
            icon: faUmbrellaBeach,
            content: (
              <SettingsGrid
                rowData={filteredItems}
                columnDefs={columnDefs}
                loading={loading}
                onRowDoubleClick={(event) => {
                  setEditingItem(event.data);
                  resetEditForm();
                  setIsEditDialogOpen(true);
                }}
              />
            )
          },
          {
            id: 'help',
            label: tt('tabs.help', 'Help'),
            icon: faCircleInfo,
            content: (
              <div className="p-4 space-y-4">
                <h3 className="text-lg font-semibold">{tt('help.title', 'Time-Off Types Help')}</h3>
                <p className="text-muted-foreground">
                  {tt('help.description', 'Time-off types define the different categories of leave employees can request. Each type can have different rules for approval and balance tracking.')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{tt('help.tip1', 'Use short, memorable codes like VAC, SICK, PERS')}</li>
                  <li>{tt('help.tip2', 'Set max days per year to track allowances')}</li>
                  <li>{tt('help.tip3', 'Link to approval workflows for manager review')}</li>
                </ul>
              </div>
            )
          }
        ]}
        defaultTab="types"
      />

      {/* Create Dialog */}
      <SettingsDialog
        isOpen={isCreateDialogOpen}
        onClose={() => { setIsCreateDialogOpen(false); resetCreateForm(); }}
        title={tt('dialog.createTitle', 'Create Time-Off Type')}
        description={tt('dialog.createDescription', 'Define a new time-off category')}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        error={formError}
      >
        <div className="space-y-4">
          <TextField
            label={tt('fields.name', 'Name')}
            value={createFormData.name}
            onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
            placeholder="e.g., Vacation"
            required
          />
          <TextField
            label={tt('fields.code', 'Code')}
            value={createFormData.code}
            onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., VAC"
            required
          />
          <TextField
            label={tt('fields.description', 'Description')}
            value={createFormData.description}
            onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
          />
          <TextField
            label={tt('fields.color', 'Color')}
            type="color"
            value={createFormData.color}
            onChange={(e) => setCreateFormData({ ...createFormData, color: e.target.value })}
          />
          <TextField
            label={tt('fields.maxDays', 'Max Days Per Year')}
            type="number"
            value={createFormData.max_days_per_year ? String(createFormData.max_days_per_year) : ''}
            onChange={(e) => setCreateFormData({ ...createFormData, max_days_per_year: e.target.value ? Number(e.target.value) : null })}
            placeholder="Leave empty for unlimited"
          />
          <CheckboxField
            label={tt('fields.requiresApproval', 'Requires approval')}
            checked={createFormData.requires_approval}
            onChange={(checked) => setCreateFormData({ ...createFormData, requires_approval: checked })}
          />
          <CheckboxField
            label={tt('fields.isPaid', 'Paid time off')}
            checked={createFormData.is_paid}
            onChange={(checked) => setCreateFormData({ ...createFormData, is_paid: checked })}
          />
          <CheckboxField
            label={tt('fields.isActive', 'Active')}
            checked={createFormData.is_active}
            onChange={(checked) => setCreateFormData({ ...createFormData, is_active: checked })}
          />
        </div>
      </SettingsDialog>

      {/* Edit Dialog */}
      <SettingsDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title={tt('dialog.editTitle', 'Edit Time-Off Type')}
        description={tt('dialog.editDescription', 'Update time-off type settings')}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        error={formError}
      >
        <div className="space-y-4">
          <TextField
            label={tt('fields.name', 'Name')}
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            required
          />
          <TextField
            label={tt('fields.code', 'Code')}
            value={editFormData.code}
            onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
            required
          />
          <TextField
            label={tt('fields.description', 'Description')}
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
          />
          <TextField
            label={tt('fields.color', 'Color')}
            type="color"
            value={editFormData.color}
            onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
          />
          <TextField
            label={tt('fields.maxDays', 'Max Days Per Year')}
            type="number"
            value={editFormData.max_days_per_year ? String(editFormData.max_days_per_year) : ''}
            onChange={(e) => setEditFormData({ ...editFormData, max_days_per_year: e.target.value ? Number(e.target.value) : null })}
            placeholder="Leave empty for unlimited"
          />
          <CheckboxField
            label={tt('fields.requiresApproval', 'Requires approval')}
            checked={editFormData.requires_approval}
            onChange={(checked) => setEditFormData({ ...editFormData, requires_approval: checked })}
          />
          <CheckboxField
            label={tt('fields.isPaid', 'Paid time off')}
            checked={editFormData.is_paid}
            onChange={(checked) => setEditFormData({ ...editFormData, is_paid: checked })}
          />
          <CheckboxField
            label={tt('fields.isActive', 'Active')}
            checked={editFormData.is_active}
            onChange={(checked) => setEditFormData({ ...editFormData, is_active: checked })}
          />
        </div>
      </SettingsDialog>

      {/* Delete Dialog */}
      <SettingsDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        title={tt('dialog.deleteTitle', 'Delete Time-Off Type')}
        description={tt('dialog.deleteDescription', 'Are you sure you want to delete this type? This action cannot be undone.')}
        onSubmit={() => deletingType && deleteItem(deletingType.id).then(handleCloseDeleteDialog)}
        isSubmitting={isSubmitting}
        submitLabel={tt('actions.delete', 'Delete')}
        submitVariant="destructive"
      >
        {deletingType && (
          <p className="text-muted-foreground">
            {tt('dialog.deleteConfirm', 'You are about to delete')} <strong>{deletingType.name}</strong>
          </p>
        )}
      </SettingsDialog>
    </SettingsLayout>
  );
}

export default TimeOffTypes;
