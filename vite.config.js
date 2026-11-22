import { defineConfig } from 'vite';

// Fills the <!--slot:name--> markers in index.html with HTML rendered from src/content.js,
// so the page reads without JavaScript. Pages under dev/ are work benches and get no slots.
function staticContent() {
  return {
    name: 'static-content',
    async transformIndexHtml(html, ctx) {
      if (!html.includes('<!--slot:')) return html;
      const r = await ctx.server?.ssrLoadModule('/src/render.js') ?? (await import('./src/render.js'));
      return html.replace(/<!--slot:(\w+)-->/g, (_, k) => r[k]());
    },
  };
}

export default defineConfig({
  plugins: [staticContent()],
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
