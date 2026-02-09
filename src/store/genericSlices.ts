import { combineReducers } from "@reduxjs/toolkit";
import { createGenericSlices } from "./genericSliceFactory";
import type { GenericSliceActions } from "./genericSliceFactory";

// Import all type interfaces
// Type imports kept for reference; not used directly in this file
// import { SpotCustomField, TemplateCustomField, TaskCustomFieldValue, SpotCustomFieldValue } from "./types";
// import { FormField, FormVersion, TaskForm, FieldOption } from "./types";
// import { SessionLog, ConfigLog, TaskAttachment, TaskRecurrence, Exception } from "./types";

// Configuration for all generic slices
const genericSliceConfigs = [
    // Custom Fields & Values
    { name: 'spotCustomFields', table: 'wh_spot_custom_fields', endpoint: '/spot-custom-fields', store: 'spot_custom_fields', hashFields: ['id','name','field_type','options','validation_rules','spot_type_id','is_required','default_value','updated_at'] },
    { name: 'templateCustomFields', table: 'wh_template_custom_field', endpoint: '/template-custom-fields', store: 'template_custom_fields', hashFields: ['id','field_id','template_id','is_required','order','default_value','updated_at'] },
    { name: 'taskCustomFieldValues', table: 'wh_task_custom_field_value', endpoint: '/task-custom-field-values', store: 'task_custom_field_values', hashFields: ['id','task_id','field_id','name','type','value','value_numeric','value_date','value_json','updated_at'] },
    { name: 'spotCustomFieldValues', table: 'wh_spot_custom_field_value', endpoint: '/spot-custom-field-values', store: 'spot_custom_field_values', hashFields: ['id','spot_id','field_id','name','type','value','value_numeric','value_date','value_json','updated_at'] },

    // Forms & Fields
    { name: 'forms', table: 'wh_forms', endpoint: '/forms', store: 'forms', hashFields: ['id','current_version_id','name','description','created_by','updated_at'] },
    { name: 'formFields', table: 'wh_form_fields', endpoint: '/form-fields', store: 'form_fields', hashFields: ['id','form_id','option_version_id','name','type','position','properties','is_required','validation_rules','display_rules','updated_at'] },
    { name: 'formVersions', table: 'wh_form_versions', endpoint: '/form-versions', store: 'form_versions', hashFields: ['id','form_id','version','fields','updated_at'] },
    { name: 'taskForms', table: 'wh_task_form', endpoint: '/task-forms', store: 'task_forms', hashFields: ['id','task_id','form_version_id','data','updated_at'] },
    { name: 'fieldOptions', table: 'wh_field_options', endpoint: '/field-options', store: 'field_options', hashFields: ['id','name','version','data','enabled','created_by','updated_at'] },

    // User Management
    { name: 'users', table: 'wh_users', endpoint: '/users', store: 'users', hashFields: ['id','google_uuid','name','email','role_id','job_position_id','spots','color','url_picture','organization_name','tenant_domain_prefix','stripe_id','is_admin','has_active_subscription','initialization_stage','updated_at'] },
  { name: 'userTeams', table: 'wh_user_team', endpoint: '/user-teams', store: 'user_teams', hashFields: ['id','user_id','team_id','role_id','updated_at'] },

    // Task Relations
    { name: 'taskUsers', table: 'wh_task_user', endpoint: '/task-users', store: 'task_users', hashFields: ['id','task_id','user_id','updated_at'] },
    { name: 'taskTags', table: 'wh_task_tag', endpoint: '/task-tags', store: 'task_tags', hashFields: ['id','task_id','tag_id','user_id','updated_at'] },
    { name: 'taskShares', table: 'wh_task_shares', endpoint: '/task-shares', store: 'task_shares', hashFields: ['id','task_id','shared_by_user_id','shared_to_user_id','shared_to_team_id','permission','revoked_at','updated_at'] },
    { name: 'taskLogs', table: 'wh_task_logs', endpoint: '/task-logs', store: 'task_logs', hashFields: ['id','uuid','task_id','user_id','action','old_values','new_values','updated_at'] },
    { name: 'statusTransitionLogs', table: 'wh_status_transition_logs', endpoint: '/status-transition-logs', store: 'status_transition_logs', hashFields: ['id','task_id','type','from_status','to_status','start','end','user_id','updated_at'] },

    // Reference Tables
    { name: 'statuses', table: 'wh_statuses', endpoint: '/statuses', store: 'statuses', hashFields: ['id','name','action','color','icon','system','initial','updated_at'] },
    { name: 'priorities', table: 'wh_priorities', endpoint: '/priorities', store: 'priorities', hashFields: ['id','name','color','category_id','updated_at'] },
    { name: 'spots', table: 'wh_spots', endpoint: '/spots', store: 'spots', hashFields: ['id','name','alias','parent_id','spot_type_id','is_branch','updated_at'] },
    { name: 'tags', table: 'wh_tags', endpoint: '/tags', store: 'tags', hashFields: ['id','name','color','icon','category_id','updated_at'] },
    { name: 'spotTypes', table: 'wh_spot_types', endpoint: '/spot-types', store: 'spot_types', hashFields: ['id','name','color','updated_at'] },
    { name: 'statusTransitions', table: 'wh_status_transitions', endpoint: '/status-transitions', store: 'status_transitions', hashFields: ['id','status_transition_group_id','from_status','to_status','initial','updated_at'] },
    { name: 'statusTransitionGroups', table: 'wh_status_transition_groups', endpoint: '/status-transition-groups', store: 'status_transition_groups', hashFields: ['id','name','description','is_default','is_active','updated_at'] },

    // Business Logic
    { name: 'slas', table: 'wh_slas', endpoint: '/slas', store: 'slas', hashFields: ['id','name', 'description', 'color', 'enabled', 'response_time','resolution_time','sla_policy_id','updated_at'] },
    { name: 'slaPolicies', table: 'wh_sla_policies', endpoint: '/sla-policies', store: 'sla_policies', hashFields: ['id','name','description','active','trigger_type','trigger_status_id','trigger_field_id','trigger_operator','trigger_value_text','trigger_value_number','trigger_value_boolean','grace_seconds','updated_at'] },
    { name: 'slaAlerts', table: 'wh_sla_alerts', endpoint: '/sla-alerts', store: 'sla_alerts', hashFields: ['id','sla_id','time','type','notify_to','updated_at'] },
    { name: 'slaEscalationLevels', table: 'wh_sla_escalation_levels', endpoint: '/sla-escalation-levels', store: 'sla_escalation_levels', hashFields: ['id','sla_id','phase','level','delay_seconds','action','target_type','target_id','priority_id','status_id','tag_id','notify_to','instructions','updated_at'] },
    { name: 'approvals', table: 'wh_approvals', endpoint: '/approvals', store: 'approvals', hashFields: ['id','name','description','approval_type','require_all','minimum_approvals','trigger_type','trigger_conditions','require_rejection_comment','block_editing_during_approval','deadline_type','deadline_value','order_index','is_active','on_approved_actions','on_rejected_actions','trigger_status_id','updated_at'] },
    { name: 'approvalApprovers', table: 'wh_approval_approvers', endpoint: '/approval-approvers', store: 'approval_approvers', hashFields: ['id','approval_id','approver_type','approver_id','scope','scope_id','required','order_index','created_by','updated_at'] },
    { name: 'taskApprovalInstances', table: 'wh_task_approval_instances', endpoint: '/task-approval-instances', store: 'task_approval_instances', hashFields: ['id','task_id','approver_user_id','source_approver_id','order_index','is_required','status','notified_at','responded_at','response_comment','updated_at'] },
    
    // Broadcasts & Acknowledgments
    { name: 'broadcasts', table: 'wh_broadcasts', endpoint: '/broadcasts', store: 'broadcasts', hashFields: ['id','title','message','priority','recipient_selection_type','total_recipients','total_acknowledged','due_date','status','created_by','workspace_id','updated_at'] },
    { name: 'broadcastAcknowledgments', table: 'wh_broadcast_acknowledgments', endpoint: '/broadcast-acknowledgments', store: 'broadcast_acknowledgments', hashFields: ['id','broadcast_id','user_id','status','acknowledged_at','notified_at','updated_at'] },
    { name: 'categoryPriorities', table: 'wh_category_priority', endpoint: '/category-priorities', store: 'category_priorities', hashFields: ['id','priority_id','category_id','sla_id','updated_at'] },
    { name: 'invitations', table: 'wh_invitations', endpoint: '/invitations', store: 'invitations', hashFields: ['id','invitation_token','user_email','team_ids','tenant_domain_prefix','updated_at'] },

    // Activity & Logging
    { name: 'sessionLogs', table: 'wh_session_logs', endpoint: '/session-logs', store: 'session_logs', hashFields: ['id','user_id','action_type','ip_address','user_agent','description','device_data','updated_at'] },
    { name: 'configLogs', table: 'wh_config_logs', endpoint: '/config-logs', store: 'config_logs', hashFields: ['id','entity_type','entity_id','action','old_values','new_values','updated_at'] },

    // File Management
    { name: 'taskAttachments', table: 'wh_task_attachments', endpoint: '/task-attachments', store: 'task_attachments', hashFields: ['id','uuid','task_id','type','file_path','file_name','file_extension','file_size','user_id','updated_at'] },
    { name: 'taskNotes', table: 'wh_task_notes', endpoint: '/task-notes', store: 'task_notes', hashFields: ['id','uuid','task_id','note','user_id','updated_at'] },
    { name: 'taskRecurrences', table: 'wh_task_recurrences', endpoint: '/task-recurrences', store: 'task_recurrences', hashFields: ['id','rrule','dtstart','duration_minutes','name','description','workspace_id','category_id','team_id','template_id','priority_id','status_id','user_ids','created_by','is_active','last_generated_at','count','occurrences_generated','custom_field_values','updated_at'] },
    { name: 'workspaceChat', table: 'wh_workspace_chat', endpoint: '/workspace-chat', store: 'workspace_chat', hashFields: ['id','uuid','workspace_id','message','user_id','updated_at'] },
    { name: 'workspaceResources', table: 'wh_workspace_resources', endpoint: '/workspace-resources', store: 'workspace_resources', hashFields: ['id','uuid','workspace_id','file_path','file_url','file_name','file_extension','file_size','user_id','folder','updated_at'] },

    // Error Tracking
    { name: 'exceptions', table: 'wh_exceptions', endpoint: '/exceptions', store: 'exceptions', hashFields: ['id','workspace_id','user_id','role_id','updated_at'] },

    // Core Entities (converted from custom to generic)
    { name: 'categories', table: 'wh_categories', endpoint: '/categories', store: 'categories', hashFields: ['id','name','description','color','icon','enabled','sla_id','team_id','workspace_id','reporting_team_ids','celebration_effect','dialog_layout','updated_at'] },
    { name: 'categoryCustomFields', table: 'wh_category_custom_field', endpoint: '/category-custom-fields', store: 'category_custom_fields', hashFields: ['id','field_id','category_id','is_required','order','default_value','updated_at'] },
    { name: 'customFields', table: 'wh_custom_fields', endpoint: '/custom-fields', store: 'custom_fields', hashFields: ['id','name','field_type','options','validation_rules','updated_at'] },
    { name: 'teams', table: 'wh_teams', endpoint: '/teams', store: 'teams', hashFields: ['id','name','description','color','icon','is_active','parent_team_id','team_lead_id','updated_at'] },
    { name: 'templates', table: 'wh_templates', endpoint: '/templates', store: 'templates', hashFields: ['id','name','alias','description','instructions','category_id','priority_id','sla_id','approval_id','default_spot_id','spots_not_applicable','expected_duration','default_user_ids','form_id','enabled','is_private','updated_at'] },
    { name: 'messages', table: 'wh_messages', endpoint: '/messages', store: 'messages', hashFields: ['id','title','content','workspace_id','team_id','spot_id','created_by','starts_at','ends_at','is_pinned','updated_at'] },
    { name: 'workflows', table: 'wh_workflows', endpoint: '/workflows', store: 'workflows', hashFields: ['id','name','description','workspace_id','is_active','current_version_id','created_by','updated_by','activated_at','updated_at'] },
    { name: 'workspaces', table: 'wh_workspaces', endpoint: '/workspaces', store: 'workspaces', hashFields: ['id','name','description','color','icon','teams','view_modes','allow_ad_hoc_tasks','type','category_id','spots','created_by','updated_at'] },

    // Boards (Communication Boards)
    { name: 'boards', table: 'wh_boards', endpoint: '/boards', store: 'boards', hashFields: ['id','name','description','visibility','birthday_messages_enabled','birthday_message_template','created_by','updated_at'] },
    { name: 'boardMembers', table: 'wh_board_members', endpoint: '/board-members', store: 'board_members', hashFields: ['id','board_id','member_type','member_id','role','updated_at'] },
    { name: 'boardMessages', table: 'wh_board_messages', endpoint: '/board-messages', store: 'board_messages', hashFields: ['id','board_id','created_by','title','content','is_pinned','starts_at','ends_at','metadata','source_type','source_id','updated_at'] },
    { name: 'boardAttachments', table: 'wh_board_attachments', endpoint: '/board-attachments', store: 'board_attachments', hashFields: ['id','uuid','board_message_id','type','file_path','file_name','file_extension','file_size','user_id','updated_at'] },
    { name: 'boardBirthdayImages', table: 'wh_board_birthday_images', endpoint: '/board-birthday-images', store: 'board_birthday_images', hashFields: ['id','board_id','file_path','file_name','uploaded_by','updated_at'] },

    // Job Positions
    { name: 'jobPositions', table: 'wh_job_positions', endpoint: '/job-positions', store: 'job_positions', hashFields: ['id','code','title','level','is_leadership','is_active','description','updated_at'] },

    // Compliance Module (hashFields match backend triggers exactly)
    { name: 'complianceStandards', table: 'wh_compliance_standards', endpoint: '/compliance-standards', store: 'compliance_standards', hashFields: ['id','name','code','version','description','authority','active','created_by','updated_at'] },
    { name: 'complianceRequirements', table: 'wh_compliance_requirements', endpoint: '/compliance-requirements', store: 'compliance_requirements', hashFields: ['id','standard_id','clause_number','title','description','implementation_guidance','mandatory','parent_id','updated_at'] },
    { name: 'complianceMappings', table: 'wh_compliance_mappings', endpoint: '/compliance-mappings', store: 'compliance_mappings', hashFields: ['id','requirement_id','mapped_entity_type','mapped_entity_id','justification','created_by','updated_at'] },
    { name: 'complianceAudits', table: 'wh_compliance_audits', endpoint: '/compliance-audits', store: 'compliance_audits', hashFields: ['id','standard_id','name','type','status','scheduled_start_date','scheduled_end_date','actual_start_date','completed_date','auditor_id','external_auditor_name','scope','summary_findings','score','created_by','updated_at'] },

    // Plugin System
    { name: 'plugins', table: 'wh_plugins', endpoint: '/plugins', store: 'plugins', hashFields: ['id','slug','name','description','version','is_enabled','updated_at'] },
    { name: 'pluginRoutes', table: 'wh_plugin_routes', endpoint: '/plugin-routes', store: 'plugin_routes', hashFields: ['id','plugin_id','method','path','controller','action','updated_at'] },
    
    // KPI Cards (Custom dashboard metrics)
    { name: 'kpiCards', table: 'wh_kpi_cards', endpoint: '/kpi-cards', store: 'kpi_cards', hashFields: ['id','name','type','query_config','display_config','position','is_enabled','updated_at'] },

    // Documents & Protocols
    { name: 'documents', table: 'wh_documents', endpoint: '/documents', store: 'documents', hashFields: ['id','uuid','workspace_id','title','description','document_type','file_path','file_url','file_name','file_extension','file_size','version','is_public','requires_acknowledgment','created_by','updated_at'] },
    { name: 'documentAssociations', table: 'wh_document_associations', endpoint: '/document-associations', store: 'document_associations', hashFields: ['id','document_id','associable_type','associable_id','inherit_to_children','updated_at'] },
    { name: 'documentAcknowledgments', table: 'wh_document_acknowledgments', endpoint: '/document-acknowledgments', store: 'document_acknowledgments', hashFields: ['id','document_id','user_id','acknowledged_at','ip_address','updated_at'] },

    // Working Hours Plugin
    { name: 'countryConfigs', table: 'wh_country_configs', endpoint: '/country-configs', store: 'country_configs', hashFields: ['id','country_code','country_name','default_weekly_hours','max_daily_hours','min_break_after_hours','min_break_duration_minutes','overtime_threshold_daily','overtime_threshold_weekly','settings','is_active','updated_at'] },
    { name: 'overtimeRules', table: 'wh_overtime_rules', endpoint: '/overtime-rules', store: 'overtime_rules', hashFields: ['id','name','description','country_config_id','daily_threshold_hours','weekly_threshold_hours','require_approval','max_overtime_daily','max_overtime_weekly','is_active','updated_at'] },
    { name: 'overtimeMultipliers', table: 'wh_overtime_multipliers', endpoint: '/overtime-multipliers', store: 'overtime_multipliers', hashFields: ['id','overtime_rule_id','multiplier_type','threshold_hours','multiplier','priority','is_active','updated_at'] },
    { name: 'holidayCalendars', table: 'wh_holiday_calendars', endpoint: '/holiday-calendars', store: 'holiday_calendars', hashFields: ['id','name','country_config_id','region_code','calendar_year','source','last_synced_at','is_active','updated_at'] },
    { name: 'holidays', table: 'wh_holidays', endpoint: '/holidays', store: 'holidays', hashFields: ['id','holiday_calendar_id','name','description','date','holiday_type','is_half_day','is_recurring','affects_overtime','is_active','updated_at'] },
    { name: 'workingSchedules', table: 'wh_working_schedules', endpoint: '/working-schedules', store: 'working_schedules', hashFields: ['id','name','description','schedule_type','weekly_hours','country_config_id','holiday_calendar_id','overtime_rule_id','is_default','is_active','created_by','updated_at'] },
    { name: 'scheduleAssignments', table: 'wh_schedule_assignments', endpoint: '/schedule-assignments', store: 'schedule_assignments', hashFields: ['id','working_schedule_id','assignable_type','assignable_id','priority','effective_from','effective_to','is_active','created_by','updated_at'] },
    { name: 'timeOffTypes', table: 'wh_time_off_types', endpoint: '/time-off-types', store: 'time_off_types', hashFields: ['id','name','code','description','color','requires_approval','approval_id','max_days_per_year','is_paid','is_active','updated_at'] },
    { name: 'timeOffRequests', table: 'wh_time_off_requests', endpoint: '/time-off-requests', store: 'time_off_requests', hashFields: ['id','user_id','time_off_type_id','start_date','end_date','start_half_day','end_half_day','total_days','reason','status','approved_by','approved_at','rejection_reason','created_by','updated_at'] },
    { name: 'timeOffApprovalInstances', table: 'wh_time_off_approval_instances', endpoint: '/time-off-approval-instances', store: 'time_off_approval_instances', hashFields: ['id','time_off_request_id','approval_id','approver_user_id','source_approver_id','order_index','is_required','status','notified_at','responded_at','response_comment','updated_at'] },
    { name: 'timeOffApprovalDecisions', table: 'wh_time_off_approval_decisions', endpoint: '/time-off-approval-decisions', store: 'time_off_approval_decisions', hashFields: ['id','time_off_request_id','approval_id','approver_user_id','decided_by_user_id','decision','comment','updated_at'] },

    // Asset Management Plugin
    { name: 'assetTypes', table: 'wh_asset_types', endpoint: '/asset-types', store: 'asset_types', hashFields: ['id','name','color','icon','updated_at'] },
    { name: 'assetItems', table: 'wh_asset_items', endpoint: '/asset-items', store: 'asset_items', hashFields: ['id','name','parent_id','asset_type_id','spot_id','serial_number','model','manufacturer','purchase_date','purchase_cost','warranty_expiration','status','qr_code','notes','assigned_user_id','assigned_team_id','updated_at'] },
    { name: 'assetMaintenanceSchedules', table: 'wh_asset_maintenance_schedules', endpoint: '/asset-maintenance-schedules', store: 'asset_maintenance_schedules', hashFields: ['id','asset_item_id','title','description','frequency_value','frequency_unit','next_due_date','last_performed_at','workspace_id','category_id','assigned_team_id','is_active','updated_at'] },
    { name: 'assetMaintenanceLogs', table: 'wh_asset_maintenance_logs', endpoint: '/asset-maintenance-logs', store: 'asset_maintenance_logs', hashFields: ['id','asset_item_id','schedule_id','task_id','performed_by','performed_at','notes','cost','updated_at'] },
    { name: 'assetCustomFields', table: 'wh_asset_custom_fields', endpoint: '/asset-custom-fields', store: 'asset_custom_fields', hashFields: ['id','name','field_type','options','validation_rules','asset_type_id','is_required','default_value','sort_order','updated_at'] },
    { name: 'assetCustomFieldValues', table: 'wh_asset_custom_field_values', endpoint: '/asset-custom-field-values', store: 'asset_custom_field_values', hashFields: ['id','asset_item_id','field_id','name','type','value','value_numeric','value_date','value_json','updated_at'] },

    // QR Code Plugin
    { name: 'qrCodes', table: 'wh_qr_codes', endpoint: '/qr-codes', store: 'qr_codes', hashFields: ['id','uuid','entity_type','entity_id','action','content_format','is_active','is_public','updated_at'] },
    { name: 'qrScanLogs', table: 'wh_qr_scan_logs', endpoint: '/qr-scan-logs', store: 'qr_scan_logs', hashFields: ['id','qr_code_id','user_id','ip_address','scanned_at'] },

    // Notifications (client-side only, no backend table)
    { name: 'notifications', table: '', endpoint: '', store: 'notifications', hashFields: [] },
];

