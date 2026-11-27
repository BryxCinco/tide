import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Task } from '../types/task.ts';
import { BOARD_COLUMNS, canMoveTask, groupTasksByStatus, sortTasks } from './taskBoard.ts';

const t = (id: string, extra: Partial<Task> = {}): Task => ({
  id, title: id, status: 'todo', priority: 'medium', tags: [], createdAt: '2026-11-01T00:00:00.000Z', ...extra,
});

test('board columns are To do, In progress, Done', () => {
  assert.deepEqual(BOARD_COLUMNS.map((c) => c.status), ['todo', 'in-progress', 'done']);
});

test('groupTasksByStatus buckets every status and keeps order', () => {
  const g = groupTasksByStatus([t('a'), t('b', { status: 'done' }), t('c')]);
  assert.deepEqual(g.todo.map((x) => x.id), ['a', 'c']);
  assert.deepEqual(g['in-progress'], []);
  assert.deepEqual(g.done.map((x) => x.id), ['b']);
});

test('done tasks are locked; others can move', () => {
  assert.equal(canMoveTask(t('a', { status: 'done' })), false);
  assert.equal(canMoveTask(t('a', { status: 'in-progress' })), true);
  assert.equal(canMoveTask(t('a')), true);
});

test('sortTasks by priority ascending ranks critical first', () => {
  const tasks = [t('l', { priority: 'low' }), t('c', { priority: 'critical' }), t('m'), t('h', { priority: 'high' })];
  assert.deepEqual(sortTasks(tasks, 'priority', 'asc').map((x) => x.id), ['c', 'h', 'm', 'l']);
  assert.deepEqual(sortTasks(tasks, 'priority', 'desc').map((x) => x.id), ['l', 'm', 'h', 'c']);
});

test('sortTasks by due date puts missing dates last both ways', () => {
  const tasks = [t('none'), t('late', { dueDate: '2026-12-10' }), t('early', { dueDate: '2026-12-01' })];
  assert.deepEqual(sortTasks(tasks, 'dueDate', 'asc').map((x) => x.id), ['early', 'late', 'none']);
  assert.deepEqual(sortTasks(tasks, 'dueDate', 'desc').map((x) => x.id), ['late', 'early', 'none']);
});

test('sortTasks by title and status', () => {
  const tasks = [t('b'), t('A', { status: 'done' }), t('c', { status: 'in-progress' })];
  assert.deepEqual(sortTasks(tasks, 'title', 'asc').map((x) => x.id), ['A', 'b', 'c']);
  assert.deepEqual(sortTasks(tasks, 'status', 'asc').map((x) => x.id), ['b', 'c', 'A']);
});

test('sortTasks does not mutate its input', () => {
  const tasks = [t('b'), t('a')];
  sortTasks(tasks, 'title', 'asc');
  assert.deepEqual(tasks.map((x) => x.id), ['b', 'a']);
});
