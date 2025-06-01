export function htmlBody(inner: string): string {
  return `<!doctype html>\n<html><head><meta charset='utf-8'><title>RAG Ask</title></head><body>${inner}</body></html>`;
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (s) => {
    switch (s) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return s;
    }
  });
}