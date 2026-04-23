import { lintMarkup } from '../lint/index.js';
import { describe as describeComponent, runtimeSchema } from '../schema/runtime.js';

const JSONRPC_VERSION = '2.0';
const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

const KNOWN_COMPONENTS = runtimeSchema.components.map((component) => component.$component);

const TOOL_DEFINITIONS = [
  {
    name: 'describe',
    title: 'Describe Aihio Component',
    description: 'Return the schema entry for a component tag such as "aihio-button" or "button".',
    inputSchema: {
      type: 'object',
      properties: {
        component: {
          type: 'string',
          description: 'Component tag to describe. Accepts either "aihio-button" or the short form "button".',
        },
      },
      required: ['component'],
      additionalProperties: false,
    },
  },
  {
    name: 'lint',
    title: 'Lint Aihio Markup',
    description: 'Validate markup against the Aihio schema and return structured issues.',
    inputSchema: {
      type: 'object',
      properties: {
        markup: {
          type: 'string',
          description: 'HTML snippet to validate.',
        },
        source: {
          type: 'string',
          description: 'Optional source label to include in lint results.',
        },
      },
      required: ['markup'],
      additionalProperties: false,
    },
  },
];

export function createServerState() {
  return {
    negotiatedProtocolVersion: null,
    initializeReceived: false,
    initializedNotificationReceived: false,
  };
}

export function handleMessage(message, state = createServerState()) {
  if (Array.isArray(message)) {
    if (message.length === 0) {
      return createErrorResponse(null, -32600, 'Invalid Request');
    }

    const responses = message
      .map((entry) => handleSingleMessage(entry, state))
      .filter(Boolean);

    return responses.length > 0 ? responses : null;
  }

  return handleSingleMessage(message, state);
}

export function runServer({
  input = globalThis.process?.stdin,
  output = globalThis.process?.stdout,
  error = globalThis.process?.stderr,
  state = createServerState(),
} = {}) {
  let buffer = '';

  input.setEncoding?.('utf8');
  input.resume?.();

  const onData = (chunk) => {
    buffer += chunk;

    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      processLine(line);
    }
  };

  const onEnd = () => {
    if (buffer.trim().length > 0) {
      processLine(buffer);
      buffer = '';
    }
  };

  input.on('data', onData);
  input.on('end', onEnd);

  return {
    close() {
      input.off?.('data', onData);
      input.off?.('end', onEnd);
      input.pause?.();
    },
    state,
  };

  function processLine(line) {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    let message;

    try {
      message = JSON.parse(trimmed);
    } catch (cause) {
      writeMessage(
        output,
        createErrorResponse(null, -32700, 'Parse error', {
          detail: cause instanceof Error ? cause.message : String(cause),
        })
      );
      return;
    }

    try {
      const response = handleMessage(message, state);
      if (response !== null) {
        writeMessage(output, response);
      }
    } catch (cause) {
      const requestId = getRequestId(message);
      const code = typeof cause?.code === 'number' ? cause.code : -32603;
      const errorMessage = cause instanceof Error ? cause.message : 'Internal error';
      const payload = createErrorResponse(
        requestId,
        code,
        errorMessage,
        {
          detail: cause instanceof Error ? cause.message : String(cause),
        }
      );
      writeMessage(output, payload);
      error.write(`[aihio-mcp] ${payload.error.message}: ${payload.error.data?.detail ?? 'unknown'}\n`);
    }
  }
}

function handleSingleMessage(message, state) {
  if (!isPlainObject(message) || message.jsonrpc !== JSONRPC_VERSION || typeof message.method !== 'string') {
    return createErrorResponse(getRequestId(message), -32600, 'Invalid Request');
  }

  const isRequest = hasRequestId(message);

  if (message.method === 'notifications/initialized') {
    state.initializedNotificationReceived = true;
    return null;
  }

  if (message.method === 'initialize') {
    const response = handleInitialize(message, state);
    state.initializeReceived = true;
    return response;
  }

  if (message.method === 'ping') {
    return isRequest ? createResultResponse(message.id, {}) : null;
  }

  if (!state.initializeReceived) {
    return isRequest
      ? createErrorResponse(message.id, -32002, 'Server not initialized')
      : null;
  }

  if (message.method === 'tools/list') {
    return isRequest
      ? createResultResponse(message.id, { tools: TOOL_DEFINITIONS })
      : null;
  }

  if (message.method === 'tools/call') {
    return isRequest
      ? createResultResponse(message.id, callTool(message.params))
      : null;
  }

  return isRequest
    ? createErrorResponse(message.id, -32601, `Method not found: ${message.method}`)
    : null;
}

