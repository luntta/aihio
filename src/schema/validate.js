// Minimal JSON Schema validator. Covers only the subset used in meta-schema.json
// (type, enum, const, pattern, required, properties, additionalProperties, items,
// minItems, minLength, uniqueItems, $ref to #/$defs/*). Fails fast on unsupported keywords
// so the meta-schema cannot silently grow past what we check.

const SUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'enum',
  'const',
  'pattern',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'minItems',
  'minLength',
  'uniqueItems',
]);

export function validate(meta, value) {
  const errors = [];
  walk(meta, meta, value, '', errors);
  return errors;
}

function walk(root, schema, value, path, errors) {
  if (schema.$ref) {
    const resolved = resolveRef(root, schema.$ref);
    if (!resolved) {
      errors.push({ path, message: `unresolved $ref ${schema.$ref}` });
      return;
    }
    walk(root, resolved, value, path, errors);
    return;
  }

  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) {
      throw new Error(`Meta-schema uses unsupported keyword '${key}' at ${path || '/'}`);
    }
  }

  if (schema.type && !matchesType(schema.type, value)) {
    errors.push({ path, message: `expected type ${schema.type}, got ${describe(value)}` });
    return;
  }

  if (schema.enum && !schema.enum.some((v) => deepEqual(v, value))) {
    errors.push({ path, message: `value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}` });
  }

  if (schema.const !== undefined && !deepEqual(schema.const, value)) {
    errors.push({ path, message: `value ${JSON.stringify(value)} does not match const ${JSON.stringify(schema.const)}` });
  }

  if (schema.type === 'string' || typeof value === 'string') {
    if (typeof value === 'string' && schema.minLength != null && value.length < schema.minLength) {
      errors.push({ path, message: `string shorter than minLength ${schema.minLength}` });
    }
    if (typeof value === 'string' && schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) {
        errors.push({ path, message: `string ${JSON.stringify(value)} does not match pattern ${schema.pattern}` });
      }
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push({ path, message: `array shorter than minItems ${schema.minItems}` });
    }
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push({ path, message: `array contains duplicate item ${key}` });
          break;
        }
        seen.add(key);
      }
    }
    if (schema.items) {
      value.forEach((item, index) => {
        walk(root, schema.items, item, `${path}/${index}`, errors);
      });
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const props = schema.properties ?? {};
    const required = schema.required ?? [];
    const additional = schema.additionalProperties;

    for (const name of required) {
      if (!(name in value)) {
        errors.push({ path, message: `missing required property ${JSON.stringify(name)}` });
      }
    }

    for (const [name, child] of Object.entries(value)) {
      const childPath = `${path}/${name}`;
      if (props[name]) {
        walk(root, props[name], child, childPath, errors);
      } else if (additional === false) {
        errors.push({ path: childPath, message: `additional property not allowed` });
      } else if (additional && typeof additional === 'object') {
        walk(root, additional, child, childPath, errors);
      }
    }
  }
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) return null;
  const segments = ref.slice(2).split('/');
  let node = root;
  for (const segment of segments) {
    node = node?.[segment];
    if (node == null) return null;
  }
  return node;
}

function matchesType(type, value) {
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'null') return value === null;
  return false;
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function deepEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  if (left && right && typeof left === 'object') {
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }
  return false;
}
