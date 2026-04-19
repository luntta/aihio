import { getSchemaVersion } from '../schema/runtime.js';

import { AihioAlert } from './alert/alert.js';
import { AihioAvatar } from './avatar/avatar.js';
import { AihioBadge } from './badge/badge.js';
import { AihioButton } from './button/button.js';
import {
  AihioCard,
  AihioCardContent,
  AihioCardDescription,
  AihioCardFooter,
  AihioCardHeader,
  AihioCardTitle,
} from './card/card.js';
import {
  AihioDialog,
  AihioDialogDescription,
  AihioDialogFooter,
  AihioDialogHeader,
  AihioDialogTitle,
} from './dialog/dialog.js';
import {
  AihioDropdown,
  AihioDropdownItem,
  AihioDropdownSeparator,
} from './dropdown/dropdown.js';
import { AihioInput } from './input/input.js';
import {
  AihioTab,
  AihioTabList,
  AihioTabPanel,
  AihioTabs,
} from './tabs/tabs.js';
import { AihioToggle } from './toggle/toggle.js';

[
  AihioAlert,
  AihioAvatar,
  AihioBadge,
  AihioButton,
  AihioCard,
  AihioDialog,
  AihioDropdown,
  AihioInput,
  AihioTabs,
  AihioToggle,
].forEach((component) => {
  const version = getSchemaVersion(component);
  if (version) {
    component.schemaVersion = version;
  }
});

export { AihioAlert };
export { AihioAvatar };
export { AihioBadge };
export { AihioButton };
export {
  AihioCard,
  AihioCardContent,
  AihioCardDescription,
  AihioCardFooter,
  AihioCardHeader,
  AihioCardTitle,
};
export {
  AihioDialog,
  AihioDialogDescription,
  AihioDialogFooter,
  AihioDialogHeader,
  AihioDialogTitle,
};
export {
  AihioDropdown,
  AihioDropdownItem,
  AihioDropdownSeparator,
};
export { AihioInput };
export {
  AihioTab,
  AihioTabList,
  AihioTabPanel,
  AihioTabs,
};
export { AihioToggle };
