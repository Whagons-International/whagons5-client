# TaskDialog Refactor Structure

**Goal**: Reduce TaskDialog.tsx from 2100 lines to ~300 lines by extracting logic into modules.

## Current Status

The refactoring is **substantially complete**. The monolithic TaskDialog has been decomposed into:
- 9 hooks for state, data, layout, and form logic
- 8 components for tabs and field rendering
- 2 utility modules for field parsing and serialization

## Folder Structure

```
taskDialog/
├── hooks/
│   ├── useDialogResize.ts          DONE - Resize logic
│   ├── useTaskFormState.ts         DONE - Form state management (all state/setters)
│   ├── useTaskDialogData.ts        DONE - Redux data selectors
│   ├── useTaskDialogComputed.ts    DONE - Derived/computed values
│   ├── useFormInitialization.ts    DONE - Form init logic for create/edit
│   ├── useCustomFieldSync.ts       DONE - Custom field server sync
│   ├── useShareHandlers.ts         DONE - Share action handlers
│   ├── useDialogLayout.ts          DONE - Category-aware dialog layout (295 lines)
│   └── index.ts                    DONE - Barrel export
├── components/
│   ├── BasicTab.tsx                DONE - Template, name, desc, location, users, priority, tags (743 lines)
│   ├── CustomFieldsTab.tsx         DONE - Custom fields tab (48 lines)
│   ├── AdditionalTab.tsx           DONE - Date & Timing / Recurrence (exports DateTimingTab, 200 lines)
│   ├── AdditionalInfoTab.tsx       DONE - SLA + Approval selects (56 lines)
│   ├── ShareTab.tsx                DONE - Task sharing UI (171 lines)
│   ├── CustomFieldInput.tsx        DONE - Individual custom field renderer
│   ├── DynamicTabContent.tsx       DONE - Dynamic layout-driven tab renderer (188 lines)
│   ├── fields/
│   │   ├── DynamicFieldRenderer.tsx DONE - Field renderer for dynamic layouts
│   │   └── index.ts               DONE - Barrel export
│   └── index.ts                    DONE - Barrel export
├── utils/
│   ├── fieldHelpers.ts             DONE - Field parsing utilities
│   └── customFieldSerialization.ts DONE - Serialize/deserialize
├── types.ts                        DONE - TaskDialogProps type
└── README.md                       THIS FILE

TaskDialogContent.tsx               DONE - Main component (802 lines)
```

## Tab Structure

The dialog has 5 tabs:

| Tab Value      | Label            | Component          | Condition                    | Contents                                       |
|----------------|------------------|--------------------|------------------------------|-------------------------------------------------|
| `basic`        | Basic Details    | BasicTab           | Always shown                 | Template, Name, Description, Location, Users, Priority, Tags |
| `customFields` | Fields           | CustomFieldsTab    | When category has fields     | Custom field inputs for selected category       |
| `dateTiming`   | Date & Timing    | DateTimingTab      | Hidden when from scheduler   | Start/due date/time, Recurrence                 |
| `additional`   | Additional Info  | AdditionalInfoTab  | Always shown                 | SLA dropdown, Approval dropdown                 |
| `share`        | Share            | ShareTab           | Edit mode only               | Existing shares, share with user/team           |

## Notes

- `AdditionalTab.tsx` exports `DateTimingTab` (handles dates/recurrence). The naming is historical.
- `AdditionalInfoTab.tsx` contains SLA and Approval selection (separate component).
- `useDialogLayout.ts` provides a dynamic layout system that can rearrange fields per-category.
- `DynamicTabContent.tsx` supports categories with custom `dialog_layout` configurations.

## Benefits

- Main component reduced from 2100 to 802 lines
- Logic is testable in isolation via hooks
- Easier to debug specific functionality
- Better code organization
- Reusable hooks and components
