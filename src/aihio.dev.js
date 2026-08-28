// Development entry: everything the production entry exports, plus the
// schema-backed warnings switched on.
//
//   import 'aihio/dev';   // instead of 'aihio'
//
// Ship dist/aihio.js in production; this bundle is unminified and carries the
// warning machinery that the production bundle deliberately does not include.
import { installDevWarnings } from './schema/dev-warnings.js';

export * from './define.js';

installDevWarnings();
