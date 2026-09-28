export interface AihioLintLocation {
  offset: number;
  line: number;
  column: number;
}

export interface AihioLintIssue {
  ruleId:
    | 'unknown-component'
    | 'invalid-enum-attribute'
    | 'invalid-parent'
    | 'missing-required-ancestor'
    | 'missing-required-slot'
    | 'invalid-slot'
    | 'missing-required-child'
    | 'invalid-child'
    | 'forbidden-descendant'
    | 'a11y-contract'
    | 'unknown-intent'
    | 'intent-mismatch'
    | 'invalid-command'
    | 'unknown-attribute';
  severity: 'error' | 'warn';
  component: string | null;
  message: string;
  /** Replacement for the offending tag, attribute, or value, as markup. Present only when the fix is unambiguous. */
  suggestion?: string;
  path: string;
  location: AihioLintLocation;
  source: string;
}

export interface AihioLintResult {
  ok: boolean;
  source: string;
  issues: AihioLintIssue[];
}

export interface AihioLintOptions {
  source?: string;
}

export function lintMarkup(markup: string, options?: AihioLintOptions): AihioLintResult;
