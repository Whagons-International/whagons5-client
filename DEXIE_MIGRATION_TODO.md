# Dexie Migration TODO

This document tracks all files that still need to be migrated from Redux/TasksCache to Dexie.

## Build Status: PASSING

The build succeeds but there are runtime issues to fix. Files still reference:
- `useSelector` / `useDispatch` (no longer available - Redux was uninstalled)
- `genericActions` / `genericInternalActions` / `genericCaches` (deleted)
- `RootState` / `AppDispatch` (deleted)
- `TasksCache` (moved to Dexie)

## Migration Patterns

### Replace useSelector with useLiveQuery/useTable

```typescript
// BEFORE (Redux):
const statuses = useSelector((s: RootState) => s.statuses.value);

// AFTER (Dexie):
import { useTable } from '@/store/dexie';
const statuses = useTable('statuses');

// OR with useLiveQuery for custom queries:
import { useLiveQuery, db } from '@/store/dexie';
const statuses = useLiveQuery(() => db.table('statuses').toArray(), []);
```

### Replace genericActions.X.addAsync with collections.X.add

```typescript
// BEFORE:
await dispatch(genericActions.statuses.addAsync(data)).unwrap();

// AFTER:
import { collections } from '@/store/dexie';
await collections.statuses.add(data);
```

### Replace TasksCache.queryTasks with queryTasks

```typescript
// BEFORE:
import { TasksCache } from '@/store/indexedDB/TasksCache';
const result = await TasksCache.queryTasks({ workspace_id: 1 });

// AFTER:
import { queryTasks } from '@/store/dexie';
const result = await queryTasks({ workspace_id: 1 });
```

---

## HIGH PRIORITY - Core Components (breaks UI)

### Components
- [ ] `src/components/Header.tsx` - useSelector x6, dispatch x10+, genericInternalActions
- [ ] `src/components/AppSidebar.tsx` - useSelector x2, genericActions
- [ ] `src/components/AppSidebarBoards.tsx` - useDispatch, genericActions
- [ ] `src/components/AppSidebarWorkspaces.tsx` - TasksCache, TaskEvents
- [ ] `src/components/ActiveFilterChips.tsx` - useSelector x5
- [ ] `src/components/tasks/TaskShareManager.tsx` - useDispatch, useSelector x2, genericActions
- [ ] `src/components/TaskList/StatusInfoPopover.tsx` - TasksCache

### Hooks
- [ ] `src/hooks/usePluginEnabled.ts` - useSelector

---

## MEDIUM PRIORITY - Settings Pages

### Settings Components
- [ ] `src/pages/settings/components/useSettingsState.tsx` - useDispatch, useSelector, genericActions (CRITICAL - used by many settings pages)
- [ ] `src/pages/settings/components/CategoryFieldsManager.tsx` - useDispatch, useSelector x2, genericActions
- [ ] `src/pages/settings/components/ApprovalApproversManager.tsx` - useDispatch, useSelector x4, genericActions