// Create all generic slices at once
export const genericSlices = createGenericSlices(genericSliceConfigs);

// Export individual slices for easy access
export const {
    spotCustomFields,
    templateCustomFields,
    taskCustomFieldValues,
    spotCustomFieldValues,
    forms,
    formFields,
    formVersions,
    taskForms,
    fieldOptions,
    users,
    userTeams,
    taskUsers,
    taskTags,
    taskShares,
    taskLogs,
    statusTransitionLogs,
    statuses,
    priorities,
    spots,
    tags,
    spotTypes,
    statusTransitions,
    statusTransitionGroups,
    slas,
    slaPolicies,
    slaAlerts,
    slaEscalationLevels,
    approvals,
    approvalApprovers,
    taskApprovalInstances,
    broadcasts,
    broadcastAcknowledgments,
    categoryPriorities,
    invitations,
    sessionLogs,
    configLogs,
    taskAttachments,
    taskNotes,
    taskRecurrences,
    workspaceChat,
    workspaceResources,
    exceptions,
    // Core entities (converted from custom)
    categories,
    categoryCustomFields,
    customFields,
    teams,
    templates,
    messages,
    workflows,
    workspaces,
    // Boards
    boards,
    boardMembers,
    boardMessages,
    boardAttachments,
    boardBirthdayImages,
    jobPositions,
    // Documents & Protocols
    documents,
    documentAssociations,
    documentAcknowledgments,
    complianceStandards,
    complianceRequirements,
    complianceMappings,
    complianceAudits,
    plugins,
    pluginRoutes,
    kpiCards,
    // Working Hours Plugin
    countryConfigs,
    overtimeRules,
    overtimeMultipliers,
    holidayCalendars,
    holidays,
    workingSchedules,
    scheduleAssignments,
    timeOffTypes,
    timeOffRequests,
    // Asset Management Plugin
    assetTypes,
    assetItems,
    assetMaintenanceSchedules,
    assetMaintenanceLogs,
    assetCustomFields,
    assetCustomFieldValues,
    // QR Code Plugin
    qrCodes,
    qrScanLogs,
    notifications,
} = genericSlices.slices;

