import type { AihioA11yRuleId, AihioButtonProps, AihioInput } from 'aihio';
import { AihioDialog } from 'aihio/dialog';

declare const input: AihioInput;

const currentValue: string = input.value;
const defaultValue: string = input.defaultValue;
const form: HTMLFormElement | null = input.form;
const validity: ValidityState | null = input.validity;
const valid: boolean = input.checkValidity();
const reported: boolean = input.reportValidity();
const a11yRule: AihioA11yRuleId = 'input-label';

// @ts-expect-error schema-generated read-only properties cannot be assigned
input.form = null;

input.setCustomValidity('Try another value.');
input.focus({ preventScroll: true });

const buttonProps: AihioButtonProps = {
  type: 'submit',
  formmethod: 'post',
  formnovalidate: true,
};

const dialog = new AihioDialog();
dialog.close({ restoreFocus: false, reason: 'test' });

const jsx = <aihio-button type="submit" formmethod="post">Save</aihio-button>;

void [currentValue, defaultValue, form, validity, valid, reported, a11yRule, buttonProps, dialog, jsx];
