import classes from "../css/aihio.css";

import { AihioAlert } from "../components/alert/alert.js";
window.customElements.define('aihio-alert', AihioAlert);

import { AihioBadge } from "../components/badge/badge.js";
window.customElements.define('aihio-badge', AihioBadge);

export default () => {
    console.log("Aihio export", classes);
};