// Export individual caches for CacheRegistry
export const genericCaches = genericSlices.caches;

// Combine all reducers
export const genericReducers = combineReducers(genericSlices.reducers);

// Export event system for generic slices
export { GenericEvents as genericEvents } from './genericSliceFactory';

// Export event names for each slice
export const genericEventNames = {
    spotCustomFields: genericSlices.slices.spotCustomFields.eventNames,
    templateCustomFields: genericSlices.slices.templateCustomFields.eventNames,
    taskCustomFieldValues: genericSlices.slices.taskCustomFieldValues.eventNames,
    spotCustomFieldValues: genericSlices.slices.spotCustomFieldValues.eventNames,
    forms: genericSlices.slices.forms.eventNames,
    formFields: genericSlices.slices.formFields.eventNames,
    formVersions: genericSlices.slices.formVersions.eventNames,
    taskForms: genericSlices.slices.taskForms.eventNames,
    fieldOptions: genericSlices.slices.fieldOptions.eventNames,
    users: genericSlices.slices.users.eventNames,
    userTeams: genericSlices.slices.userTeams.eventNames,
    taskUsers: genericSlices.slices.taskUsers.eventNames,
    taskTags: genericSlices.slices.taskTags.eventNames,
    taskShares: genericSlices.slices.taskShares.eventNames,
    taskLogs: genericSlices.slices.taskLogs.eventNames,
    statusTransitionLogs: genericSlices.slices.statusTransitionLogs.eventNames,
    statuses: genericSlices.slices.statuses.eventNames,
    priorities: genericSlices.slices.priorities.eventNames,
    spots: genericSlices.slices.spots.eventNames,
    tags: genericSlices.slices.tags.eventNames,
    spotTypes: genericSlices.slices.spotTypes.eventNames,
    statusTransitions: genericSlices.slices.statusTransitions.eventNames,
    statusTransitionGroups: genericSlices.slices.statusTransitionGroups.eventNames,
    slas: genericSlices.slices.slas.eventNames,
    slaPolicies: genericSlices.slices.slaPolicies.eventNames,
    slaAlerts: genericSlices.slices.slaAlerts.eventNames,
    slaEscalationLevels: genericSlices.slices.slaEscalationLevels.eventNames,
    approvals: genericSlices.slices.approvals.eventNames,
    approvalApprovers: genericSlices.slices.approvalApprovers.eventNames,
    taskApprovalInstances: genericSlices.slices.taskApprovalInstances.eventNames,
    broadcasts: genericSlices.slices.broadcasts.eventNames,
    broadcastAcknowledgments: genericSlices.slices.broadcastAcknowledgments.eventNames,
    categoryPriorities: genericSlices.slices.categoryPriorities.eventNames,
    invitations: genericSlices.slices.invitations.eventNames,
    sessionLogs: genericSlices.slices.sessionLogs.eventNames,
    configLogs: genericSlices.slices.configLogs.eventNames,
    taskAttachments: genericSlices.slices.taskAttachments.eventNames,
    taskNotes: genericSlices.slices.taskNotes.eventNames,
    taskRecurrences: genericSlices.slices.taskRecurrences.eventNames,
    workspaceChat: genericSlices.slices.workspaceChat.eventNames,
    workspaceResources: genericSlices.slices.workspaceResources.eventNames,
    exceptions: genericSlices.slices.exceptions.eventNames,
    // Core entities (converted from custom)
    categories: genericSlices.slices.categories.eventNames,
    categoryCustomFields: genericSlices.slices.categoryCustomFields.eventNames,
    customFields: genericSlices.slices.customFields.eventNames,
    teams: genericSlices.slices.teams.eventNames,
    templates: genericSlices.slices.templates.eventNames,
    messages: genericSlices.slices.messages.eventNames,
    workflows: genericSlices.slices.workflows.eventNames,
    workspaces: genericSlices.slices.workspaces.eventNames,
    // Boards
    boards: genericSlices.slices.boards.eventNames,
    boardMembers: genericSlices.slices.boardMembers.eventNames,
    boardMessages: genericSlices.slices.boardMessages.eventNames,
    boardAttachments: genericSlices.slices.boardAttachments.eventNames,
    boardBirthdayImages: genericSlices.slices.boardBirthdayImages.eventNames,
    jobPositions: genericSlices.slices.jobPositions.eventNames,
    // Documents & Protocols
    documents: genericSlices.slices.documents.eventNames,
    documentAssociations: genericSlices.slices.documentAssociations.eventNames,
    documentAcknowledgments: genericSlices.slices.documentAcknowledgments.eventNames,
    complianceStandards: genericSlices.slices.complianceStandards.eventNames,
    complianceRequirements: genericSlices.slices.complianceRequirements.eventNames,
    complianceMappings: genericSlices.slices.complianceMappings.eventNames,
    complianceAudits: genericSlices.slices.complianceAudits.eventNames,
    plugins: genericSlices.slices.plugins.eventNames,
    pluginRoutes: genericSlices.slices.pluginRoutes.eventNames,
    kpiCards: genericSlices.slices.kpiCards.eventNames,
    // Working Hours Plugin
    countryConfigs: genericSlices.slices.countryConfigs.eventNames,
    overtimeRules: genericSlices.slices.overtimeRules.eventNames,
    overtimeMultipliers: genericSlices.slices.overtimeMultipliers.eventNames,
    holidayCalendars: genericSlices.slices.holidayCalendars.eventNames,
    holidays: genericSlices.slices.holidays.eventNames,
    workingSchedules: genericSlices.slices.workingSchedules.eventNames,
    scheduleAssignments: genericSlices.slices.scheduleAssignments.eventNames,
    timeOffTypes: genericSlices.slices.timeOffTypes.eventNames,
    timeOffRequests: genericSlices.slices.timeOffRequests.eventNames,
    // Asset Management Plugin
    assetTypes: genericSlices.slices.assetTypes.eventNames,
    assetItems: genericSlices.slices.assetItems.eventNames,
    assetMaintenanceSchedules: genericSlices.slices.assetMaintenanceSchedules.eventNames,
    assetMaintenanceLogs: genericSlices.slices.assetMaintenanceLogs.eventNames,
    assetCustomFields: genericSlices.slices.assetCustomFields.eventNames,
    assetCustomFieldValues: genericSlices.slices.assetCustomFieldValues.eventNames,
    // QR Code Plugin
    qrCodes: genericSlices.slices.qrCodes.eventNames,
    qrScanLogs: genericSlices.slices.qrScanLogs.eventNames,
    notifications: genericSlices.slices.notifications.eventNames,
} as const;

