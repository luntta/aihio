// Development entry: everything the production entry exports, plus the
// schema-backed warnings switched on.
//
//   import '@luntta/aihio/dev';   // instead of '@luntta/aihio'
//
// Ship dist/aihio.js in production; this bundle is unminified and carries the
// warning machinery that the production bundle deliberately does not include.
import { installDevWarnings } from './schema/dev-warnings.js';

export * from './define.js';

installDevWarnings();
