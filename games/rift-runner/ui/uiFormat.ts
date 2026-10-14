export function uiFormat(value: number): string {
  if (value < 1000) return String(Math.round(value));
  if (value < 1e6) return `${(value / 1000).toFixed(1)}k`;
  if (value < 1e9) return `${(value / 1e6).toFixed(1)}m`;
  return value.toExponential(1);
}
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function clockText(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}
