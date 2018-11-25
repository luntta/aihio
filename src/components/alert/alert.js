import styles from './alert.css';

export class AihioAlert extends HTMLElement {
    constructor() {
        super();
        console.log("Constructor: AihioAlert");

        this.classList.add(styles.alert);

        if (!this.getAttribute('role')) this.setAttribute('role', 'alert');

        if (this.getAttribute('dismissable')) {
            document.createElement('aihio-button');
        };

        if (!this.getAttribute('type')) this.setAttribute('type', 'info');
    };
};
