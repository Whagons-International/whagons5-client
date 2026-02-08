import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type GroupedComboboxOptions } from '@/components/ui/combobox';
import { MultiSelectCombobox, type GroupedMultiSelectOptions } from '@/components/ui/multi-select-combobox';
import { TagMultiSelect, type GroupedTagOptions } from '@/components/ui/tag-multi-select';
import { Switch } from '@/components/ui/switch';
import { RecurrenceEditor } from '@/components/recurrence/RecurrenceEditor';
import { RefreshCw } from 'lucide-react';
import { ChevronUp, Plus, ShieldCheck, Clock } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '@/providers/LanguageProvider';
import { useTaskCreationHistory } from '@/hooks/useTaskCreationHistory';

// Floating info badge component that renders via portal
function FloatingInfoBadges({ 
  show, 
  approvalBadge, 
  destinationBadge 
}: { 
  show: boolean;
  approvalBadge: React.ReactNode | null;
  destinationBadge: React.ReactNode | null;
}) {
  const [sheetLeft, setSheetLeft] = useState<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!show) {
      setSheetLeft(null);
      return;
    }

    const updatePosition = () => {
      // Find the sheet content element
      const sheetContent = document.querySelector('[data-state="open"][role="dialog"]');
      if (sheetContent) {
        const rect = sheetContent.getBoundingClientRect();
        setSheetLeft(rect.left);
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    rafRef.current = requestAnimationFrame(updatePosition);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [show]);

  if (!show || sheetLeft === null) return null;

  return createPortal(
    <div 
      className="fixed flex flex-col gap-2 z-[9999] pointer-events-auto"
      style={{ 
        left: sheetLeft - 12,
        top: '50%',
        transform: 'translate(-100%, -50%)'
      }}
    >
      {approvalBadge}
      {destinationBadge}
    </div>,
    document.body
  );
}

