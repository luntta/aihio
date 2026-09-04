const owners = new Set();
let previousOverflow = '';

export function lockDocumentScroll(owner) {
  if (!owner || typeof document === 'undefined' || owners.has(owner)) return;
  if (owners.size === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  owners.add(owner);
}

export function unlockDocumentScroll(owner) {
  if (!owners.delete(owner) || typeof document === 'undefined') return;
  if (owners.size === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = '';
  }
}

export function isTopOverlay(owner) {
  return [...owners].at(-1) === owner;
}
