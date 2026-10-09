import type { AihioA11yRuleId, AihioButtonProps, AihioInput } from '@luntta/aihio';
import { AihioDialog } from '@luntta/aihio/dialog';
import { AihioTable } from '@luntta/aihio/table';
import { AihioDataGrid } from '@luntta/aihio/data-grid';
import { AihioPagination } from '@luntta/aihio/pagination';
import { AihioDatePicker } from '@luntta/aihio/date-picker';
import { AihioCalendar } from '@luntta/aihio/calendar';

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

const table = new AihioTable();
const tableElement: HTMLTableElement | null = table.table;
table.sort('amount');
table.sort('amount', 'descending');
// @ts-expect-error a sort runs ascending or descending
table.sort('amount', 'down');
// @ts-expect-error schema-generated read-only properties cannot be assigned
table.table = null;
const tableJsx = (
  <aihio-table density="compact" sticky-header manual-sort sort-ascending-text="Nouseva: {column}">
    <table aria-label="Invoices" />
  </aihio-table>
);
// @ts-expect-error density is default or compact
const badDensity = <aihio-table density="dense" />;

const grid = new AihioDataGrid();
const window: [number, number] = [grid.start, grid.end];
const gridBody: HTMLTableSectionElement | null = grid.body;
grid.rowCount = 100000;
grid.scrollToRow(50000);
// @ts-expect-error the rows asked for are the grid's to say
grid.start = 10;
const gridJsx = <aihio-data-grid row-count={100000} density="compact"><table aria-label="Requests" /></aihio-data-grid>;

const pagination = new AihioPagination();
pagination.page = 3;
const pages: number = pagination.pages;
const paginationJsx = <aihio-pagination page={3} pages={12} href="/invoices?page={page}" aria-label="Invoice pages" />;

const picker = new AihioDatePicker();
picker.value = '2026-10-09';
const pickedDate: Date | null = picker.valueAsDate;
picker.isDateDisabled = (date) => date.endsWith('-25');
picker.isDateDisabled = null;
// @ts-expect-error isDateDisabled is called with a YYYY-MM-DD string
picker.isDateDisabled = (date: Date) => date.getUTCDay() === 0;
const pickerControl: HTMLInputElement | null = picker.control;
picker.open();
const pickerJsx = <aihio-date-picker name="due" value="2026-10-09" min="2026-10-01" first-day-of-week="mon" size="sm" />;
// @ts-expect-error first-day-of-week is a three-letter day
const badWeekStart = <aihio-date-picker first-day-of-week="monday" />;

const calendar = new AihioCalendar();
calendar.month = '2026-12';
const shownMonth: string = calendar.month;
const calendarJsx = <aihio-calendar aria-label="Delivery day" name="day" readonly first-day-of-week="sun" />;

void [currentValue, defaultValue, form, validity, valid, reported, a11yRule, buttonProps, dialog, jsx, tableElement, tableJsx, badDensity, window, gridBody, gridJsx, pages, paginationJsx, pickedDate, pickerControl, pickerJsx, badWeekStart, shownMonth, calendarJsx];
