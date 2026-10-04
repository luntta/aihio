import { lintMarkup } from '../lint/index.js';
import { describe as describeComponent, runtimeSchema } from '../schema/runtime.js';
import { authoringPrompt, find, getPattern, listComponents, listPatterns } from './catalog.js';

const JSONRPC_VERSION = '2.0';
const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

const KNOWN_COMPONENTS = runtimeSchema.components.map((component) => component.$component);

const PROMPT_NAME = 'aihio-authoring';
export const PROMPT_DEFINITION = {
  name: PROMPT_NAME,
  title: 'Aihio authoring guide',
  description:
    'The canonical prompt fragment for generating Aihio markup: strategy, authoring rules, component inventory, intent map, pattern inventory, accessibility obligations, hard rules from counterexamples, and the semantic token vocabulary.',
};

const NO_ARGUMENTS = { type: 'object', properties: {}, additionalProperties: false };

export const TOOL_DEFINITIONS = [
  {
    name: 'find',
    title: 'Find Aihio Components and Patterns',
    description:
      'Start here. Given what the UI has to do — free text such as "confirm before deleting a project", or an intent name such as "destructive-action" — return the best-matching components and canonical patterns. Adapt a returned pattern with get_pattern rather than composing from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What the UI should do, in plain words, or one intent name from the vocabulary.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_components',
    title: 'List Aihio Components',
    description: 'List every top-level Aihio component with its one-line purpose, intents, commands, and subcomponents.',
    inputSchema: NO_ARGUMENTS,
  },
  {
    name: 'list_patterns',
    title: 'List Aihio Patterns',
    description: 'List the canonical multi-component patterns (auth form, settings section, destructive confirmation, ...) with their purpose and intents.',
    inputSchema: NO_ARGUMENTS,
  },
  {
    name: 'get_pattern',
    title: 'Get Aihio Pattern',
    description: 'Return a canonical pattern\'s complete, lint-clean markup and its variations. Adapt it instead of freehanding the structure.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Pattern id, e.g. "destructive-confirmation". list_patterns returns them all.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
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
    description: 'Validate markup against the Aihio schema and return structured issues. Run it on every snippet before returning it; an issue with a "suggestion" can be fixed by applying that replacement.',
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

  if (message.method === 'prompts/list') {
    return isRequest
      ? createResultResponse(message.id, { prompts: [PROMPT_DEFINITION] })
      : null;
  }

  if (message.method === 'prompts/get') {
    return isRequest
      ? createResultResponse(message.id, getPrompt(message.params))
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
      prompts: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: 'aihio',
      title: 'Aihio MCP Server',
      version: runtimeSchema.version,
      description: 'Schema-backed discovery, description, and linting for Aihio markup.',
    },
    instructions:
      'To build UI with Aihio: call find with what the UI has to do, start from a returned pattern (get_pattern) when one fits, check component APIs with describe, and run lint on every snippet before returning it, applying any issue\'s suggestion. The aihio-authoring prompt carries the full authoring rules.',
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

  if (params.name === 'find') {
    return findTool(params.arguments);
  }

  if (params.name === 'list_components') {
    return toolResult({ components: listComponents() });
  }

  if (params.name === 'list_patterns') {
    return toolResult({ patterns: listPatterns() });
  }

  if (params.name === 'get_pattern') {
    return getPatternTool(params.arguments);
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

function findTool(argumentsObject) {
  if (!isPlainObject(argumentsObject) || typeof argumentsObject.query !== 'string' || !argumentsObject.query.trim()) {
    return createToolError('The find tool requires a non-empty string "query" argument.');
  }

  const result = find(argumentsObject.query);
  if (result.components.length === 0 && result.patterns.length === 0) {
    return createToolError(
      `Nothing matched "${result.query}". Try other words, an intent name, or list_components.`,
      { ...result, intents: runtimeSchema.intents ?? [] }
    );
  }
  return toolResult(result);
}

function getPatternTool(argumentsObject) {
  const id = isPlainObject(argumentsObject) && typeof argumentsObject.id === 'string'
    ? argumentsObject.id.trim()
    : '';
  const pattern = id ? getPattern(id) : null;

  if (!pattern) {
    return createToolError(
      id ? `Unknown pattern "${id}".` : 'The get_pattern tool requires a string "id" argument.',
      { knownPatterns: listPatterns().map((entry) => entry.id) }
    );
  }
  return toolResult(pattern);
}

function getPrompt(params) {
  if (!isPlainObject(params) || params.name !== PROMPT_NAME) {
    throw createProtocolError(-32602, `Unknown prompt: ${params?.name}. Available: ${PROMPT_NAME}.`);
  }

  return {
    description: PROMPT_DEFINITION.description,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: authoringPrompt },
      },
    ],
  };
}

function toolResult(structuredContent) {
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
