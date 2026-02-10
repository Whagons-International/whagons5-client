import type { NavigateFunction } from "react-router-dom";

import { Logger } from '@/utils/logger';
import { GENERIC_ACTION_MAP } from './genericCrudActions';
type WsSend = (conversationId: string, payload: any) => boolean;

/**
 * Routes `frontend_action` WebSocket events to the appropriate handler.
 * These come from Execute_TypeScript via the Go backend (e.g., `frontend.navigate()`, `frontend.createKpi()`).
 * 
 * Each handler sends a `frontend_action_response` back to the running TypeScript via WS.
 */
export function handleFrontendAction(
  data: any,
  conversationId: string,
  wsSend: WsSend,
  navigate: NavigateFunction,
): void {
  const action = data.action;
  const actionData = data.data || {};
  let responseMessage = "ok";

  try {
    if (action === "navigate" && actionData.path) {
      Logger.info('assistant', '[FRONTEND_ACTION] Navigating to:', actionData.path);
      navigate(actionData.path);
      responseMessage = `Navigated to ${actionData.path}`;
    } else if (action === "alert" && actionData.message) {
      Logger.info('assistant', '[FRONTEND_ACTION] Alert:', actionData.message);
      import('react-hot-toast').then(({ default: toast }) => toast(actionData.message, { duration: 6000 }));
      responseMessage = "Alert shown";
    } else if (action === "create_kpi" && actionData.name) {
      Logger.info('assistant', '[FRONTEND_ACTION] Creating KPI:', actionData.name, 'Full data:', JSON.stringify(actionData));
      import("./createKpi").then(({ handleCreateKpiPrompt }) => {
        handleCreateKpiPrompt(
          { tool: 'Create_Kpi', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((kpiErr) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(kpiErr) }),
        });
      });
      return; // async — response sent from callback
    } else if (action === "update_kpi" && actionData.id) {
      Logger.info('assistant', '[FRONTEND_ACTION] Updating KPI:', actionData.id, 'Full data:', JSON.stringify(actionData));
      import("./updateKpi").then(({ handleUpdateKpiPrompt }) => {
        handleUpdateKpiPrompt(
          { tool: 'Update_Kpi', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "delete_kpi" && actionData.id) {
      Logger.info('assistant', '[FRONTEND_ACTION] Deleting KPI:', actionData.id);
      import("./deleteKpi").then(({ handleDeleteKpiPrompt }) => {
        handleDeleteKpiPrompt(
          { tool: 'Delete_Kpi', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "list_kpi") {
      Logger.info('assistant', '[FRONTEND_ACTION] Listing KPI cards');
      import("./listKpi").then(({ handleListKpiPrompt }) => {
        handleListKpiPrompt(
          { tool: 'List_Kpi', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "create_task") {
      Logger.info('assistant', '[FRONTEND_ACTION] Creating task:', actionData.name);
      import("./taskActions").then(({ handleCreateTaskPrompt }) => {
        handleCreateTaskPrompt(
          { tool: 'Create_Task', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "update_task") {
      Logger.info('assistant', '[FRONTEND_ACTION] Updating task:', actionData.id);
      import("./taskActions").then(({ handleUpdateTaskPrompt }) => {
        handleUpdateTaskPrompt(
          { tool: 'Update_Task', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "delete_task") {
      Logger.info('assistant', '[FRONTEND_ACTION] Deleting task:', actionData.id);
      import("./taskActions").then(({ handleDeleteTaskPrompt }) => {
        handleDeleteTaskPrompt(
          { tool: 'Delete_Task', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "change_task_status") {
      Logger.info('assistant', '[FRONTEND_ACTION] Changing task status:', actionData.id, '->', actionData.status_id);
      import("./taskActions").then(({ handleChangeTaskStatusPrompt }) => {
        handleChangeTaskStatusPrompt(
          { tool: 'Change_Task_Status', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "add_task_tag") {
      Logger.info('assistant', '[FRONTEND_ACTION] Adding tag to task:', actionData.task_id);
      import("./taskActions").then(({ handleAddTaskTagPrompt }) => {
        handleAddTaskTagPrompt(
          { tool: 'Add_Task_Tag', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "remove_task_tag") {
      Logger.info('assistant', '[FRONTEND_ACTION] Removing task tag:', actionData.id);
      import("./taskActions").then(({ handleRemoveTaskTagPrompt }) => {
        handleRemoveTaskTagPrompt(
          { tool: 'Remove_Task_Tag', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    } else if (action === "add_task_note") {
      Logger.info('assistant', '[FRONTEND_ACTION] Adding note to task:', actionData.task_id);
      import("./taskActions").then(({ handleAddTaskNotePrompt }) => {
        handleAddTaskNotePrompt(
          { tool: 'Add_Task_Note', data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        );
      }).catch((err) => {
        wsSend(conversationId, {
          type: "frontend_action_response",
          response: JSON.stringify({ ok: false, error: String(err) }),
        });
      });
      return;
    }

    // ─── Generic CRUD catch-all ──────────────────────────────────────────
    // Matches actions like create_categories, update_statuses, delete_tags, list_priorities
    const crudMatch = action?.match(/^(create|update|delete|list)_(.+)$/);
    if (crudMatch) {
      const [, operation, entityName] = crudMatch;
      const handlers = GENERIC_ACTION_MAP[entityName];
      if (handlers) {
        const promptHandler =
          operation === 'create' ? handlers.handleCreatePrompt :
          operation === 'update' ? handlers.handleUpdatePrompt :
          operation === 'delete' ? handlers.handleDeletePrompt :
          handlers.handleListPrompt;

        Logger.info('assistant', `[FRONTEND_ACTION] Generic ${operation} on ${entityName}`);
        promptHandler(
          { tool: `${operation}_${entityName}`, data: actionData },
          (payload) => {
            wsSend(conversationId, {
              type: "frontend_action_response",
              response: payload.response,
            });
          },
          navigate,
        ).catch((err) => {
          wsSend(conversationId, {
            type: "frontend_action_response",
            response: JSON.stringify({ ok: false, error: String(err) }),
          });
        });
        return;
      }
    }

    // Send response back to Go which routes it to TypeScript via stdin
    wsSend(conversationId, {
      type: "frontend_action_response",
      response: responseMessage,
    });
  } catch (err) {
    wsSend(conversationId, {
      type: "frontend_action_response",
      error: String(err),
    });
  }
}