// Export actions for each slice with proper typing
type PublicGenericSliceActions<T = any> = Omit<GenericSliceActions<T>, "getFromIndexedDB" | "fetchFromAPI">;

function publicActions<T>(actions: GenericSliceActions<T>): PublicGenericSliceActions<T> {
    const { getFromIndexedDB: _getFromIndexedDB, fetchFromAPI: _fetchFromAPI, ...rest } = actions as any;
    return rest;
}

/**
 * Internal-only actions (store layer).
 * Includes `getFromIndexedDB` and `fetchFromAPI` for login hydration/repair flows.
 */
export const genericInternalActions = {
    spotCustomFields: genericSlices.slices.spotCustomFields.actions,
    templateCustomFields: genericSlices.slices.templateCustomFields.actions,
    taskCustomFieldValues: genericSlices.slices.taskCustomFieldValues.actions,
    spotCustomFieldValues: genericSlices.slices.spotCustomFieldValues.actions,
    forms: genericSlices.slices.forms.actions,
    formFields: genericSlices.slices.formFields.actions,
    formVersions: genericSlices.slices.formVersions.actions,
    taskForms: genericSlices.slices.taskForms.actions,
    fieldOptions: genericSlices.slices.fieldOptions.actions,
    users: genericSlices.slices.users.actions,
    userTeams: genericSlices.slices.userTeams.actions,
    taskUsers: genericSlices.slices.taskUsers.actions,
    taskTags: genericSlices.slices.taskTags.actions,
    taskShares: genericSlices.slices.taskShares.actions,
    taskLogs: genericSlices.slices.taskLogs.actions,
    statusTransitionLogs: genericSlices.slices.statusTransitionLogs.actions,
    statuses: genericSlices.slices.statuses.actions,
    priorities: genericSlices.slices.priorities.actions,
    spots: genericSlices.slices.spots.actions,
    tags: genericSlices.slices.tags.actions,
    spotTypes: genericSlices.slices.spotTypes.actions,
    statusTransitions: genericSlices.slices.statusTransitions.actions,
    statusTransitionGroups: genericSlices.slices.statusTransitionGroups.actions,
    slas: genericSlices.slices.slas.actions,
    slaPolicies: genericSlices.slices.slaPolicies.actions,
    slaAlerts: genericSlices.slices.slaAlerts.actions,
    slaEscalationLevels: genericSlices.slices.slaEscalationLevels.actions,
    approvals: genericSlices.slices.approvals.actions,
    approvalApprovers: genericSlices.slices.approvalApprovers.actions,
    taskApprovalInstances: genericSlices.slices.taskApprovalInstances.actions,
    broadcasts: genericSlices.slices.broadcasts.actions,
    broadcastAcknowledgments: genericSlices.slices.broadcastAcknowledgments.actions,
    categoryPriorities: genericSlices.slices.categoryPriorities.actions,
    invitations: genericSlices.slices.invitations.actions,
    sessionLogs: genericSlices.slices.sessionLogs.actions,
    configLogs: genericSlices.slices.configLogs.actions,
    taskAttachments: genericSlices.slices.taskAttachments.actions,
    taskNotes: genericSlices.slices.taskNotes.actions,
    taskRecurrences: genericSlices.slices.taskRecurrences.actions,
    workspaceChat: genericSlices.slices.workspaceChat.actions,
    workspaceResources: genericSlices.slices.workspaceResources.actions,
    exceptions: genericSlices.slices.exceptions.actions,
    // Core entities (converted from custom)
    categories: genericSlices.slices.categories.actions,
    categoryCustomFields: genericSlices.slices.categoryCustomFields.actions,
    customFields: genericSlices.slices.customFields.actions,
    teams: genericSlices.slices.teams.actions,
    templates: genericSlices.slices.templates.actions,
    messages: genericSlices.slices.messages.actions,
    workflows: genericSlices.slices.workflows.actions,
    workspaces: genericSlices.slices.workspaces.actions,
    // Boards
    boards: genericSlices.slices.boards.actions,
    boardMembers: genericSlices.slices.boardMembers.actions,
    boardMessages: genericSlices.slices.boardMessages.actions,
    boardAttachments: genericSlices.slices.boardAttachments.actions,
    boardBirthdayImages: genericSlices.slices.boardBirthdayImages.actions,
    jobPositions: genericSlices.slices.jobPositions.actions,
    // Documents & Protocols
    documents: genericSlices.slices.documents.actions,
    documentAssociations: genericSlices.slices.documentAssociations.actions,
    documentAcknowledgments: genericSlices.slices.documentAcknowledgments.actions,
    complianceStandards: genericSlices.slices.complianceStandards.actions,
    complianceRequirements: genericSlices.slices.complianceRequirements.actions,
    complianceMappings: genericSlices.slices.complianceMappings.actions,
    complianceAudits: genericSlices.slices.complianceAudits.actions,
    plugins: genericSlices.slices.plugins.actions,
    pluginRoutes: genericSlices.slices.pluginRoutes.actions,
    kpiCards: genericSlices.slices.kpiCards.actions,
    // Working Hours Plugin
    countryConfigs: genericSlices.slices.countryConfigs.actions,
    overtimeRules: genericSlices.slices.overtimeRules.actions,
    overtimeMultipliers: genericSlices.slices.overtimeMultipliers.actions,
    holidayCalendars: genericSlices.slices.holidayCalendars.actions,
    holidays: genericSlices.slices.holidays.actions,
    workingSchedules: genericSlices.slices.workingSchedules.actions,
    scheduleAssignments: genericSlices.slices.scheduleAssignments.actions,
    timeOffTypes: genericSlices.slices.timeOffTypes.actions,
    timeOffRequests: genericSlices.slices.timeOffRequests.actions,
    // Asset Management Plugin
    assetTypes: genericSlices.slices.assetTypes.actions,
    assetItems: genericSlices.slices.assetItems.actions,
    assetMaintenanceSchedules: genericSlices.slices.assetMaintenanceSchedules.actions,
    assetMaintenanceLogs: genericSlices.slices.assetMaintenanceLogs.actions,
    assetCustomFields: genericSlices.slices.assetCustomFields.actions,
    assetCustomFieldValues: genericSlices.slices.assetCustomFieldValues.actions,
    // QR Code Plugin
    qrCodes: genericSlices.slices.qrCodes.actions,
    qrScanLogs: genericSlices.slices.qrScanLogs.actions,
    notifications: genericSlices.slices.notifications.actions,
} as const;

