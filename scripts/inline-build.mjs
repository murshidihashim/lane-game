// After `vite build`, write two self-contained files (script inlined, no other assets):
//   dist/lane-game.html  a normal web page (open it from any link or as a file)
//   dist/artifact.html   the same page as a fragment (no <html>/<head>/<body>), for hosts that
//                        wrap the page in their own document skeleton (the private preview link)
// No dependencies.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const tag = /<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/;
const m = html.match(tag);
if (!m) {
  console.error('inline-build: could not find the module script tag in dist/index.html');
  process.exit(1);
}
const js = readFileSync(join(dist, m[1]), 'utf8').replaceAll('</script', '<\\/script');
const page = html.replace(tag, () => `<script type="module">\n${js}\n</script>`);
if (/(src|href)="\.\/assets\//.test(page)) {
  console.error('inline-build: other asset references remain; add them to this script');
  process.exit(1);
}
writeFileSync(join(dist, 'lane-game.html'), page);

const pick = (re, what) => {
  const found = page.match(re);
  if (!found) { console.error(`inline-build: ${what} not found`); process.exit(1); }
  return found[1];
};
const title = pick(/(<title>[\s\S]*?<\/title>)/, '<title>');
const style = pick(/(<style>[\s\S]*?<\/style>)/, '<style>');
const theme = pick(/(<meta name="theme-color"[^>]*>)/, 'theme-color meta');
const body = pick(/<body>([\s\S]*?)<\/body>/, '<body>');
// Vite puts the module script in <head>; in the fragment it goes after the page content.
const script = `<script type="module">\n${js}\n</script>`;
writeFileSync(join(dist, 'artifact.html'), `${title}\n${theme}\n${style}\n${body.trim()}\n${script}\n`);
console.log(`inline-build: dist/lane-game.html (${Math.round(page.length / 1024)} KB), dist/artifact.html`);