function handleInitialize(message, state) {
  const requestedVersion = message.params?.protocolVersion;
  const protocolVersion = negotiateProtocolVersion(requestedVersion);

  state.negotiatedProtocolVersion = protocolVersion;

  return createResultResponse(message.id, {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: 'aihio',
      title: 'Aihio MCP Server',
      version: runtimeSchema.version,
      description: 'Schema-backed Aihio component describe and lint tools.',
    },
    instructions:
      'Use the describe tool to fetch a component schema and the lint tool to validate Aihio markup against the shipped schema rules.',
  });
}

function negotiateProtocolVersion(requestedVersion) {
  if (typeof requestedVersion === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)) {
    return requestedVersion;
  }

  return SUPPORTED_PROTOCOL_VERSIONS[0];
}

function callTool(params) {
  if (!isPlainObject(params) || typeof params.name !== 'string') {
    throw createProtocolError(-32602, 'tools/call requires a string tool name.');
  }

  if (params.name === 'describe') {
    return describeTool(params.arguments);
  }

  if (params.name === 'lint') {
    return lintTool(params.arguments);
  }

  throw createProtocolError(-32601, `Unknown tool: ${params.name}`);
}

function describeTool(argumentsObject) {
  if (!isPlainObject(argumentsObject) || typeof argumentsObject.component !== 'string') {
    return createToolError(
      'The describe tool requires a string "component" argument.',
      {
        knownComponents: KNOWN_COMPONENTS,
      }
    );
  }

  const requestedComponent = argumentsObject.component;
  const component = normalizeComponentName(requestedComponent);
  if (!component) {
    return createToolError(
      'The describe tool requires a non-empty "component" argument.',
      {
        knownComponents: KNOWN_COMPONENTS,
      }
    );
  }
  const schema = describeComponent(component);

  if (!schema) {
    return createToolError(
      `Unknown component "${requestedComponent}".`,
      {
        component,
        knownComponents: KNOWN_COMPONENTS,
      }
    );
  }

  const structuredContent = {
    component,
    schema,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
  };
}

function lintTool(argumentsObject) {
  if (!isPlainObject(argumentsObject) || typeof argumentsObject.markup !== 'string') {
    return createToolError(
      'The lint tool requires a string "markup" argument.',
      {
        source: '<inline>',
      }
    );
  }

  const source =
    typeof argumentsObject.source === 'string' && argumentsObject.source.trim().length > 0
      ? argumentsObject.source.trim()
      : '<inline>';
  const result = lintMarkup(argumentsObject.markup, { source });
  const summary = result.ok
    ? `No schema violations found in ${source}.`
    : `Found ${result.issues.length} issue(s) in ${source}.`;

  return {
    content: [
      {
        type: 'text',
        text: `${summary}\n\n${JSON.stringify(result, null, 2)}`,
      },
    ],
    structuredContent: result,
  };
}

function createToolError(message, structuredContent = {}) {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    structuredContent,
    isError: true,
  };
}

function createResultResponse(id, result) {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    result,
  };
}

function createErrorResponse(id, code, message, data) {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function createProtocolError(code, message, data) {
  const error = new Error(message);
  error.code = code;
  error.data = data;
  return error;
}

function hasRequestId(message) {
  return message && Object.hasOwn(message, 'id');
}

function getRequestId(message) {
  return hasRequestId(message) ? message.id : null;
}

function writeMessage(output, payload) {
  output.write(`${JSON.stringify(payload)}\n`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeComponentName(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.length === 0) {
    return '';
  }
  if (normalized.startsWith('aihio-')) {
    return normalized;
  }

  return `aihio-${normalized}`;
}
