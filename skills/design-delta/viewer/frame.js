// Inline this at the very top of <head> in every Real or Rebuilt state file
// (c<N>/before.html, c<N>/after.html). It speaks the viewer's protocol:
//   frame → viewer  { dd: 'size', top, h, w }   the shown content's box, in px
//   viewer → frame  { dd: 'theme', value }      'light' | 'dark' | null (system)
//   viewer → frame  { dd: 'ping' }              send the size again
// Set SHOW to isolate part of a full page: SECTIONS selects the page's sibling
// blocks, SHOW lists the ones this Change is about; every other one is hidden.
// Leave SHOW empty for a state file that is already just the surface.
(function () {
  var SECTIONS = '';  // e.g. '#main>div>section'
  var SHOW = [];      // e.g. ['#pricing']
  var HIDE = '';      // e.g. 'body header:not(main header), body footer:not(main footer)'
  if (SHOW.length) {
    var css = SECTIONS + SHOW.map(function (s) { return ':not(' + s + ')' }).join('') + '{display:none!important}'
      + SECTIONS + SHOW[0] + '{margin-top:0!important}' + (HIDE ? HIDE + '{display:none!important}' : '')
      + 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}';
    document.write('<style id="dd-isolate">' + css + '</style>');
  }
  function shown() {
    if (!SHOW.length) return [document.body];
    return Array.prototype.filter.call(document.querySelectorAll(SECTIONS), function (s) { return getComputedStyle(s).display !== 'none' });
  }
  var last = '';
  function size() {
    var s = shown(); if (!s.length) return;
    var top = SHOW.length ? Math.floor(s[0].getBoundingClientRect().top + scrollY) : 0;
    var bot = Math.ceil(s[s.length - 1].getBoundingClientRect().bottom + scrollY);
    var k = top + ':' + bot; if (k === last) return; last = k;
    parent.postMessage({ dd: 'size', top: top, h: bot, w: document.documentElement.scrollWidth }, '*');
  }
  addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.dd === 'theme') { if (m.value) document.documentElement.setAttribute('data-theme', m.value); else document.documentElement.removeAttribute('data-theme') }
    if (m.dd === 'ping') { last = ''; size() }
  });
  addEventListener('DOMContentLoaded', function () { size(); try { new ResizeObserver(size).observe(document.body) } catch (e) {} });
  addEventListener('load', size);
  addEventListener('resize', size);
})();
