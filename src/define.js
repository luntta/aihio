import * as components from './components/index.js';
import { registerAll } from './registry.js';
import { describe, runtimeSchema } from './schema/runtime.js';

export function defineAll() {
  return registerAll(Object.values(components));
}

export const Aihio = globalThis.Aihio ?? {};
Aihio.describe = describe;
Aihio.defineAll = defineAll;
Aihio.schema = runtimeSchema;

if (typeof globalThis !== 'undefined') {
  globalThis.Aihio = Aihio;
}

defineAll();

export { describe };
export * from './components/index.js';