### Settings Sub-Pages
- [ ] `src/pages/settings/sub_pages/approvals/Approvals.tsx` - useSelector x10
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/ActionEditor.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/ApprovalActionsDialog.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/ApprovalActionsManager.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/config-forms/BoardMessageConfigForm.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/config-forms/StatusConfigForm.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/approvals/components/actions/config-forms/TagsConfigForm.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/boards/Boards.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/forms/Forms.tsx` - useSelector, useDispatch, genericActions
- [ ] `src/pages/settings/sub_pages/job-positions/JobPositions.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/kpi-cards-manage/KpiCardsManage.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/kpi/KpiCardBuilder.tsx` - useSelector x3
- [ ] `src/pages/settings/sub_pages/priorities/Priorities.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/roles-and-permissions/RolesAndPermissions.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/slas/Slas.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/spots/Spots.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/statuses/Statuses.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/tags/Tags.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/teams/Teams.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/teams/hooks/useTeamUserAssignments.ts` - genericActions
- [ ] `src/pages/settings/sub_pages/Teams.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/templates/Templates.tsx` - useSelector
- [ ] `src/pages/settings/sub_pages/templates/hooks/useTemplateForm.ts` - genericActions
- [ ] `src/pages/settings/sub_pages/Templates.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/users/components/UsersPage.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/workflows/Workflows.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/working-hours/WorkingSchedules.tsx` - genericActions
- [ ] `src/pages/settings/sub_pages/workspaces/Workspaces.tsx` - useSelector
- [ ] `src/pages/settings/Settings.tsx` - useSelector
- [ ] `src/pages/settings/NotificationPreferences.tsx` - useSelector

---

## MEDIUM PRIORITY - Workspace/Tasks

### Workspace Hooks
- [ ] `src/pages/spaces/workspace/hooks/useWorkspaceFilters.ts` - useSelector
- [ ] `src/pages/spaces/workspace/hooks/useWorkspaceTaskActions.tsx` - useSelector
- [ ] `src/pages/spaces/workspace/hooks/useWorkspaceDragDrop.ts` - useDispatch
- [ ] `src/pages/spaces/workspace/hooks/useTaskCompletionToast.tsx` - useSelector
- [ ] `src/pages/spaces/workspace/hooks/useWorkspaceKpiCards.tsx` - TasksCache
- [ ] `src/pages/spaces/Workspace.tsx` - useSelector

### Workspace Table
- [ ] `src/pages/spaces/components/workspaceTable/grid/gridState.ts` - useSelector, TasksCache
- [ ] `src/pages/spaces/components/workspaceTable/grid/dataSource.ts` - TasksCache
- [ ] `src/pages/spaces/components/workspaceTable/hooks/useStatusChange.ts` - useDispatch
- [ ] `src/pages/spaces/components/workspaceTable/hooks/useTaskDeletion.tsx` - useDispatch
- [ ] `src/pages/spaces/components/workspaceTable/hooks/useWorkspaceChange.ts` - TasksCache
- [ ] `src/pages/spaces/components/workspaceTable/hooks/useGridRefresh.ts` - TasksCache

### Task Dialog
- [ ] `src/pages/spaces/components/taskDialog/TaskDialogContent.tsx` - useSelector, genericActions
- [ ] `src/pages/spaces/components/taskDialog/hooks/useCustomFieldSync.ts` - genericActions
- [ ] `src/pages/spaces/components/taskDialog/hooks/useTaskDialogData.ts` - useSelector
- [ ] `src/pages/spaces/components/taskDialog/hooks/useTaskSubmit.ts` - genericActions

### Other Workspace Components
- [ ] `src/pages/spaces/components/kanban/KanbanBoard.tsx` - useSelector, useDispatch
- [ ] `src/pages/spaces/components/kanban/KanbanCard.tsx` - useSelector
- [ ] `src/pages/spaces/components/TaskListTab.tsx` - useSelector
- [ ] `src/pages/spaces/components/TaskNotesModal.tsx` - genericActions
- [ ] `src/pages/spaces/components/formFillDialog/FormFillDialog.tsx` - genericActions
- [ ] `src/pages/spaces/components/ChatTab.tsx` - genericActions
- [ ] `src/pages/spaces/components/ResourcesTab.tsx` - genericActions
- [ ] `src/pages/spaces/components/UsersTab.tsx` - useSelector
- [ ] `src/pages/spaces/components/WhiteboardViewTab.tsx` - useSelector, useDispatch
- [ ] `src/pages/spaces/components/WorkspaceStatistics.tsx` - useSelector (already partially migrated)

---

## MEDIUM PRIORITY - Other Pages

### Home & Onboarding
- [ ] `src/pages/home/Home.tsx` - useSelector x5
- [ ] `src/pages/onboarding/OnboardingWrapper.tsx` - useDispatch, TasksCache
- [ ] `src/pages/onboarding/steps/OrganizationNameStep.tsx` - useDispatch, useSelector

### Boards
- [ ] `src/pages/boards/Boards.tsx` - useSelector, genericActions
- [ ] `src/pages/boards/BoardDetail.tsx` - useSelector, genericActions
- [ ] `src/pages/boards/components/PostComposer.tsx` - genericActions
- [ ] `src/pages/boards/components/PostItem.tsx` - useSelector
- [ ] `src/pages/boards/components/BirthdayImagesManager.tsx` - genericActions

### Broadcasts
- [ ] `src/pages/broadcasts/BroadcastsPage.tsx` - useSelector
- [ ] `src/pages/broadcasts/BroadcastDetailView.tsx` - useSelector
- [ ] `src/pages/broadcasts/CreateBroadcastDialog.tsx` - genericActions
- [ ] `src/pages/broadcasts/PendingAcknowledgmentsWidget.tsx` - useSelector

### Other
- [ ] `src/pages/activity/ActivityMonitor.tsx` - useSelector, genericActions
- [ ] `src/pages/compliance/ComplianceStandards.tsx` - useSelector, genericActions
- [ ] `src/pages/compliance/ComplianceStandardDetail.tsx` - useSelector
- [ ] `src/pages/profile/Profile.tsx` - useDispatch, useSelector x4
- [ ] `src/pages/Plugins.tsx` - useSelector
- [ ] `src/pages/time-off/TimeOffRequests.tsx` - genericActions

---

## LOW PRIORITY - Features

### Scheduler
- [ ] `src/features/scheduler/SchedulerViewTab.tsx` - useSelector, genericActions, TasksCache
- [ ] `src/features/scheduler/hooks/useSchedulerData.ts` - useSelector
- [ ] `src/features/scheduler-legacy/SchedulerViewTab.tsx` - useSelector, TasksCache
- [ ] `src/features/scheduler-legacy/hooks/useSchedulerData.ts` - useSelector

### AI Chat Actions
- [ ] `src/features/ai-chat/hooks/useUserContext.ts` - useSelector
- [ ] `src/features/ai-chat/actions/createKpi.ts` - genericActions
- [ ] `src/features/ai-chat/actions/deleteKpi.ts` - genericActions
- [ ] `src/features/ai-chat/actions/updateKpi.ts` - genericActions

---

## Services
- [ ] `src/services/kpiCardService.ts` - TasksCache

---

## Summary

| Category | Files | Status |
|----------|-------|--------|
| Core Components | 7 | Not Started |
| Settings Pages | 30 | Not Started |
| Workspace/Tasks | 22 | Partially Done |
| Other Pages | 15 | Not Started |
| Features | 8 | Not Started |
| Services | 1 | Not Started |
| **TOTAL** | **83** | ~2% Complete |

## Quick Reference: Dexie API

```typescript
// Import from dexie module
import { 
  db,                    // Dexie database instance
  useLiveQuery,          // React hook for reactive queries
  collections,           // CRUD operations (collections.tasks.add/update/delete)
  queryTasks,            // Task-specific queries with filters/sort/pagination
  useTable,              // Simple hook: useTable('statuses') 
  useTableWhere,         // Filter hook: useTableWhere('tasks', 'workspace_id', 1)
  useTableGet,           // Single item: useTableGet('tasks', taskId)
} from '@/store/dexie';
```

## Notes

1. **Build passes** - The app compiles but will have runtime errors until migration is complete
2. **Prioritize Header.tsx** - Most critical for basic navigation
3. **useSettingsState.tsx is a multiplier** - Fixing this fixes many settings pages
4. **TasksCache → queryTasks** - Direct replacement with same API
