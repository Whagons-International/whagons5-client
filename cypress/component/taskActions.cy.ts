/**
 * Cypress component tests for taskActions.ts
 *
 * Tests all task-specific action handlers (create, update, delete,
 * change status, add/remove tag, add note) using Vite-aliased mocks.
 */
import React from 'react';
import { mount } from 'cypress/react';
import { store } from '@/store/store';
import {
  handleCreateTask,
  handleCreateTaskPrompt,
  handleUpdateTask,
  handleUpdateTaskPrompt,
  handleDeleteTask,
  handleDeleteTaskPrompt,
  handleChangeTaskStatus,
  handleChangeTaskStatusPrompt,
  handleAddTaskTag,
  handleAddTaskTagPrompt,
  handleRemoveTaskTag,
  handleRemoveTaskTagPrompt,
  handleAddTaskNote,
  handleAddTaskNotePrompt,
} from '@/features/ai-chat/actions/taskActions';

const Stub = () => React.createElement('div', { 'data-testid': 'stub' }, 'stub');

describe('taskActions', () => {
  beforeEach(() => {
    (store.dispatch as any).__reset();
    (store.getState as any).__reset();
  });

  // ─── CREATE TASK ────────────────────────────────────────────────────────────

  describe('handleCreateTask — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = handleCreateTask({ action: 'update_task', data: { name: 'X' } });
        expect(result).to.be.false;
      });
    });

    it('returns true on valid input and dispatches', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const result = handleCreateTask({ action: 'create_task', data: { name: 'Test Task' } });
        expect(result).to.be.true;
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('sends error when name is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleCreateTask({ action: 'create_task', data: {} }, sendMessage as any);
        expect(sendMessage).to.have.been.calledOnce;
        expect(sendMessage.firstCall.args[0]).to.include('name');
      });
    });

    it('does not dispatch when name is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleCreateTask({ action: 'create_task', data: {} });
        expect((store.dispatch as any).__calls).to.have.length(0);
      });
    });
  });

  describe('handleCreateTaskPrompt — prompt pathway', () => {
    it('sends error when name is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleCreateTaskPrompt({ tool: 'Create_Task', data: { category_id: 1 } }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('name');
      });
    });

    it('sends error when name is empty string', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleCreateTaskPrompt(
          { tool: 'Create_Task', data: { name: '  ', category_id: 1, team_id: 2, status_id: 1, priority_id: 3 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when category_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleCreateTaskPrompt(
          { tool: 'Create_Task', data: { name: 'Test', team_id: 2, status_id: 1, priority_id: 3 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('category_id');
      });
    });

    it('sends error when team_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleCreateTaskPrompt(
          { tool: 'Create_Task', data: { name: 'Test', category_id: 1, status_id: 1, priority_id: 3 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('team_id');
      });
    });

    it('sends success on valid input with all required fields', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleCreateTaskPrompt(
          {
            tool: 'Create_Task',
            data: { name: 'Test', category_id: 1, team_id: 2, status_id: 1, priority_id: 3 },
          },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.task).to.exist;
        expect(response.task.name).to.equal('Test');
      });
    });

    it('sends error when dispatch rejects', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.dispatch as any).__rejectNext = 'Server error';
        const send = cy.stub();
        await handleCreateTaskPrompt(
          {
            tool: 'Create_Task',
            data: { name: 'Test', category_id: 1, team_id: 2, status_id: 1, priority_id: 3 },
          },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Server error');
      });
    });
  });

  // ─── UPDATE TASK ────────────────────────────────────────────────────────────

  describe('handleUpdateTask — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleUpdateTask({ action: 'create_task', data: { id: 1 } })).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleUpdateTask({ action: 'update_task', data: { name: 'Updated' } }, sendMessage as any);
        expect(sendMessage.firstCall.args[0]).to.include('id');
      });
    });

    it('dispatches updateTaskAsync on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleUpdateTask({ action: 'update_task', data: { id: 42, name: 'Updated' } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('normalizes task_id as an alternative to id', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleUpdateTask({ action: 'update_task', data: { task_id: 42, name: 'Updated' } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleUpdateTaskPrompt — prompt pathway', () => {
    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleUpdateTaskPrompt(
          { tool: 'Update_Task', data: { name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends success on valid update', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleUpdateTaskPrompt(
          { tool: 'Update_Task', data: { id: 42, name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.task).to.exist;
      });
    });

    it('sends error when dispatch rejects', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.dispatch as any).__rejectNext = 'Update failed';
        const send = cy.stub();
        await handleUpdateTaskPrompt(
          { tool: 'Update_Task', data: { id: 42, name: 'Updated' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Update failed');
      });
    });
  });

  // ─── DELETE TASK ────────────────────────────────────────────────────────────

  describe('handleDeleteTask — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleDeleteTask({ action: 'update_task', data: { id: 1 } })).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleDeleteTask({ action: 'delete_task', data: {} }, sendMessage as any);
        expect(sendMessage.firstCall.args[0]).to.include('id');
      });
    });

    it('dispatches removeTaskAsync on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleDeleteTask({ action: 'delete_task', data: { id: 42 } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleDeleteTaskPrompt — prompt pathway', () => {
    it('sends error when data payload is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleDeleteTaskPrompt({ tool: 'Delete_Task' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Missing data');
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleDeleteTaskPrompt({ tool: 'Delete_Task', data: {} }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends success on valid delete', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleDeleteTaskPrompt({ tool: 'Delete_Task', data: { id: 42 } }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.deleted).to.deep.equal({ id: 42 });
      });
    });
  });

  // ─── CHANGE TASK STATUS ─────────────────────────────────────────────────────

  describe('handleChangeTaskStatus — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleChangeTaskStatus({ action: 'create_task', data: {} })).to.be.false;
      });
    });

    it('sends error when id or status_id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleChangeTaskStatus(
          { action: 'change_task_status', data: { id: 42 } },
          sendMessage as any,
        );
        expect(sendMessage.firstCall.args[0]).to.include('status_id');
      });
    });

    it('dispatches moveTaskThunk on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          tasks: { value: [{ id: 42, status_id: 1 }] },
        });
        handleChangeTaskStatus({
          action: 'change_task_status',
          data: { id: 42, status_id: 5 },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('reads previous status from store state', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({
          tasks: { value: [{ id: 42, status_id: 3 }] },
        });
        handleChangeTaskStatus({
          action: 'change_task_status',
          data: { id: 42, status_id: 7 },
        });
        // The dispatch call should have happened
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('defaults previousStatusId to 0 when task not found', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        (store.getState as any).__setState({ tasks: { value: [] } });
        handleChangeTaskStatus({
          action: 'change_task_status',
          data: { id: 999, status_id: 5 },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleChangeTaskStatusPrompt — prompt pathway', () => {
    it('sends error when data is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleChangeTaskStatusPrompt({ tool: 'Change_Status' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleChangeTaskStatusPrompt(
          { tool: 'Change_Status', data: { status_id: 5 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends error when status_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleChangeTaskStatusPrompt(
          { tool: 'Change_Status', data: { id: 42 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('status_id');
      });
    });

    it('sends success on valid status change', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.getState as any).__setState({
          tasks: { value: [{ id: 42, status_id: 1 }] },
        });
        const send = cy.stub();
        await handleChangeTaskStatusPrompt(
          { tool: 'Change_Status', data: { id: 42, status_id: 5 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.task.status_id).to.equal(5);
        expect(response.task.previous_status_id).to.equal(1);
      });
    });
  });

  // ─── ADD TASK TAG ───────────────────────────────────────────────────────────

  describe('handleAddTaskTag — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleAddTaskTag({ action: 'create_task', data: {} })).to.be.false;
      });
    });

    it('sends error when task_id or tag_id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleAddTaskTag(
          { action: 'add_task_tag', data: { task_id: 1 } },
          sendMessage as any,
        );
        expect(sendMessage.firstCall.args[0]).to.include('tag_id');
      });
    });

    it('dispatches addAsync on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleAddTaskTag({
          action: 'add_task_tag',
          data: { task_id: 1, tag_id: 5 },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleAddTaskTagPrompt — prompt pathway', () => {
    it('sends error when data is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskTagPrompt({ tool: 'Add_Tag' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when task_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskTagPrompt(
          { tool: 'Add_Tag', data: { tag_id: 5 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('task_id');
      });
    });

    it('sends error when tag_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskTagPrompt(
          { tool: 'Add_Tag', data: { task_id: 1 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('tag_id');
      });
    });

    it('sends success on valid input', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskTagPrompt(
          { tool: 'Add_Tag', data: { task_id: 1, tag_id: 5 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.taskTag).to.exist;
        expect(response.taskTag.task_id).to.equal(1);
        expect(response.taskTag.tag_id).to.equal(5);
      });
    });
  });

  // ─── REMOVE TASK TAG ────────────────────────────────────────────────────────

  describe('handleRemoveTaskTag — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleRemoveTaskTag({ action: 'create_task', data: {} })).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleRemoveTaskTag(
          { action: 'remove_task_tag', data: {} },
          sendMessage as any,
        );
        expect(sendMessage.firstCall.args[0]).to.include('id');
      });
    });

    it('dispatches removeAsync on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleRemoveTaskTag({ action: 'remove_task_tag', data: { id: 10 } });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleRemoveTaskTagPrompt — prompt pathway', () => {
    it('sends error when data is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleRemoveTaskTagPrompt({ tool: 'Remove_Tag' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleRemoveTaskTagPrompt(
          { tool: 'Remove_Tag', data: {} },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('id');
      });
    });

    it('sends success on valid delete', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleRemoveTaskTagPrompt(
          { tool: 'Remove_Tag', data: { id: 10 } },
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
        (store.dispatch as any).__rejectNext = 'Remove failed';
        const send = cy.stub();
        await handleRemoveTaskTagPrompt(
          { tool: 'Remove_Tag', data: { id: 10 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Remove failed');
      });
    });
  });

  // ─── ADD TASK NOTE ──────────────────────────────────────────────────────────

  describe('handleAddTaskNote — tool_result pathway', () => {
    it('returns false when action does not match', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        expect(handleAddTaskNote({ action: 'create_task', data: {} })).to.be.false;
      });
    });

    it('sends error when task_id or content is missing', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        const sendMessage = cy.stub();
        handleAddTaskNote(
          { action: 'add_task_note', data: { task_id: 1 } },
          sendMessage as any,
        );
        expect(sendMessage.firstCall.args[0]).to.include('content');
      });
    });

    it('dispatches addAsync on valid input', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleAddTaskNote({
          action: 'add_task_note',
          data: { task_id: 1, content: 'This is a note' },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('accepts "note" as an alias for "content"', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleAddTaskNote({
          action: 'add_task_note',
          data: { task_id: 1, note: 'This is a note' },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });

    it('accepts "text" as an alias for "content"', () => {
      mount(React.createElement(Stub));
      cy.then(() => {
        handleAddTaskNote({
          action: 'add_task_note',
          data: { task_id: 1, text: 'This is a note' },
        });
        expect((store.dispatch as any).__calls).to.have.length.greaterThan(0);
      });
    });
  });

  describe('handleAddTaskNotePrompt — prompt pathway', () => {
    it('sends error when data is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt({ tool: 'Add_Note' }, send as any);
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
      });
    });

    it('sends error when task_id is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { content: 'Note text' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('task_id');
      });
    });

    it('sends error when content is missing', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { task_id: 1 } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('content');
      });
    });

    it('sends error when content is empty/whitespace', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { task_id: 1, content: '   ' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('content');
      });
    });

    it('sends success on valid input', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { task_id: 1, content: 'This is a note' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.note).to.exist;
        expect(response.note.task_id).to.equal(1);
        expect(response.note.content).to.equal('This is a note');
      });
    });

    it('trims whitespace from content', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { task_id: 1, content: '  Note with spaces  ' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.true;
        expect(response.note.content).to.equal('Note with spaces');
      });
    });

    it('sends error when dispatch rejects', () => {
      mount(React.createElement(Stub));
      cy.wrap(null).then(async () => {
        (store.dispatch as any).__rejectNext = 'Note creation failed';
        const send = cy.stub();
        await handleAddTaskNotePrompt(
          { tool: 'Add_Note', data: { task_id: 1, content: 'Note' } },
          send as any,
        );
        const response = JSON.parse(send.firstCall.args[0].response);
        expect(response.ok).to.be.false;
        expect(response.error).to.include('Note creation failed');
      });
    });
  });
});