/**
 * Public actions (UI layer).
 * Intentionally excludes `getFromIndexedDB` and `fetchFromAPI` to prevent ad-hoc hydration/fetching.
 */
export const genericActions = {
    spotCustomFields: publicActions(genericInternalActions.spotCustomFields),
    templateCustomFields: publicActions(genericInternalActions.templateCustomFields),
    taskCustomFieldValues: publicActions(genericInternalActions.taskCustomFieldValues),
    spotCustomFieldValues: publicActions(genericInternalActions.spotCustomFieldValues),
    forms: publicActions(genericInternalActions.forms),
    formFields: publicActions(genericInternalActions.formFields),
    formVersions: publicActions(genericInternalActions.formVersions),
    taskForms: publicActions(genericInternalActions.taskForms),
    fieldOptions: publicActions(genericInternalActions.fieldOptions),
    users: publicActions(genericInternalActions.users),
    userTeams: publicActions(genericInternalActions.userTeams),
    taskUsers: publicActions(genericInternalActions.taskUsers),
    taskTags: publicActions(genericInternalActions.taskTags),
    taskShares: publicActions(genericInternalActions.taskShares),
    taskLogs: publicActions(genericInternalActions.taskLogs),
    statusTransitionLogs: publicActions(genericInternalActions.statusTransitionLogs),
    statuses: publicActions(genericInternalActions.statuses),
    priorities: publicActions(genericInternalActions.priorities),
    spots: publicActions(genericInternalActions.spots),
    tags: publicActions(genericInternalActions.tags),
    spotTypes: publicActions(genericInternalActions.spotTypes),
    statusTransitions: publicActions(genericInternalActions.statusTransitions),
    statusTransitionGroups: publicActions(genericInternalActions.statusTransitionGroups),
    slas: publicActions(genericInternalActions.slas),
    slaPolicies: publicActions(genericInternalActions.slaPolicies),
    slaAlerts: publicActions(genericInternalActions.slaAlerts),
    slaEscalationLevels: publicActions(genericInternalActions.slaEscalationLevels),
    approvals: publicActions(genericInternalActions.approvals),
    approvalApprovers: publicActions(genericInternalActions.approvalApprovers),
    taskApprovalInstances: publicActions(genericInternalActions.taskApprovalInstances),
    broadcasts: publicActions(genericInternalActions.broadcasts),
    broadcastAcknowledgments: publicActions(genericInternalActions.broadcastAcknowledgments),
    categoryPriorities: publicActions(genericInternalActions.categoryPriorities),
    invitations: publicActions(genericInternalActions.invitations),
    sessionLogs: publicActions(genericInternalActions.sessionLogs),
    configLogs: publicActions(genericInternalActions.configLogs),
    taskAttachments: publicActions(genericInternalActions.taskAttachments),
    taskNotes: publicActions(genericInternalActions.taskNotes),
    taskRecurrences: publicActions(genericInternalActions.taskRecurrences),
    workspaceChat: publicActions(genericInternalActions.workspaceChat),
    workspaceResources: publicActions(genericInternalActions.workspaceResources),
    exceptions: publicActions(genericInternalActions.exceptions),
    // Core entities (converted from custom)
    categories: publicActions(genericInternalActions.categories),
    categoryCustomFields: publicActions(genericInternalActions.categoryCustomFields),
    customFields: publicActions(genericInternalActions.customFields),
    teams: publicActions(genericInternalActions.teams),
    templates: publicActions(genericInternalActions.templates),
    messages: publicActions(genericInternalActions.messages),
    workflows: publicActions(genericInternalActions.workflows),
    workspaces: publicActions(genericInternalActions.workspaces),
    // Boards
    boards: publicActions(genericInternalActions.boards),
    boardMembers: publicActions(genericInternalActions.boardMembers),
    boardMessages: publicActions(genericInternalActions.boardMessages),
    boardAttachments: publicActions(genericInternalActions.boardAttachments),
    boardBirthdayImages: publicActions(genericInternalActions.boardBirthdayImages),
    jobPositions: publicActions(genericInternalActions.jobPositions),
    // Documents & Protocols
    documents: publicActions(genericInternalActions.documents),
    documentAssociations: publicActions(genericInternalActions.documentAssociations),
    documentAcknowledgments: publicActions(genericInternalActions.documentAcknowledgments),
    complianceStandards: publicActions(genericInternalActions.complianceStandards),
    complianceRequirements: publicActions(genericInternalActions.complianceRequirements),
    complianceMappings: publicActions(genericInternalActions.complianceMappings),
    complianceAudits: publicActions(genericInternalActions.complianceAudits),
    plugins: publicActions(genericInternalActions.plugins),
    pluginRoutes: publicActions(genericInternalActions.pluginRoutes),
    kpiCards: publicActions(genericInternalActions.kpiCards),
    // Working Hours Plugin
    countryConfigs: publicActions(genericInternalActions.countryConfigs),
    overtimeRules: publicActions(genericInternalActions.overtimeRules),
    overtimeMultipliers: publicActions(genericInternalActions.overtimeMultipliers),
    holidayCalendars: publicActions(genericInternalActions.holidayCalendars),
    holidays: publicActions(genericInternalActions.holidays),
    workingSchedules: publicActions(genericInternalActions.workingSchedules),
    scheduleAssignments: publicActions(genericInternalActions.scheduleAssignments),
    timeOffTypes: publicActions(genericInternalActions.timeOffTypes),
    timeOffRequests: publicActions(genericInternalActions.timeOffRequests),
    // Asset Management Plugin
    assetTypes: publicActions(genericInternalActions.assetTypes),
    assetItems: publicActions(genericInternalActions.assetItems),
    assetMaintenanceSchedules: publicActions(genericInternalActions.assetMaintenanceSchedules),
    assetMaintenanceLogs: publicActions(genericInternalActions.assetMaintenanceLogs),
    assetCustomFields: publicActions(genericInternalActions.assetCustomFields),
    assetCustomFieldValues: publicActions(genericInternalActions.assetCustomFieldValues),
    // QR Code Plugin
    qrCodes: publicActions(genericInternalActions.qrCodes),
    qrScanLogs: publicActions(genericInternalActions.qrScanLogs),
    notifications: publicActions(genericInternalActions.notifications),
} as const;
