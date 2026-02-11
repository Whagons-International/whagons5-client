/**
 * Cypress component tests for the router / dispatcher files:
 *   - frontend_tools.ts  (isFrontendTool, processFrontendTool)
 *   - frontend_tool_prompts.ts  (handleFrontendToolPromptMessage)
 *
 * These tests verify that incoming tool names / actions are correctly
 * recognised and routed to the appropriate handler, using Vite-aliased
 * mock modules for the store and slice layers.
 */
import React from 'react';
import { mount } from 'cypress/react';
import { store } from '@/store/store';
import {
  isFrontendTool,
  processFrontendTool,
} from '@/features/ai-chat/actions/frontend_tools';
import { handleFrontendToolPromptMessage } from '@/features/ai-chat/actions/frontend_tool_prompts';

const Stub = () => React.createElement('div', { 'data-testid': 'stub' }, 'stub');

describe('Router files', () => {
  beforeEach(() => {
    (store.dispatch as any).__reset();
    (store.getState as any).__reset();
  });

  // ─── isFrontendTool ─────────────────────────────────────────────────────────

  describe('isFrontendTool', () => {
    describe('registered tools', () => {
      const registeredTools = [
        'Browser_Alert',
        'Browser_Prompt',
        'Browser_Navigate',
        'Create_Kpi',
        'Update_Kpi',
        'Delete_Kpi',
        'List_Kpi',
        'Create_Task',
        'Update_Task',
        'Delete_Task',
        'Change_Task_Status',
        'Add_Task_Tag',
        'Remove_Task_Tag',
        'Add_Task_Note',
      ];

      registeredTools.forEach((tool) => {
        it(`recognises "${tool}"`, () => {
          mount(React.createElement(Stub));
          cy.then(() => {
            expect(isFrontendTool(tool)).to.be.true;
          });
        });
      });
    });

    describe('generic CRUD tools', () => {
      const genericTools = [
        'Create_Categories',
        'Update_Statuses',
        'Delete_Tags',
        'List_Priorities',
        'Create_Teams',
        'Update_Workspaces',
        'Delete_Slas',
        'List_Forms',
        'Create_Boards',
        'Update_Broadcasts',
      ];

      genericTools.forEach((tool) => {
        it(`recognises generic CRUD tool "${tool}"`, () => {
          mount(React.createElement(Stub));
          cy.then(() => {
            expect(isFrontendTool(tool)).to.be.true;
          });
        });
      });
    });

    describe('unknown tools', () => {
      const unknownTools = [
        'Unknown_Tool',
        'Create',
        'Delete',
        'Some_Random',
        'create_categories', // lowercase — not PascalCase
        '',
      ];

      unknownTools.forEach((tool) => {
        it(`rejects "${tool || '(empty string)'}"`, () => {
          mount(React.createElement(Stub));
          cy.then(() => {
            expect(isFrontendTool(tool)).to.be.false;
          });
        });
      });
    });
  });

  // ─── processFrontendTool ────────────────────────────────────────────────────

  describe('processFrontendTool', () => {
    it('returns false for unknown tools', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(processFrontendTool('Unknown_Tool', {})).to.be.false;
      });
    });

    it('handles Browser_Alert with valid data', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Browser_Alert', {
          action: 'browser_alert',
          message: 'Hello',
        });
        expect(result).to.be.true;
      });
    });

    it('handles Browser_Alert with string result (JSON parsing)', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool(
          'Browser_Alert',
          JSON.stringify({ action: 'browser_alert', message: 'Hi' }),
        );
        expect(result).to.be.true;
      });
    });

    it('returns false for Browser_Alert without message', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Browser_Alert', {
          action: 'browser_alert',
        });
        expect(result).to.be.false;
      });
    });

    it('handles Create_Task tool', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Create_Task', {
          action: 'create_task',
          data: { name: 'Test' },
        });
        expect(result).to.be.true;
      });
    });

    it('handles generic CRUD Create_Categories', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Create_Categories', {
          action: 'create_categories',
          data: { name: 'Test' },
        });
        expect(result).to.be.true;
      });
    });

    it('handles generic CRUD Update_Statuses', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Update_Statuses', {
          action: 'update_statuses',
          data: { id: 1, name: 'Active' },
        });
        expect(result).to.be.true;
      });
    });

    it('handles generic CRUD Delete_Tags', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Delete_Tags', {
          action: 'delete_tags',
          data: { id: 3 },
        });
        expect(result).to.be.true;
      });
    });

    it('handles generic CRUD List_Priorities', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          priorities: { value: [{ id: 1, name: 'High' }] },
        });
        const result = processFrontendTool('List_Priorities', {
          action: 'list_priorities',
        });
        expect(result).to.be.true;
      });
    });

    it('returns false when JSON parsing fails on string result', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = processFrontendTool('Browser_Alert', 'not valid json');
        expect(result).to.be.false;
      });
    });
  });

  // ─── handleFrontendToolPromptMessage ────────────────────────────────────────

  describe('handleFrontendToolPromptMessage', () => {
    describe('browser_navigate', () => {
      it('navigates with valid relative path', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const navigate = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'browser_navigate',
              data: { path: '/dashboard' },
            },
            send as any,
            navigate as any,
          );
          expect(result).to.be.true;
          expect(navigate).to.have.been.calledWith('/dashboard');
          expect(send).to.have.been.calledOnce;
          expect(send.firstCall.args[0].response).to.equal('ok');
        });
      });

      it('rejects javascript: protocol', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const navigate = cy.stub();
          handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'browser_navigate',
              data: { path: 'javascript:alert(1)' },
            },
            send as any,
            navigate as any,
          );
          expect(navigate).to.not.have.been.called;
          // Should send error response
          expect(send).to.have.been.calledOnce;
          expect(send.firstCall.args[0].response).to.include('Error');
        });
      });

      it('rejects protocol-relative URLs', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const navigate = cy.stub();
          handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'browser_navigate',
              data: { path: '//evil.com/attack' },
            },
            send as any,
            navigate as any,
          );
          expect(navigate).to.not.have.been.called;
        });
      });

      it('handles nested paths', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const navigate = cy.stub();
          handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'browser_navigate',
              data: { path: '/settings/categories/123' },
            },
            send as any,
            navigate as any,
          );
          expect(navigate).to.have.been.calledWith('/settings/categories/123');
        });
      });
    });

    describe('browser_alert', () => {
      it('returns true and sends ok response', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'browser_alert',
              data: { message: 'Hello' },
            },
            send as any,
          );
          expect(result).to.be.true;
          expect(send).to.have.been.calledOnce;
          expect(send.firstCall.args[0].response).to.equal('ok');
        });
      });
    });

    describe('task action routing', () => {
      const taskActions = [
        'create_task',
        'update_task',
        'delete_task',
        'change_task_status',
        'add_task_tag',
        'remove_task_tag',
        'add_task_note',
      ];

      taskActions.forEach((action) => {
        it(`routes "${action}" and returns true`, () => {
          mount(React.createElement(Stub));
          cy.then(() => {
            const send = cy.stub();
            // Provide minimal data that won't cause errors but will
            // exercise the routing logic (return true proves routing worked)
            const result = handleFrontendToolPromptMessage(
              {
                type: 'frontend_tool_prompt',
                action,
                data: { id: 1, name: 'Test', task_id: 1, tag_id: 1, status_id: 1, content: 'note' },
              },
              send as any,
            );
            expect(result).to.be.true;
          });
        });
      });
    });

    describe('KPI action routing', () => {
      const kpiActions = ['create_kpi', 'update_kpi', 'delete_kpi', 'list_kpi'];

      kpiActions.forEach((action) => {
        it(`routes "${action}" and returns true`, () => {
          mount(React.createElement(Stub));
          cy.then(() => {
            const send = cy.stub();
            const result = handleFrontendToolPromptMessage(
              {
                type: 'frontend_tool_prompt',
                action,
                data: { id: 1, name: 'Test KPI' },
              },
              send as any,
            );
            expect(result).to.be.true;
          });
        });
      });
    });

    describe('generic CRUD catch-all routing', () => {
      it('routes create_categories', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'create_categories',
              data: { name: 'Test' },
            },
            send as any,
          );
          expect(result).to.be.true;
        });
      });

      it('routes update_teams', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'update_teams',
              data: { id: 1, name: 'Updated' },
            },
            send as any,
          );
          expect(result).to.be.true;
        });
      });

      it('routes delete_tags', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'delete_tags',
              data: { id: 5 },
            },
            send as any,
          );
          expect(result).to.be.true;
        });
      });

      it('routes list_priorities', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          (store.getState as any).__setState({
            priorities: { value: [{ id: 1 }] },
          });
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'list_priorities',
              data: {},
            },
            send as any,
          );
          expect(result).to.be.true;
        });
      });

      it('routes list_workspaces', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          (store.getState as any).__setState({
            workspaces: { value: [] },
          });
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'list_workspaces',
              data: {},
            },
            send as any,
          );
          expect(result).to.be.true;
        });
      });
    });

    describe('unknown action', () => {
      it('returns false for unrecognised action', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'unknown_action',
            },
            send as any,
          );
          expect(result).to.be.false;
          expect(send).to.not.have.been.called;
        });
      });

      it('returns false for undefined action', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            { type: 'frontend_tool_prompt' },
            send as any,
          );
          expect(result).to.be.false;
        });
      });

      it('returns false for CRUD pattern with unknown entity', () => {
        mount(React.createElement(Stub));
        cy.then(() => {
          const send = cy.stub();
          const result = handleFrontendToolPromptMessage(
            {
              type: 'frontend_tool_prompt',
              action: 'create_nonexistent_entity',
            },
            send as any,
          );
          expect(result).to.be.false;
        });
      });
    });
  });
});
