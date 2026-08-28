// Development counterpart to src/components/index.js: the same classes, with
// schema-backed warnings installed.
import { installDevWarnings } from '../schema/dev-warnings.js';

export * from './index.js';

installDevWarnings();
