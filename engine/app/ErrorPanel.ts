/** On-screen list of teaching errors (content, systems, boot). Visible in screenshots too. */
export class ErrorPanel {
  private readonly el: HTMLElement;
  private readonly shown = new Set<string>();

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'engine-errors';
    parent.appendChild(this.el);
  }

  show(message: string): void {
    if (this.shown.has(message)) return;
    this.shown.add(message);
    const pre = document.createElement('pre');
    pre.textContent = message;
    pre.title = 'Click to dismiss';
    pre.onclick = () => {
      pre.remove();
      this.shown.delete(message);
    };
    this.el.appendChild(pre);
  }

  clear(): void {
    this.el.replaceChildren();
    this.shown.clear();
  }
}
