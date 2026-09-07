export function revealFirstEditorError(errors) {
  requestAnimationFrame(() => {
    const message = Array.isArray(errors) ? String(errors[0] || '') : Object.values(errors || {}).find(Boolean) || '';
    const indexedLabel = message.match(/\b(Question|Gap|Statement|Sentence|Recording|Speaker|Heading|Paragraph|Member)\s+(\d+)/i);
    const groups = [...document.querySelectorAll('main details[data-collapsible]')];
    const group = indexedLabel
      ? groups.find(item => item.dataset.title?.toLowerCase().startsWith(`${indexedLabel[1].toLowerCase()} ${indexedLabel[2]}`)) || groups[0]
      : groups[0];
    if (group) { group.open = true; group.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    group?.querySelector('input,textarea,button[aria-haspopup="listbox"]')?.focus({ preventScroll: true });
  });
}
