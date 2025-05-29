import { htmlBody, escapeHtml } from './html';

describe('view/html', () => {
  describe('htmlBody', () => {
    it('wraps inner HTML with proper doctype and html tags', () => {
      const inner = '<p>Test</p>';
      const expected = `<!doctype html>\n<html><head><meta charset='utf-8'><title>RAG Ask</title></head><body><p>Test</p></body></html>`;
      expect(htmlBody(inner)).toBe(expected);
    });
  });

  describe('escapeHtml', () => {
    it('escapes special HTML characters', () => {
      const text = `<div class="test">It's & good</div>`;
      const escaped = '&lt;div class=&quot;test&quot;&gt;It&#39;s &amp; good&lt;/div&gt;';
      expect(escapeHtml(text)).toBe(escaped);
    });
  });
});