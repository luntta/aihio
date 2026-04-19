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
    | 'a11y-contract';
  severity: 'error' | 'warn';
  component: string | null;
  message: string;
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
