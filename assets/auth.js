/* MiTechShots sign-in: Clerk session in the header, soft wall after the free guides. */
(function () {
  var C = window.MT_AUTH || {};
  if (!C.key || window.__mtAuth) return;
  window.__mtAuth = true;
  var FREE = C.free || 2, LS = 'mt_guides_read';

  // 1. count distinct guides read on this device; the first FREE stay free forever
  var seen = [];
  try { seen = JSON.parse(localStorage.getItem(LS)) || []; } catch (e) {}
  var over = false;
  if (C.guide) {
    if (seen.indexOf(C.guide) < 0) {
      seen.push(C.guide);
      try { localStorage.setItem(LS, JSON.stringify(seen)); } catch (e) {}
    }
    over = seen.indexOf(C.guide) >= FREE;
  }

  // 2. styles
  var css = document.createElement('style');
  css.textContent = [
    '#mt-user { display: flex; align-items: center; flex-shrink: 0; min-height: 36px; }',
    '.mt-signin { font: 700 12px/1 "DM Sans", system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; padding: 10px 16px; border-radius: 999px; border: 1.5px solid #a9471f; background: transparent; color: #a9471f; cursor: pointer; white-space: nowrap; }',
    '.mt-signin:hover, .mt-signin:focus-visible { background: #a9471f; color: #fff; outline: none; }',
    '.mt-wall { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(43,33,23,.55); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); font-family: "DM Sans", system-ui, sans-serif; }',
    '.mt-wall-card { background: #fcf8f2; color: #2f2619; border-radius: 26px; max-width: 440px; width: 100%; padding: 34px 32px 26px; box-shadow: 0 24px 60px rgba(43,33,23,.35); text-align: center; border: 1px solid #e3d3bd; }',
    '.mt-wall-badge { display: inline-block; background: #dccfe8; color: #5e4580; font-weight: 700; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; }',
    '.mt-wall h2 { font-family: "Fraunces", Georgia, serif; font-weight: 800; font-size: 30px; line-height: 1.1; margin: 16px 0 10px; color: #2f2619; }',
    '.mt-wall p { font-size: 16px; line-height: 1.6; color: #66594a; margin: 0 0 22px; }',
    '.mt-wall-actions { display: grid; gap: 10px; }',
    '.mt-wall-actions button { font: 700 15px/1 "DM Sans", system-ui, sans-serif; padding: 15px 18px; border-radius: 999px; cursor: pointer; }',
    '.mt-wall-primary { background: #a9471f; color: #fff; border: 1.5px solid #a9471f; }',
    '.mt-wall-primary:hover, .mt-wall-primary:focus-visible { background: #8a3716; outline: none; }',
    '.mt-wall-secondary { background: transparent; color: #2f2619; border: 1.5px solid #e3d3bd; }',
    '.mt-wall-secondary:hover, .mt-wall-secondary:focus-visible { border-color: #a9471f; outline: none; }',
    '.mt-wall-later { margin-top: 14px; background: none; border: 0; color: #66594a; font: 500 14px "DM Sans", system-ui, sans-serif; text-decoration: underline; cursor: pointer; padding: 6px; }',
    '.mt-wall-later:hover { color: #2f2619; }'
  ].join('\n');
  document.head.appendChild(css);

  // 3. load Clerk from its Frontend API host, which is encoded in the publishable key
  var fapi;
  try { fapi = atob(C.key.split('_')[2]).replace(/\$$/, ''); } catch (e) { return; }
  function load(src, attrs) {
    return new Promise(function (ok, fail) {
      var el = document.createElement('script');
      el.src = src; el.async = true; el.crossOrigin = 'anonymous';
      for (var k in attrs || {}) el.setAttribute(k, attrs[k]);
      el.onload = ok; el.onerror = fail;
      document.head.appendChild(el);
    });
  }
  function slot() { return document.getElementById('mt-user'); }
  var here = function () { return location.href; };

  function renderUser() {
    var el = slot(); if (!el) return;
    if (el.__mounted) { try { window.Clerk.unmountUserButton(el); } catch (e) {} el.__mounted = false; }
    el.innerHTML = '';
    if (window.Clerk.user) {
      window.Clerk.mountUserButton(el, { afterSignOutUrl: here() });
      el.__mounted = true;
    } else {
      var b = document.createElement('button');
      b.className = 'mt-signin'; b.type = 'button'; b.textContent = 'Sign in';
      b.onclick = function () { window.Clerk.openSignIn({ fallbackRedirectUrl: here(), signUpFallbackRedirectUrl: here() }); };
      el.appendChild(b);
    }
  }

  var wall = null, lastFocus = null;
  function closeWall() {
    if (!wall) return;
    wall.remove(); wall = null;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) { if (e.key === 'Escape') closeWall(); }
  function showWall() {
    if (wall) return;
    lastFocus = document.activeElement;
    wall = document.createElement('div');
    wall.className = 'mt-wall';
    wall.innerHTML =
      '<div class="mt-wall-card" role="dialog" aria-modal="true" aria-labelledby="mt-wall-title" tabindex="-1">' +
      '<span class="mt-wall-badge">Free account</span>' +
      '<h2 id="mt-wall-title">Keep learning with MiTechShots</h2>' +
      '<p>You have read your ' + FREE + ' free guides. Sign in or create a free account to keep reading every guide, with tested code and interview questions.</p>' +
      '<div class="mt-wall-actions">' +
      '<button type="button" class="mt-wall-primary" data-act="up">Create free account</button>' +
      '<button type="button" class="mt-wall-secondary" data-act="in">I already have an account</button>' +
      '</div>' +
      '<button type="button" class="mt-wall-later" data-act="later">Maybe later</button>' +
      '</div>';
    wall.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (e.target === wall || act === 'later') return closeWall();
      var opts = { fallbackRedirectUrl: here(), signUpFallbackRedirectUrl: here(), signInFallbackRedirectUrl: here() };
      if (act === 'up') { closeWall(); window.Clerk.openSignUp(opts); }
      if (act === 'in') { closeWall(); window.Clerk.openSignIn(opts); }
    });
    document.body.appendChild(wall);
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    wall.querySelector('.mt-wall-primary').focus();
  }

  function start() {
    renderUser();
    var wasIn = !!window.Clerk.user;
    window.Clerk.addListener(function (r) {
      var isIn = !!(r && r.user);
      if (isIn !== wasIn) { wasIn = isIn; renderUser(); if (isIn) closeWall(); }
    });
    if (over && !window.Clerk.user) showWall();
  }

  var base = 'https://' + fapi + '/npm/';
  load(base + '@clerk/ui@1/dist/ui.browser.js')
    .then(function () { return load(base + '@clerk/clerk-js@6/dist/clerk.browser.js', { 'data-clerk-publishable-key': C.key }); })
    .then(function () { return window.Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        appearance: { variables: {
          colorPrimary: '#a9471f', colorText: '#2f2619', colorTextSecondary: '#66594a',
          colorBackground: '#fcf8f2', colorInputBackground: '#ffffff', colorInputText: '#2f2619',
          fontFamily: '"DM Sans", system-ui, sans-serif', borderRadius: '12px' } }
      }); })
    .then(start)
    .catch(function () { /* sign-in unavailable: never block reading */ });
})();