export function BasicTab(props: any) {
  const { t } = useLanguage();
  const {
    mode,
    name,
    setName,
    workspaceTemplates,
    workspaceCategories,
    categories,
    categoryId,
    setCategoryId,
    templateId,
    setTemplateId,
    currentWorkspace,
    selectedApprovalId,
    selectedApproval,
    isReportingCategory,
    currentCategory,
    showDescription,
    setShowDescription,
    description,
    setDescription,
    spotsApplicable,
    selectedTemplate,
    workspaceSpots,
    spotId,
    setSpotId,
    workspaceUsers,
    selectedUserIds,
    setSelectedUserIds,
    categoryPriorities,
    priorityId,
    setPriorityId,
    // Tags
    tags,
    selectedTagIds,
    setSelectedTagIds,
    // Assets
    assetItems,
    assetTypes,
    assetId,
    setAssetId,
    // Date and recurrence fields (only shown when from scheduler)
    isFromScheduler,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    dueDate,
    setDueDate,
    dueTime,
    setDueTime,
    recurrenceSettings,
    setRecurrenceSettings,
  } = props;

  const isAdHoc = currentWorkspace?.allow_ad_hoc_tasks === true;
  const isProjectWorkspace = currentWorkspace?.type === 'PROJECT';

  // Task creation history for favorites/recent suggestions
  const history = useTaskCreationHistory(currentWorkspace?.id);

  // Build grouped options for templates
  const templateGroupedOptions = useMemo((): GroupedComboboxOptions | undefined => {
    if (!currentWorkspace?.id || !workspaceTemplates?.length) return undefined;
    
    const favoriteIds = history.getFavorites('templates');
    const recentIds = history.getRecent('templates');
    
    const toOption = (tpl: any) => {
      const category = categories?.find((c: any) => c.id === tpl.category_id);
      return {
        value: String(tpl.id),
        label: tpl.name,
        description: category ? category.name : undefined,
      };
    };
    
    const templateMap = new Map(workspaceTemplates.map((t: any) => [t.id, t]));
    
    const favorites = favoriteIds
      .map(id => templateMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const recent = recentIds
      .filter(id => !favoriteIds.includes(id))
      .map(id => templateMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const all = workspaceTemplates.map(toOption);
    
    return { favorites, recent, all };
  }, [currentWorkspace?.id, workspaceTemplates, categories, history]);

  // Build grouped options for categories
  const categoryGroupedOptions = useMemo((): GroupedComboboxOptions | undefined => {
    if (!currentWorkspace?.id || !workspaceCategories?.length) return undefined;
    
    const favoriteIds = history.getFavorites('categories');
    const recentIds = history.getRecent('categories');
    
    const toOption = (cat: any) => ({
      value: String(cat.id),
      label: cat.name,
    });
    
    const categoryMap = new Map(workspaceCategories.map((c: any) => [c.id, c]));
    
    const favorites = favoriteIds
      .map(id => categoryMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const recent = recentIds
      .filter(id => !favoriteIds.includes(id))
      .map(id => categoryMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const all = workspaceCategories.map(toOption);
    
    return { favorites, recent, all };
  }, [currentWorkspace?.id, workspaceCategories, history]);

  // Build grouped options for spots
  const spotGroupedOptions = useMemo((): GroupedComboboxOptions | undefined => {
    if (!currentWorkspace?.id || !workspaceSpots?.length) return undefined;
    
    const favoriteIds = history.getFavorites('spots');
    const recentIds = history.getRecent('spots');
    
    const toOption = (spot: any) => ({
      value: String(spot.id),
      label: spot.name,
    });
    
    const spotMap = new Map(workspaceSpots.map((s: any) => [s.id, s]));
    
    const favorites = favoriteIds
      .map(id => spotMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const recent = recentIds
      .filter(id => !favoriteIds.includes(id))
      .map(id => spotMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const all = workspaceSpots.map(toOption);
    
    return { favorites, recent, all };
  }, [currentWorkspace?.id, workspaceSpots, history]);

  // Build grouped options for users
  const userGroupedOptions = useMemo((): GroupedMultiSelectOptions | undefined => {
    if (!currentWorkspace?.id || !workspaceUsers?.length) return undefined;
    
    const favoriteIds = history.getFavorites('users');
    const recentIds = history.getRecent('users');
    
    const toOption = (user: any) => ({
      value: String(user.id),
      label: user.name || user.email || `User ${user.id}`,
    });
    
    const userMap = new Map(workspaceUsers.map((u: any) => [u.id, u]));
    
    const favorites = favoriteIds
      .map(id => userMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const recent = recentIds
      .filter(id => !favoriteIds.includes(id))
      .map(id => userMap.get(id))
      .filter(Boolean)
      .map(toOption);
    
    const all = workspaceUsers.map(toOption);
    
    return { favorites, recent, all };
  }, [currentWorkspace?.id, workspaceUsers, history]);

  // Build grouped options for tags
  const tagGroupedOptions = useMemo((): GroupedTagOptions | undefined => {
    if (!currentWorkspace?.id || !tags?.length) return undefined;
    
    const favoriteIds = history.getFavorites('tags');
    const recentIds = history.getRecent('tags');
    
    const tagMap = new Map(tags.map((t: any) => [t.id, t]));
    
    const favorites = favoriteIds
      .map(id => tagMap.get(id))
      .filter((t): t is { id: number; name: string; color?: string | null } => Boolean(t));
    
    const recent = recentIds
      .filter(id => !favoriteIds.includes(id))
      .map(id => tagMap.get(id))
      .filter((t): t is { id: number; name: string; color?: string | null } => Boolean(t));
    
    return { favorites, recent, all: tags };
  }, [currentWorkspace?.id, tags, history]);

  // Build options for assets (simple list, no favorites/recent for now)
  const assetOptions = useMemo(() => {
    if (!assetItems?.length) return [];
    const typeMap = new Map((assetTypes || []).map((t: any) => [t.id, t]));
    return assetItems
      .filter((a: any) => a.status === 'active') // Only show active assets
      .map((asset: any) => {
        const assetType = typeMap.get(asset.asset_type_id);
        return {
          value: String(asset.id),
          label: asset.name,
          description: assetType?.name || undefined,
        };
      });
  }, [assetItems, assetTypes]);

  // Favorite handlers
  const handleTemplateToggleFavorite = useCallback((value: string) => {
    history.toggleFavorite('templates', parseInt(value, 10));
  }, [history]);

  const handleCategoryToggleFavorite = useCallback((value: string) => {
    history.toggleFavorite('categories', parseInt(value, 10));
  }, [history]);

  const handleSpotToggleFavorite = useCallback((value: string) => {
    history.toggleFavorite('spots', parseInt(value, 10));
  }, [history]);

  const handleUserToggleFavorite = useCallback((value: string) => {
    history.toggleFavorite('users', parseInt(value, 10));
  }, [history]);

  const handleTagToggleFavorite = useCallback((id: number) => {
    history.toggleFavorite('tags', id);
  }, [history]);

  // Get favorite values for display
  const templateFavoriteValues = useMemo(() => 
    history.getFavorites('templates').map(String), [history]);
  const categoryFavoriteValues = useMemo(() => 
    history.getFavorites('categories').map(String), [history]);
  const spotFavoriteValues = useMemo(() => 
    history.getFavorites('spots').map(String), [history]);
  const userFavoriteValues = useMemo(() => 
    history.getFavorites('users').map(String), [history]);
  const tagFavoriteIds = useMemo(() => 
    history.getFavorites('tags'), [history]);

  return (
    <div className="space-y-4 pb-2">
      {/* Name - Only show for adhoc workspaces */}
      {isAdHoc && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="task-name" className="text-sm font-medium font-[500] text-foreground">
            {t('taskDialog.name', 'Name')}
          </Label>
          <Input
            id="task-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('taskDialog.namePlaceholder', 'Enter task name...')}
            className="h-10 px-4 border border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background"
          />
        </div>
      )}

      {/* Category Selection (PROJECT workspaces - adhoc only) */}
      {mode !== 'create-all' && isProjectWorkspace && isAdHoc ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="category" className="text-sm font-medium font-[500] text-foreground">
            {t('taskDialog.category', 'Category')}
          </Label>
          {workspaceCategories?.length ? (
            <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
              <Combobox
                options={workspaceCategories.map((c: any) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                groupedOptions={categoryGroupedOptions}
                favoriteValues={categoryFavoriteValues}
                onFavoriteToggle={handleCategoryToggleFavorite}
                value={categoryId ? String(categoryId) : undefined}
                onValueChange={(v) => {
                  if (!v) return;
                  const newCategoryId = parseInt(v, 10);
                  setCategoryId(newCategoryId);
                  setTemplateId(null);
                }}
                placeholder={t('taskDialog.selectCategory', 'Select category')}
                searchPlaceholder={t('taskDialog.searchCategories', 'Search categories...')}
                emptyText={t('taskDialog.noCategoriesFound', 'No categories found.')}
                className="w-full"
              />
            </div>
          ) : (
            <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
              <Combobox
                options={[]}
                value={undefined}
                onValueChange={() => {}}
                placeholder={t('taskDialog.noCategoriesConfigured', 'No categories configured')}
                searchPlaceholder={t('taskDialog.searchCategories', 'Search categories...')}
                emptyText={t('taskDialog.noCategoriesConfigured', 'No categories configured')}
                className="w-full"
              />
            </div>
          )}
          {!workspaceCategories?.length && (
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'taskDialog.noAllowedCategoriesHint',
                'This workspace has no allowed categories configured. Configure allowed categories in Workspace settings.'
              )}
            </p>
          )}
        </div>
      ) : (
        /* Template Selection (DEFAULT workspaces / PROJECT non-adhoc / create-all mode) */
        <div className="flex flex-col gap-2">
          <Label htmlFor="template" className="text-sm font-medium font-[500] text-foreground">
            {t('taskDialog.template', 'Template')}
          </Label>
          {workspaceTemplates.length === 0 ? (
            <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
              <Combobox
                options={[]}
                value={undefined}
                onValueChange={() => {}}
                placeholder={t('taskDialog.noTemplatesAvailable', 'No templates available')}
                searchPlaceholder={t('taskDialog.searchTemplates', 'Search templates...')}
                emptyText={t('taskDialog.noTemplatesAvailable', 'No templates available')}
                className="w-full"
              />
            </div>
          ) : (
            <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
              <Combobox
                options={workspaceTemplates.map((t: any) => {
                  const category = categories.find((c: any) => c.id === t.category_id);
                  return {
                    value: String(t.id),
                    label: t.name,
                    description: category ? category.name : undefined,
                  };
                })}
                groupedOptions={templateGroupedOptions}
                favoriteValues={templateFavoriteValues}
                onFavoriteToggle={handleTemplateToggleFavorite}
                value={templateId ? String(templateId) : undefined}
                onValueChange={(v) => {
                  if (v) {
                    const newTemplateId = parseInt(v, 10);
                    setTemplateId(newTemplateId);
                  }
                }}
                placeholder={t('taskDialog.selectTemplate', 'Select template')}
                searchPlaceholder={t('taskDialog.searchTemplates', 'Search templates...')}
                emptyText={t('taskDialog.noTemplatesFound', 'No templates found.')}
                className="w-full"
                autoFocus={(mode === 'create' || mode === 'create-all') && !templateId}
              />
            </div>
          )}
          {!workspaceTemplates.length && (
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'create-all'
                ? 'No templates available. Enable or create templates in default workspaces first.'
                : 'No templates available in this workspace. Enable or create templates first.'}
            </p>
          )}
        </div>
      )}

      {/* Floating Info Badges - positioned to the left of the dialog via portal */}
      <FloatingInfoBadges
        show={((mode === 'create' || mode === 'create-all' || mode === 'edit') && !!selectedApprovalId) || !!(isReportingCategory && currentCategory && currentWorkspace)}
        approvalBadge={
          (mode === 'create' || mode === 'create-all' || mode === 'edit') && selectedApprovalId ? (
            <div className="group relative">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shadow-md cursor-default whitespace-nowrap">
                {selectedApproval ? (
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                )}
                <span className="text-xs font-semibold">{t('taskDialog.approvalRequired', 'Approval')}</span>
              </div>
              {/* Tooltip on hover */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block">
                <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm min-w-[200px] max-w-[280px]">
                  <div className="font-semibold text-foreground mb-1">
                    {selectedApproval?.name || `Approval #${selectedApprovalId}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedApproval?.trigger_type
                      ? `Trigger: ${String(selectedApproval.trigger_type).replace(/_/g, ' ').toLowerCase()}`
                      : 'Will start once the task is created'}
                  </div>
                  {selectedApproval?.deadline_value && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Deadline: {selectedApproval.deadline_value} {selectedApproval.deadline_type || 'hours'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null
        }
        destinationBadge={
          isReportingCategory && currentCategory && currentWorkspace ? (
            <div className="group relative">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shadow-md cursor-default whitespace-nowrap">
                <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-semibold">{currentWorkspace.name}</span>
              </div>
              {/* Tooltip on hover */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block">
                <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm min-w-[200px] max-w-[280px]">
                  <div className="font-semibold text-foreground mb-1">Destination Workspace</div>
                  <div className="text-xs text-muted-foreground">
                    Tasks created for this category will be assigned to the category's default workspace.
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
      />

      {/* Description */}
      {!showDescription ? (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 py-2"
        >
          <Plus className="w-4 h-4" />
          <span>{description.trim() ? t('taskDialog.showDescription', 'Show description') : t('taskDialog.addDescription', 'Add description')}</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-desc" className="text-sm font-medium font-[500] text-foreground">
              {t('taskDialog.description', 'Description')}
            </Label>
            <button
              type="button"
              onClick={() => {
                setShowDescription(false);
                if (!description.trim()) setDescription('');
              }}
              className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-1"
              aria-label="Hide description"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <Textarea 
            id="task-desc" 
            value={description} 
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim() && !showDescription) setShowDescription(true);
            }}
            placeholder={t('workspace.taskDialog.addDescription', 'Add a description for this task...')} 
            className="min-h-[120px] px-4 py-4 rounded-[12px] text-sm resize-y focus:border-primary focus:ring-[3px] focus:ring-ring transition-all duration-150" 
          />
        </div>
      )}

      {/* Location */}
      {spotsApplicable && (!selectedTemplate || !(selectedTemplate.spots_not_applicable === true || selectedTemplate.spots_not_applicable === 'true' || selectedTemplate.spots_not_applicable === 1 || selectedTemplate.spots_not_applicable === '1')) && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium font-[500] text-foreground">{t('taskDialog.location', 'Location')}</Label>
          <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
            <Combobox
              options={workspaceSpots.map((s: any) => ({
                value: String(s.id),
                label: s.name,
              }))}
              groupedOptions={spotGroupedOptions}
              favoriteValues={spotFavoriteValues}
              onFavoriteToggle={handleSpotToggleFavorite}
              value={spotId ? String(spotId) : undefined}
              onValueChange={(v) => setSpotId(v ? parseInt(v, 10) : null)}
              placeholder={workspaceSpots.length ? t('taskDialog.selectLocation', 'Select location') : t('taskDialog.noSpots', 'No spots')}
              searchPlaceholder={t('taskDialog.searchLocations', 'Search locations...')}
              emptyText={t('taskDialog.noLocationsFound', 'No locations found.')}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Responsible */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium font-[500] text-foreground">{t('taskDialog.responsible', 'Responsible')}</Label>
        <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
          <MultiSelectCombobox
            options={workspaceUsers.map((u: any) => ({
              value: String(u.id),
              label: u.name || u.email || `User ${u.id}`,
            }))}
            groupedOptions={userGroupedOptions}
            favoriteValues={userFavoriteValues}
            onFavoriteToggle={handleUserToggleFavorite}
            value={selectedUserIds.map((id: number) => String(id))}
            onValueChange={(values) => {
              setSelectedUserIds(values.map((v) => parseInt(v, 10)).filter((n) => Number.isFinite(n)));
            }}
            placeholder={t('taskDialog.selectUsers', 'Select users...')}
            searchPlaceholder={t('taskDialog.searchUsers', 'Search users...')}
            emptyText={t('taskDialog.noUsersFound', 'No users found.')}
            className="w-full"
          />
        </div>
      </div>

      {/* Asset */}
      {assetOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium font-[500] text-foreground">{t('taskDialog.asset', 'Asset')}</Label>
          <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
            <Combobox
              options={assetOptions}
              value={assetId ? String(assetId) : undefined}
              onValueChange={(v) => setAssetId?.(v ? parseInt(v, 10) : null)}
              placeholder={t('taskDialog.selectAsset', 'Select asset (optional)')}
              searchPlaceholder={t('taskDialog.searchAssets', 'Search assets...')}
              emptyText={t('taskDialog.noAssetsFound', 'No assets found.')}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Priority and Tags - Same line */}
      {(mode === 'create' || mode === 'edit') && tags ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium font-[500] text-foreground">{t('taskDialog.priority', 'Priority')}</Label>
            <Select value={priorityId ? String(priorityId) : ""} onValueChange={(v) => setPriorityId(v ? parseInt(v, 10) : null)}>
              <SelectTrigger className="h-10 px-4 border border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background">
                <SelectValue placeholder={categoryPriorities.length ? t('taskDialog.selectPriority', 'Select priority') : t('taskDialog.noPriorities', 'No priorities')} />
              </SelectTrigger>
              <SelectContent>
                {categoryPriorities.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium font-[500] text-foreground">Tags</Label>
            <div className="[&_button]:border [&_button]:border-border [&_button]:bg-background [&_button]:rounded-[10px] [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-all [&_button]:duration-150 [&_button:hover]:border-border/70 [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-[3px] [&_button]:focus-visible:ring-ring [&_button]:focus-visible:bg-background">
              <TagMultiSelect
                tags={tags}
                groupedOptions={tagGroupedOptions}
                favoriteIds={tagFavoriteIds}
                onFavoriteToggle={handleTagToggleFavorite}
                value={selectedTagIds || []}
                onValueChange={(values) => setSelectedTagIds?.(values)}
                placeholder="Select tags..."
                searchPlaceholder="Search tags..."
                emptyText="No tags found."
                className="w-full"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Priority only - full width when Tags not available */
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium font-[500] text-foreground">{t('taskDialog.priority', 'Priority')}</Label>
          <Select value={priorityId ? String(priorityId) : ""} onValueChange={(v) => setPriorityId(v ? parseInt(v, 10) : null)}>
            <SelectTrigger className="h-10 px-4 border border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background">
              <SelectValue placeholder={categoryPriorities.length ? t('taskDialog.selectPriority', 'Select priority') : t('taskDialog.noPriorities', 'No priorities')} />
            </SelectTrigger>
            <SelectContent>
              {categoryPriorities.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span>{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date and Recurrence Fields - Only shown when creating from scheduler */}
      {isFromScheduler && (
        <>
          {/* Start Date & Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="start" className="text-sm font-medium font-[500] text-foreground">
              {t("taskDialog.startDate", "Start Date")}
            </Label>
            <div className="flex gap-2">
              <Input 
                id="start" 
                type="date" 
                value={startDate || ''} 
                onChange={(e) => setStartDate?.(e.target.value)} 
                className="flex-1 h-10 px-4 border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background" 
              />
              <Input 
                id="start-time" 
                type="time" 
                value={startTime || ''} 
                onChange={(e) => setStartTime?.(e.target.value)} 
                className="w-32 h-10 px-4 border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background" 
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="due" className="text-sm font-medium font-[500] text-foreground">
              {t("taskDialog.dueDate", "Due Date")}
            </Label>
            <div className="flex gap-2">
              <Input 
                id="due" 
                type="date" 
                value={dueDate || ''} 
                onChange={(e) => setDueDate?.(e.target.value)} 
                className="flex-1 h-10 px-4 border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background" 
              />
              <Input 
                id="due-time" 
                type="time" 
                value={dueTime || ''} 
                onChange={(e) => setDueTime?.(e.target.value)} 
                className="w-32 h-10 px-4 border-border bg-background rounded-[10px] text-sm text-foreground transition-all duration-150 hover:border-border/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:bg-background" 
              />
            </div>
          </div>

          {/* Recurrence Section */}
          {recurrenceSettings && setRecurrenceSettings && (
            <div className="flex flex-col gap-3 pt-4 mt-3 border-t border-border/40 pb-3">
              {/* Recurrence Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium font-[500] text-foreground">
                    {t("recurrence.repeatTask") || "Repeat Task"}
                  </Label>
                </div>
                <Switch
                  checked={recurrenceSettings.enabled}
                  onCheckedChange={(enabled) => {
                    setRecurrenceSettings?.((prev: any) => ({
                      ...prev,
                      enabled,
                    }));
                  }}
                />
              </div>

              {/* Recurrence Editor - shown when enabled */}
              {recurrenceSettings.enabled && mode === 'create' && (
                <div className="pl-6 pb-2">
                  <RecurrenceEditor
                    initialRRule={recurrenceSettings.rrule}
                    dtstart={startDate && startTime 
                      ? `${startDate}T${startTime}:00` 
                      : startDate 
                        ? `${startDate}T09:00:00`
                        : undefined}
                    onChange={(rrule: string, humanReadable: string) => {
                      setRecurrenceSettings?.((prev: any) => ({
                        ...prev,
                        rrule,
                        humanReadable,
                      }));
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
