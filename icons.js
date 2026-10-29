// Castle Siege — shared SVG icon sprite (line icons, team crests, emblem).
// Used by index_3d.html and guide.html via <use href="#i-...">. Injected
// as soon as <body> exists; <use> references resolve once it's there.
(function(){
  const SPRITE=`<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".5" stop-color="#d9b25f"/><stop offset="1" stop-color="#7a5a1c"/></linearGradient>
    <linearGradient id="g-p1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0ff"/><stop offset="1" stop-color="#122a66"/></linearGradient>
    <linearGradient id="g-p2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a9c"/><stop offset="1" stop-color="#661226"/></linearGradient>
  </defs>
  <symbol id="i-turret" viewBox="0 0 24 24"><path d="M6 21V10h12v11M4.5 10V5.5h2.5v2h2.5v-2h5v2h2.5v-2h2.5V10M10 21v-3.5a2 2 0 0 1 4 0V21M3 21h18M9 13h.01M15 13h.01"/></symbol>
  <symbol id="i-banner" viewBox="0 0 24 24"><path d="M6 22V2.5M6 4h12l-2.5 4 2.5 4H6M4 22h5"/><path d="M10 7.2l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" stroke-width="1.2"/></symbol>
  <symbol id="i-magic" viewBox="0 0 24 24"><path d="M12 2.5l2.6 4.6L12 11.7 9.4 7.1z M12 11.7V21M8.5 21h7M10 15h4M4.5 5.5l1.2 1.2M19.5 5.5l-1.2 1.2M3.5 10.5h2M18.5 10.5h2"/></symbol>
  <symbol id="i-catapult" viewBox="0 0 24 24"><path d="M3 20.5h18M5.5 20.5l3-6h7l3 6M8.5 14.5L18 5.5M8.5 14.5l-2.5-2M12 14.5V11"/><circle cx="19" cy="4.8" r="2"/></symbol>
  <symbol id="i-bombard" viewBox="0 0 24 24"><path d="M9.5 13.5l9-6.5 2 3-9 6.5M4 20.5h12"/><circle cx="9" cy="16" r="3.5"/><circle cx="9" cy="16" r="1"/><path d="M20.5 5.5l1-1.5M21.8 8l1.5-.4"/></symbol>
  <symbol id="i-wall" viewBox="0 0 24 24"><path d="M3 9h18v12H3zM3 13h18M3 17h18M8 9v4M14 9v4M11 13v4M17 13v4M8 17v4M14 17v4M3 9V5.5h3V9M9 9V5.5h3V9M15 9V5.5h3V9M21 9V5.5"/></symbol>
  <symbol id="i-barricade" viewBox="0 0 24 24"><path d="M3 20h18M5 20l3.5-12M10.5 20l2-14M15 20l1.5-11M19.5 20l-1.8-10M3.5 14.5l17-2"/></symbol>
  <symbol id="i-goblin" viewBox="0 0 24 24"><path d="M7.5 10.5a4.5 4.5 0 0 1 9 0v2.5a4.5 4.5 0 0 1-9 0z M7.5 10.5L2 7.5l4.2 6 M16.5 10.5l5.5-3-4.2 6 M10 12h.01M14 12h.01M10.5 15.5l1.5 1 1.5-1"/></symbol>
  <symbol id="i-orc" viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0v3.5a6 6 0 0 1-12 0z M9 18.5l-.8-3.5M15 18.5l.8-3.5 M8.5 11h2.5M13 11h2.5M7 6.5L5 4M17 6.5L19 4"/></symbol>
  <symbol id="i-knight" viewBox="0 0 24 24"><path d="M6 21V11a6 6 0 0 1 12 0v10z M6 14h12M10.5 14v3M13.5 14v3M12 5V2.5M9 3.5c1-1 5-1 6 0"/></symbol>
  <symbol id="i-archer" viewBox="0 0 24 24"><path d="M6.5 3c7.5 3 7.5 15 0 18M6.5 3v18M3 12h16M16 9l3 3-3 3M3 10.5L4.5 12 3 13.5"/></symbol>
  <symbol id="i-sapper" viewBox="0 0 24 24"><circle cx="10" cy="14.5" r="6.5"/><path d="M14.5 9.5l2.5-2.5M17 7c1-1 2.5-1 3.5 0M19.5 4.5l.8-1.6M21.4 6.6l1.6-.8M8 12.5a3 3 0 0 1 2.5-1.5"/></symbol>
  <symbol id="i-troll" viewBox="0 0 24 24"><path d="M4.5 20.5l7-7M10.5 14.5c-1.3-4 1.8-9.3 6.3-10.3 2.3.7 3.6 3 2.7 5.4-1.3 4-5.5 6.2-9 4.9zM14 6.5l.01.01M17 9.5l.01.01M13 10l.01.01"/></symbol>
  <symbol id="i-dragon" viewBox="0 0 24 24"><path d="M2.5 19c4-1 6.5-4.5 7.5-9 2 3 5 4.4 9 4.3-1.4-2.6-.8-6 2.5-8.6-3.5-.3-6.5.8-8.5 2.8-1-3-3.3-5.2-6.5-6 1.2 4.3.3 9.8-4 16.5z M10 10l2.5 2.5"/></symbol>
  <symbol id="i-lich" viewBox="0 0 24 24"><path d="M7 12a5 5 0 0 1 10 0v3.5h-2V19H9v-3.5H7z M10 13h.01M14 13h.01M11 16.5h2 M7.5 7.5L9.5 9l2.5-3.5L14.5 9l2-1.5"/></symbol>
  <symbol id="i-meteor" viewBox="0 0 24 24"><circle cx="15.5" cy="8.5" r="4.5"/><path d="M12.3 11.7L3.5 20.5M11 7L5 13M17 13l-6 6M14 7.5l.01.01M16.5 10l.01.01"/></symbol>
  <symbol id="i-lightning" viewBox="0 0 24 24"><path d="M13.5 2L5 13.5h6.2L10 22l9-12.2h-6.3z"/></symbol>
  <symbol id="i-freeze" viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9 3.8l3 2.2 3-2.2M9 20.2l3-2.2 3 2.2M3.5 10.5l3.4-.9-.9-3.4M20.5 13.5l-3.4.9.9 3.4"/></symbol>
  <symbol id="i-heal" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.4a4.1 4.1 0 0 1 7.5-2.4 4.1 4.1 0 0 1 7.5 2.4c0 5.8-7.5 10.4-7.5 10.4z M12 9.5v5.5M9.3 12.2h5.4"/></symbol>
  <symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l10 18H2z M12 10v5M12 18h.01"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></symbol>
  <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/></symbol>
  <symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="url(#g-gold)" stroke="#5a400f" stroke-width="1.2"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#8a6a2c" stroke-width="1.2"/><path d="M12 8.5v7M10 10.2c0-1 4-1 4 .2s-4 1-4 2.4 4 1.3 4 .2" fill="none" stroke="#5a400f" stroke-width="1.2" stroke-linecap="round"/></symbol>
  <symbol id="crest-p1" viewBox="0 0 56 66"><path d="M4 4h48v26c0 16-11 26-24 32C15 56 4 46 4 30z" fill="url(#g-p1)" stroke="url(#g-gold)" stroke-width="3"/><path d="M28 14l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="url(#g-gold)" stroke="#2a1d08" stroke-width="1"/><path d="M10 10h36" stroke="rgba(255,255,255,.25)" stroke-width="2"/></symbol>
  <symbol id="crest-p2" viewBox="0 0 56 66"><path d="M4 4h48v26c0 16-11 26-24 32C15 56 4 46 4 30z" fill="url(#g-p2)" stroke="url(#g-gold)" stroke-width="3"/><path d="M15 38l4-18 6 8 3-12 3 12 6-8 4 18z" fill="url(#g-gold)" stroke="#2a1d08" stroke-width="1"/><path d="M10 10h36" stroke="rgba(255,255,255,.25)" stroke-width="2"/></symbol>
  <symbol id="i-emblem" viewBox="0 0 64 64"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10l34 34M54 10L20 44"/><path d="M40 48l8-8M24 48l-8-8M44 44l6 6M20 44l-6 6"/><path d="M32 18l12 4v10c0 9-5 15-12 18-7-3-12-9-12-18V22z" fill="#120d08"/><path d="M32 26v14M26 32h12"/></g></symbol>
</svg>`;
  function inject(){
    if(document.getElementById('cs-sprite'))return;
    const host=document.createElement('div');host.id='cs-sprite';host.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    host.setAttribute('aria-hidden','true');host.innerHTML=SPRITE;document.body.prepend(host);
  }
  if(document.body)inject();else document.addEventListener('DOMContentLoaded',inject);
})();
