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
  });
  assert.deepEqual(
    byId.get(2).result.tools.map((tool) => tool.name),
    ['describe', 'lint']
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
