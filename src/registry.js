export function register(component) {
  const tag = component.tag;
  if (!tag || typeof customElements === 'undefined') return false;
  if (customElements.get(tag)) return false;
  customElements.define(tag, component);
  return true;
}

export function registerAll(components) {
  return components.map(register);
}
