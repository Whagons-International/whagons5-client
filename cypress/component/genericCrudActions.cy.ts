/**
 * Cypress component tests for genericCrudActions.ts
 *
 * Tests the generic CRUD factory and its per-entity instances using
 * Vite-aliased mock modules (see cypress.config.mjs).
 */
import React from 'react';
import { mount } from 'cypress/react';
import { store } from '@/store/store';
import {
  createGenericCrudHandlers,
  GENERIC_ACTION_MAP,
  categoryActions,
  statusActions,
  teamActions,
  priorityActions,
  tagActions,
  workspaceActions,
  slaActions,
  formActions,
  boardActions,
  broadcastActions,
} from '@/features/ai-chat/actions/genericCrudActions';

const Stub = () => React.createElement('div', { 'data-testid': 'stub' }, 'stub');

describe('genericCrudActions', () => {
  beforeEach(() => {
    (store.dispatch as any).__reset();
    (store.getState as any).__reset();
  });

  // ─── Factory shape ──────────────────────────────────────────────────────────

  describe('createGenericCrudHandlers — factory shape', () => {
    it('returns an object with all 8 handler methods', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testEntities', label: 'test entity' });
        expect(handlers).to.have.all.keys(
          'handleCreate',
          'handleCreatePrompt',
          'handleUpdate',
          'handleUpdatePrompt',
          'handleDelete',
          'handleDeletePrompt',
          'handleList',
          'handleListPrompt',
        );
      });
    });

    it('all handler values are functions', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testEntities', label: 'test entity' });
        for (const [key, value] of Object.entries(handlers)) {
          expect(value, `${key} should be a function`).to.be.a('function');
        }
      });
    });
  });

  // ─── GENERIC_ACTION_MAP ─────────────────────────────────────────────────────

  describe('GENERIC_ACTION_MAP', () => {
    const expectedEntities = [
      'categories', 'statuses', 'priorities', 'tags', 'teams',
      'workspaces', 'slas', 'forms', 'boards', 'broadcasts',
      'spots', 'spot_types', 'templates', 'custom_fields',
      'users', 'user_teams', 'invitations',
      'sla_policies', 'sla_alerts', 'sla_escalation_levels',
      'approvals', 'approval_approvers', 'workflows',
      'form_fields', 'board_members', 'board_messages',
      'plugins', 'status_transitions',
      'asset_types', 'asset_items', 'asset_maintenance_schedules',
      'qr_codes',
      'compliance_standards', 'compliance_requirements', 'compliance_audits',
      'documents',
      'working_schedules', 'schedule_assignments', 'time_off_types', 'time_off_requests',
      'holiday_calendars', 'overtime_rules',
      'task_attachments', 'task_recurrences', 'task_shares',
    ];

    it('contains all expected entity keys', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        for (const key of expectedEntities) {
          expect(GENERIC_ACTION_MAP, `missing key: ${key}`).to.have.property(key);
        }
      });
    });

    it('each entity entry has 8 handler methods', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        for (const key of expectedEntities) {
          const handlers = GENERIC_ACTION_MAP[key];
          expect(Object.keys(handlers), `${key} should have 8 methods`).to.have.length(8);
        }
      });
    });
  });

  // ─── handleCreate (tool_result pathway) ─────────────────────────────────────

  describe('handleCreate — tool_result pathway', () => {
    it('returns true when action matches create_{entity}', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleCreate({ action: 'create_test_items', data: { name: 'New' } });
        expect(result).to.be.true;
      });
    });

    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleCreate({ action: 'update_test_items', data: { name: 'New' } });
        expect(result).to.be.false;
      });
    });

    it('sends error message when required field is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
          requiredFields: ['name'],
        });
        const result = handlers.handleCreate(
          { action: 'create_test_items', data: {} },
          sendMessage as any,
        );
        expect(result).to.be.true;
        expect(sendMessage).to.have.been.calledOnce;
        expect(sendMessage.firstCall.args[0]).to.include('name');
        expect(sendMessage.firstCall.args[0]).to.include('required');
      });
    });

    it('dispatches addAsync when input is valid', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
          requiredFields: ['name'],
        });
        handlers.handleCreate({ action: 'create_test_items', data: { name: 'Test' } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('does not dispatch when required field is empty string', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
          requiredFields: ['name'],
        });
        handlers.handleCreate(
          { action: 'create_test_items', data: { name: '' } },
          sendMessage as any,
        );
        expect((store.dispatch as any).__calls).to.have.length(0);
        expect(sendMessage).to.have.been.calledOnce;
      });
    });
  });

  // ─── handleCreatePrompt (prompt pathway) ────────────────────────────────────

  describe('handleCreatePrompt — prompt pathway', () => {
    it('sends error response when required field is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
          requiredFields: ['name'],
        });
        await handlers.handleCreatePrompt({ tool: 'Create_Test', data: {} }, send as any);
        expect(send).to.have.been.calledOnce;
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('name');
      });
    });

    it('sends success response on valid create', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
          requiredFields: ['name'],
        });
        await handlers.handleCreatePrompt(
          { tool: 'Create_Test', data: { name: 'Test' } },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.item).to.exist;
      });
    });

    it('sends error response when dispatch rejects', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.dispatch as any).__rejectNext = 'Server Error';
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({
          sliceName: 'testItems',
          label: 'test item',
        });
        await handlers.handleCreatePrompt(
          { tool: 'Create_Test', data: { name: 'Test' } },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Server Error');
      });
    });

    it('always returns true', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'x', label: 'x' });
        const result = await handlers.handleCreatePrompt(
          { tool: 'Create_X', data: { name: 'A' } },
          send as any,
        );
        expect(result).to.be.true;
      });
    });
  });

  // ─── handleUpdate (tool_result pathway) ─────────────────────────────────────

  describe('handleUpdate — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        expect(handlers.handleUpdate({ action: 'create_test_items', data: { id: 1 } })).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleUpdate(
          { action: 'update_test_items', data: { name: 'Updated' } },
          sendMessage as any,
        );
        expect(result).to.be.true;
        expect(sendMessage).to.have.been.calledOnce;
        expect(sendMessage.firstCall.args[0]).to.include('id');
      });
    });

    it('dispatches updateAsync with id and updates', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        handlers.handleUpdate({ action: 'update_test_items', data: { id: 5, name: 'Updated' } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('accepts string ids and parses them to numbers', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleUpdate(
          { action: 'update_test_items', data: { id: '42', name: 'Updated' } },
        );
        expect(result).to.be.true;
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  // ─── handleUpdatePrompt ─────────────────────────────────────────────────────

  describe('handleUpdatePrompt — prompt pathway', () => {
    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleUpdatePrompt(
          { tool: 'Update_Test', data: { name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends error when id is not a valid number', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleUpdatePrompt(
          { tool: 'Update_Test', data: { id: 'abc', name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends success on valid update', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleUpdatePrompt(
          { tool: 'Update_Test', data: { id: 5, name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.item).to.exist;
      });
    });
  });

  // ─── handleDelete (tool_result pathway) ─────────────────────────────────────

  describe('handleDelete — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        expect(handlers.handleDelete({ action: 'create_test_items', data: { id: 1 } })).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleDelete(
          { action: 'delete_test_items', data: {} },
          sendMessage as any,
        );
        expect(result).to.be.true;
        expect(sendMessage.firstCall.args[0]).to.include('id');
      });
    });

    it('dispatches removeAsync with id', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        handlers.handleDelete({ action: 'delete_test_items', data: { id: 10 } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  // ─── handleDeletePrompt ─────────────────────────────────────────────────────

  describe('handleDeletePrompt — prompt pathway', () => {
    it('sends error when data payload is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleDeletePrompt({ tool: 'Delete_Test' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleDeletePrompt(
          { tool: 'Delete_Test', data: {} },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends success with deleted id on valid delete', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleDeletePrompt(
          { tool: 'Delete_Test', data: { id: 10 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.deleted).to.deep.equal({ id: 10 });
      });
    });

    it('sends error when dispatch rejects', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.dispatch as any).__rejectNext = 'Delete failed';
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleDeletePrompt(
          { tool: 'Delete_Test', data: { id: 10 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Delete failed');
      });
    });
  });

  // ─── handleList (tool_result pathway) ───────────────────────────────────────

  describe('handleList — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        expect(handlers.handleList({ action: 'create_test_items' })).to.be.false;
      });
    });

    it('reads items from store state and reports count', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          testItems: { value: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        });
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        const result = handlers.handleList(
          { action: 'list_test_items' },
          sendMessage as any,
        );
        expect(result).to.be.true;
        expect(sendMessage).to.have.been.calledOnce;
        expect(sendMessage.firstCall.args[0]).to.include('3');
      });
    });

    it('filters by workspace_id (includes null workspace items)', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          testItems: {
            value: [
              { id: 1, workspace_id: 1 },
              { id: 2, workspace_id: 2 },
              { id: 3, workspace_id: null },
            ],
          },
        });
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        handlers.handleList(
          { action: 'list_test_items', data: { workspace_id: 1 } },
          sendMessage as any,
        );
        // Should include id:1 (matches) and id:3 (null workspace), but not id:2
        expect(sendMessage.firstCall.args[0]).to.include('2');
      });
    });

    it('returns all items when no workspace_id filter', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          testItems: { value: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
        });
        const sendMessage = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        handlers.handleList({ action: 'list_test_items' }, sendMessage as any);
        expect(sendMessage.firstCall.args[0]).to.include('4');
      });
    });
  });

  // ─── handleListPrompt ──────────────────────────────────────────────────────

  describe('handleListPrompt — prompt pathway', () => {
    it('returns items array and count', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.getState as any).__setState({
          testItems: { value: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
        });
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleListPrompt({ tool: 'List_Test', data: {} }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.items).to.have.length(2);
        expect(response.count).to.equal(2);
      });
    });

    it('respects workspace_id filter in prompt pathway', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.getState as any).__setState({
          testItems: {
            value: [
              { id: 1, workspace_id: 1 },
              { id: 2, workspace_id: 2 },
            ],
          },
        });
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleListPrompt(
          { tool: 'List_Test', data: { workspace_id: 1 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.count).to.equal(1);
      });
    });

    it('returns empty list when slice has no value', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.getState as any).__setState({});
        const send = cy.stub();
        const handlers = createGenericCrudHandlers({ sliceName: 'testItems', label: 'test item' });
        await handlers.handleListPrompt({ tool: 'List_Test', data: {} }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.items).to.have.length(0);
        expect(response.count).to.equal(0);
      });
    });
  });

  // ─── Exported entity instances ──────────────────────────────────────────────

  describe('Exported entity handler instances', () => {
    it('categoryActions matches create_categories action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = categoryActions.handleCreate({
          action: 'create_categories',
          data: { name: 'Test Category' },
        });
        expect(result).to.be.true;
      });
    });

    it('statusActions matches create_statuses and requires name + category_id', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const send = cy.stub();
        // Missing category_id
        statusActions.handleCreate(
          { action: 'create_statuses', data: { name: 'Open' } },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        expect(send.firstCall.args[0]).to.include('category_id');
      });
    });

    it('teamActions matches create_teams action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = teamActions.handleCreate({
          action: 'create_teams',
          data: { name: 'Dev' },
        });
        expect(result).to.be.true;
      });
    });

    it('priorityActions matches create_priorities action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = priorityActions.handleCreate({
          action: 'create_priorities',
          data: { name: 'High' },
        });
        expect(result).to.be.true;
      });
    });

    it('tagActions matches create_tags action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = tagActions.handleCreate({
          action: 'create_tags',
          data: { name: 'urgent' },
        });
        expect(result).to.be.true;
      });
    });

    it('workspaceActions matches create_workspaces action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = workspaceActions.handleCreate({
          action: 'create_workspaces',
          data: { name: 'Main' },
        });
        expect(result).to.be.true;
      });
    });

    it('slaActions matches create_slas action', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = slaActions.handleCreate({
          action: 'create_slas',
          data: { name: 'Gold SLA' },
        });
        expect(result).to.be.true;
      });
    });

    it('formActions requires name field', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const send = cy.stub();
        formActions.handleCreate(
          { action: 'create_forms', data: {} },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        expect(send.firstCall.args[0]).to.include('name');
      });
    });

    it('boardActions requires name field', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const send = cy.stub();
        boardActions.handleCreate(
          { action: 'create_boards', data: {} },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        expect(send.firstCall.args[0]).to.include('name');
      });
    });

    it('broadcastActions requires title and content', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const send = cy.stub();
        broadcastActions.handleCreate(
          { action: 'create_broadcasts', data: { title: 'Hello' } },
          send as any,
        );
        expect(send).to.have.been.calledOnce;
        expect(send.firstCall.args[0]).to.include('content');
      });
    });
  });

  // ─── Snake-case conversion edge cases ───────────────────────────────────────

  describe('Snake-case conversion for camelCase slice names', () => {
    it('spotTypes -> spot_types action matching', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({ sliceName: 'spotTypes', label: 'spot type' });
        const result = handlers.handleCreate({
          action: 'create_spot_types',
          data: { name: 'Building' },
        });
        expect(result).to.be.true;
      });
    });

    it('slaEscalationLevels -> sla_escalation_levels action matching', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const handlers = createGenericCrudHandlers({
          sliceName: 'slaEscalationLevels',
          label: 'SLA escalation level',
        });
        const result = handlers.handleDelete({
          action: 'delete_sla_escalation_levels',
          data: { id: 1 },
        });
        expect(result).to.be.true;
      });
    });
  });
});
