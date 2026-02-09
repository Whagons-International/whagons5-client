import type { NavigateFunction } from "react-router-dom";

import { Logger } from '@/utils/logger';
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
      alert(actionData.message);
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
