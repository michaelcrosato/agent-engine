/**
 * Update trusted HUD markup while retaining matching elements, focus and pointer targets.
 * data-key (or action + id) is preferred; otherwise siblings match by tag and first class.
 * Callers must escape user-authored strings before including them in markup.
 */
export function patchMarkup(target: HTMLElement, markup: string): void {
  const template = document.createElement('template');
  template.innerHTML = markup;
  reconcile(target, template.content);
}

function key(node: Node): string {
  if (!(node instanceof Element)) return String(node.nodeType);
  const explicit = node.getAttribute('data-key') ?? node.id;
  const action = node.getAttribute('data-action');
  return `${node.tagName}:${explicit || (action ? `${action}/${node.getAttribute('data-id') ?? ''}` : (node.classList[0] ?? ''))}`;
}

function reconcile(target: Node, source: Node): void {
  const original = [...target.childNodes];
  const retained = new Set<Node>();
  let cursor = target.firstChild;
  for (const desired of [...source.childNodes]) {
    const match = original.find((node) => !retained.has(node) && key(node) === key(desired));
    const node = match ?? desired.cloneNode(true);
    retained.add(node);
    if (node !== cursor) target.insertBefore(node, cursor);
    if (match) {
      if (node instanceof Element && desired instanceof Element) {
        for (const attr of [...node.attributes])
          if (!desired.hasAttribute(attr.name)) node.removeAttribute(attr.name);
        for (const attr of [...desired.attributes])
          if (node.getAttribute(attr.name) !== attr.value) node.setAttribute(attr.name, attr.value);
        reconcile(node, desired);
      } else if (node.nodeValue !== desired.nodeValue) node.nodeValue = desired.nodeValue;
    }
    cursor = node.nextSibling;
  }
  for (const node of original) if (!retained.has(node)) target.removeChild(node);
}
