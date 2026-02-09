import type { DialogLayout, DialogFieldConfig, DialogTabId, DialogTabConfig } from '@/store/types';
import type { CategoryCustomField, CustomField } from '@/store/types';
import { STANDARD_FIELDS, BUILT_IN_TABS } from './types';

/**
 * Default dialog layout configuration.
 * Used when a category has no custom layout.
 */
export const DEFAULT_DIALOG_LAYOUT: DialogLayout = {
    tabs: {
        basic: { enabled: true, order: 0, label: 'Basic Details', isCustom: false },
        dates: { enabled: true, order: 1, label: 'Date & Timing', isCustom: false },
        additional: { enabled: true, order: 2, label: 'Additional Info', isCustom: false },
    },
    fields: {
        basic: [
            { type: 'standard', id: 'template' },
            { type: 'standard', id: 'description' },
            { type: 'standard', id: 'spot' },
            { type: 'standard', id: 'responsible' },
            { type: 'standard', id: 'priority' },
            { type: 'standard', id: 'tags' },
        ],
        dates: [
            { type: 'standard', id: 'start_date' },
            { type: 'standard', id: 'due_date' },
            { type: 'standard', id: 'recurrence' },
        ],
        additional: [
            { type: 'standard', id: 'sla' },
            { type: 'standard', id: 'approval' },
        ],
    },
};

/**
 * Get the effective layout for a category, merging custom fields with layout.
 * If no layout is set, returns default layout with custom fields added.
 */
export function getEffectiveLayout(
    categoryLayout: DialogLayout | null | undefined,
    categoryCustomFields: CategoryCustomField[],
    customFieldsMap: Map<number, CustomField>
): DialogLayout {
    // Start with the category's layout or the default
    const baseLayout = categoryLayout ?? { ...DEFAULT_DIALOG_LAYOUT };
    
    // Merge tabs: preserve custom tabs while ensuring built-in tabs have defaults
    const mergedTabs = {
        ...DEFAULT_DIALOG_LAYOUT.tabs,
        ...baseLayout.tabs,
        // Ensure built-in tabs have defaults if missing
        basic: baseLayout.tabs?.basic ?? DEFAULT_DIALOG_LAYOUT.tabs.basic,
        dates: baseLayout.tabs?.dates ?? DEFAULT_DIALOG_LAYOUT.tabs.dates,
        additional: baseLayout.tabs?.additional ?? DEFAULT_DIALOG_LAYOUT.tabs.additional,
    };
    
    // Merge fields: preserve custom field keys while ensuring built-in fields have defaults
    const mergedFields = {
        ...DEFAULT_DIALOG_LAYOUT.fields,
        ...baseLayout.fields,
    };
    
    // Deep-copy arrays for each field key to avoid mutation
    const clonedFields: DialogLayout['fields'] = {};
    for (const key of Object.keys(mergedFields)) {
        const fieldArray = mergedFields[key];
        clonedFields[key] = fieldArray ? [...fieldArray] : undefined;
    }
    
    // Ensure built-in field arrays exist with defaults if missing
    if (!clonedFields.basic) {
        clonedFields.basic = [...(DEFAULT_DIALOG_LAYOUT.fields.basic ?? [])];
    }
    if (!clonedFields.dates) {
        clonedFields.dates = [...(DEFAULT_DIALOG_LAYOUT.fields.dates ?? [])];
    }
    if (!clonedFields.additional) {
        clonedFields.additional = [...(DEFAULT_DIALOG_LAYOUT.fields.additional ?? [])];
    }
    
    const layout: DialogLayout = {
        tabs: mergedTabs,
        fields: clonedFields,
    };

    // Get all custom field IDs currently in the layout
    const customFieldIdsInLayout = new Set<number>();
    for (const tabId of Object.keys(layout.fields) as DialogTabId[]) {
        const fields = layout.fields[tabId] ?? [];
        for (const field of fields) {
            if (field.type === 'custom' && typeof field.id === 'number') {
                customFieldIdsInLayout.add(field.id);
            }
        }
    }

    // Sort category custom fields by order
    const sortedAssignments = [...categoryCustomFields].sort((a, b) => 
        (a.order ?? 0) - (b.order ?? 0)
    );

    // Add any missing custom fields to the 'basic' tab (or wherever makes sense)
    // These are custom fields assigned to the category but not yet in the layout
    for (const assignment of sortedAssignments) {
        if (!customFieldIdsInLayout.has(assignment.field_id)) {
            // Field not in layout, add it to basic tab by default
            if (!layout.fields.basic) {
                layout.fields.basic = [];
            }
            layout.fields.basic.push({ type: 'custom', id: assignment.field_id });
            customFieldIdsInLayout.add(assignment.field_id);
        }
    }

    // Remove custom fields from layout that are no longer assigned to the category
    const assignedFieldIds = new Set(categoryCustomFields.map(a => a.field_id));
    for (const tabId of Object.keys(layout.fields) as DialogTabId[]) {
        const fields = layout.fields[tabId];
        if (fields) {
            layout.fields[tabId] = fields.filter(field => {
                if (field.type === 'custom' && typeof field.id === 'number') {
                    return assignedFieldIds.has(field.id);
                }
                return true; // Keep standard fields
            });
        }
    }

    return layout;
}

/**
 * Create an empty layout with all standard fields in their default positions.
 * Used as a starting point when creating a new custom layout.
 */
export function createDefaultLayout(): DialogLayout {
    return JSON.parse(JSON.stringify(DEFAULT_DIALOG_LAYOUT));
}

/**
 * Check if a layout differs from the default.
 */
export function isCustomLayout(layout: DialogLayout | null | undefined): boolean {
    if (!layout) return false;
    return JSON.stringify(layout) !== JSON.stringify(DEFAULT_DIALOG_LAYOUT);
}

/**
 * Get fields for a specific tab, sorted by their order in the layout.
 */
export function getFieldsForTab(
    layout: DialogLayout,
    tabId: DialogTabId
): DialogFieldConfig[] {
    return layout.fields[tabId] ?? [];
}

/**
 * Get enabled tabs sorted by order.
 */
export function getSortedTabs(layout: DialogLayout): DialogTabId[] {
    const tabs = Object.entries(layout.tabs ?? {})
        .filter(([_, config]) => config?.enabled !== false)
        .sort((a, b) => (a[1]?.order ?? 0) - (b[1]?.order ?? 0))
        .map(([id]) => id as DialogTabId);
    
    // Ensure at least basic tab is present
    if (tabs.length === 0) {
        return ['basic'];
    }
    
    return tabs;
}
