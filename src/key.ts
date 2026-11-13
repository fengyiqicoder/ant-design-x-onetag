// Which OneTag key the demo page uses.
//   pageKey  a key built into the page at deploy time (the GitHub Pages build sets it)
//   stored   a key the visitor pasted on this page
//   demoKey  the shared demo key, which only answers on localhost
// The deploy build replaces every 'YOUR_ONETAG_KEY' string with the real key, so the
// placeholder is recognised by its prefix, which the build leaves alone.
const isPlaceholder = (k: string) => k.startsWith('YOUR_');
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;

export function pickKey(o: { hostname: string; pageKey?: string; stored?: string; demoKey?: string }): string {
  if (o.pageKey && !isPlaceholder(o.pageKey)) return o.pageKey;
  if (o.stored) return o.stored;
  if (LOCAL.test(o.hostname) && o.demoKey) return o.demoKey;
  return '';
}
