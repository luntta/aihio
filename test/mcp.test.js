import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerState, handleMessage } from '../src/mcp/server.js';

test('MCP protocol handler supports initialize, describe, and lint tool transcripts', () => {
  const state = createServerState();
  const messages = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: {
          name: 'aihio-test',
          version: '1.0.0',
        },
      },
    },
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'describe',
        arguments: {
          component: 'button',
        },
      },
    },
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'lint',
        arguments: {
          source: 'fixture.html',
          markup: '<aihio-button size="icon"></aihio-button>',
        },
      },
    },
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'describe',
        arguments: {
          component: 'does-not-exist',
        },
      },
    },
    {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'unknown-tool',
        arguments: {},
      },
    },
  ];

  const responses = messages
    .map((message) => invoke(message, state))
    .filter(Boolean);
  const byId = new Map(responses.map((response) => [response.id, response]));

  assert.equal(responses.length, 6);
  assert.equal(byId.get(1).result.protocolVersion, '2025-11-25');
  assert.equal(byId.get(1).result.serverInfo.name, 'aihio');
  assert.deepEqual(byId.get(1).result.capabilities, {
    tools: {
      listChanged: false,
    },
    prompts: {
      listChanged: false,
    },
  });
  assert.deepEqual(
    byId.get(2).result.tools.map((tool) => tool.name),
    ['find', 'list_components', 'list_patterns', 'get_pattern', 'describe', 'lint']
  );
  assert.equal(byId.get(3).result.structuredContent.component, 'aihio-button');
  assert.equal(byId.get(3).result.structuredContent.schema.$component, 'aihio-button');
  assert.equal(byId.get(4).result.structuredContent.ok, false);
  assert.ok(
    byId.get(4).result.structuredContent.issues.some(
      (issue) => issue.ruleId === 'a11y-contract' && issue.component === 'aihio-button'
    )
  );
  assert.equal(byId.get(5).result.isError, true);
  assert.ok(byId.get(5).result.content[0].text.includes('Unknown component'));
  assert.equal(byId.get(6).error.code, -32601);
});

test('MCP discovery tools lead from a request to lint-clean pattern markup', () => {
  const state = createServerState();
  invoke({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {} } }, state);
  const call = (name, args = {}) =>
    invoke({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }, state).result;

  const found = call('find', { query: 'confirm before deleting a project' }).structuredContent;
  assert.equal(found.patterns[0].id, 'destructive-confirmation');
  assert.equal(found.components[0].tag, 'aihio-dialog');

  const byIntent = call('find', { query: 'destructive-action' }).structuredContent;
  assert.equal(byIntent.intent.name, 'destructive-action');
  assert.ok(byIntent.components.some((component) => component.tag === 'aihio-button'));

  const components = call('list_components').structuredContent.components;
  assert.ok(components.every((component) => component.tag && component.description && component.intents.length > 0));
  assert.deepEqual(components.find((component) => component.tag === 'aihio-dialog').commands, ['--open', '--close', '--toggle']);

  const patterns = call('list_patterns').structuredContent.patterns;
  assert.ok(patterns.some((pattern) => pattern.id === 'auth-form'));

  const pattern = call('get_pattern', { id: 'destructive-confirmation' }).structuredContent;
  assert.match(pattern.markup, /command="--open"/);
  const linted = call('lint', { markup: pattern.markup }).structuredContent;
  assert.deepEqual(linted.issues, [], 'a canonical pattern lints clean');

  const unknownPattern = call('get_pattern', { id: 'nope' });
  assert.equal(unknownPattern.isError, true);
  assert.ok(unknownPattern.structuredContent.knownPatterns.includes('auth-form'));

  const nothing = call('find', { query: 'kanban swimlanes' });
  assert.equal(nothing.isError, true);
});

test('MCP serves the authoring prompt fragment as a prompt', () => {
  const state = createServerState();
  invoke({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {} } }, state);

  const list = invoke({ jsonrpc: '2.0', id: 2, method: 'prompts/list', params: {} }, state).result;
  assert.deepEqual(list.prompts.map((prompt) => prompt.name), ['aihio-authoring']);

  const prompt = invoke({ jsonrpc: '2.0', id: 3, method: 'prompts/get', params: { name: 'aihio-authoring' } }, state).result;
  assert.equal(prompt.messages[0].role, 'user');
  assert.match(prompt.messages[0].content.text, /^# Aihio Prompt Fragment/);

  const unknown = invoke({ jsonrpc: '2.0', id: 4, method: 'prompts/get', params: { name: 'other' } }, state);
  assert.equal(unknown.error.code, -32602);
});

function invoke(message, state) {
  try {
    return handleMessage(message, state);
  } catch (cause) {
    return {
      jsonrpc: '2.0',
      id: Object.hasOwn(message, 'id') ? message.id : null,
      error: {
        code: typeof cause?.code === 'number' ? cause.code : -32603,
        message: cause instanceof Error ? cause.message : 'Internal error',
      },
    };
  }
}
