(function () {
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EDIT = /[?&]edit\b/.test(location.search);
  if (EDIT) document.body.classList.add('edit');

  /* ---------- local image store (edit mode: מעלים תמונה ישירות מהדפדפן) ---------- */
  let db = null;
  const dbReady = new Promise(res => {
    try {
      const rq = indexedDB.open('shuli-site', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('img');
      rq.onsuccess = () => { db = rq.result; res(); };
      rq.onerror = () => res();
    } catch (e) { res(); }
  });
  const idbGet = k => new Promise(r => { if (!db) return r(null); const q = db.transaction('img').objectStore('img').get(k); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); });
  const idbSet = (k, v) => new Promise(r => { if (!db) return r(); const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(v, k); t.oncomplete = r; t.onerror = r; });

  /* ---------- image element with graceful placeholder ---------- */
  function setSrc(box, src) {
    const im = box.querySelector('img');
    box.classList.remove('ph');
    im.onerror = () => box.classList.add('ph');
    im.src = src;
  }
  function makeImg(src, label, tone, extraClass = '') {
    const box = document.createElement('div');
    box.className = 'img ' + extraClass;
    box.dataset.label = label || '';
    if (tone) box.style.setProperty('--tone', tone);
    box.innerHTML = '<img alt="' + (label || '') + '" loading="lazy">';
    box.dataset.src = src;
    dbReady.then(() => idbGet(src)).then(blob => setSrc(box, blob ? URL.createObjectURL(blob) : src));
    if (EDIT) {
      const up = document.createElement('label');
      up.className = 'upl';
      up.innerHTML = 'לחצי להחלפת תמונה<br><small>' + src + '</small><input type="file" accept="image/*" hidden>';
      up.querySelector('input').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        await idbSet(src, f); setSrc(box, URL.createObjectURL(f));
      };
      up.addEventListener('click', e => e.stopPropagation());
      box.appendChild(up);
    }
    return box;
  }

  /* ---------- static texts ---------- */
  $('#logo').innerHTML = S.name + '<small>' + S.title + '</small>';
  $('#heroTitle').textContent = S.title;
  $('#heroTagline').textContent = S.tagline;
  $('#heroIntro').textContent = S.intro;
  $('#aboutName').textContent = 'נעים להכיר, אני ' + S.name.split(' ')[0];
  $('#aboutBody').innerHTML = S.about.map(p => '<p>' + p + '</p>').join('');
  $('#aboutImg').replaceWith((() => { const b = makeImg(S.portrait, 'תמונה של שולי', '#c8b8a4', 'about-img reveal'); b.id = 'aboutImg'; return b; })());
  $('#footName').textContent = S.name;
  $('#year').textContent = new Date().getFullYear();
  $('#waFloat').href = 'https://wa.me/' + S.whatsapp;
  $('#contactList').innerHTML =
    '<li><a href="tel:' + S.phone + '">' + S.phone + '</a></li>' +
    '<li><a href="mailto:' + S.email + '">' + S.email + '</a></li>' +
    '<li><a href="' + S.instagram + '" target="_blank" rel="noopener">אינסטגרם</a></li>' +
    '<li>' + S.location + '</li>';

  /* ---------- hero slider ---------- */
  const slides = S.heroImages.map((src, i) => {
    const s = makeImg(src, '', ['#8b7d6b', '#a89a86', '#6f6a60'][i % 3], 'slide' + (i ? '' : ' on'));
    $('#heroSlides').appendChild(s);
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'שקופית ' + (i + 1));
    d.onclick = () => { go(i); restart(); };
    $('#heroDots').appendChild(d);
    return s;
  });
  const dots = $$('#heroDots button');
  let cur = 0, timer;
  function go(i) {
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = (i + slides.length) % slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
  }
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(cur + 1), 6500); };
  dots[0].classList.add('on'); restart();

  /* ---------- stats count-up ---------- */
  $('#stats').innerHTML = S.stats.map(s => '<div class="stat reveal"><b data-to="' + s.value + '" data-suf="' + s.suffix + '">0</b><span>' + s.label + '</span></div>').join('');
  function countUp(el) {
    const to = +el.dataset.to, suf = el.dataset.suf, t0 = performance.now();
    (function tick(t) {
      const p = Math.min((t - t0) / 1600, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- projects grid + filters ---------- */
  const grid = $('#grid');
  S.projects.forEach((p, idx) => {
    const c = document.createElement('article');
    c.className = 'card reveal'; c.dataset.cat = p.category; c.tabIndex = 0;
    c.style.transitionDelay = (idx % 3) * 90 + 'ms';
    c.appendChild(makeImg(p.images[0], p.title, p.tone));
    c.insertAdjacentHTML('beforeend',
      '<div class="card-info"><small>' + p.place + ' · ' + p.year + '</small><h3>' + p.title + '</h3><em>' + p.summary + '</em></div><span class="more">+</span>');
    c.onclick = () => openModal(p.id);
    c.onkeydown = e => { if (e.key === 'Enter') openModal(p.id); };
    // subtle 3D tilt
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = 'perspective(900px) rotateY(' + x * 5 + 'deg) rotateX(' + -y * 5 + 'deg)';
    });
    c.addEventListener('mouseleave', () => c.style.transform = '');
    grid.appendChild(c);
  });
  $('#filters').innerHTML = S.categories.map((c, i) => '<button class="chip' + (i ? '' : ' on') + '" data-f="' + c.id + '">' + c.label + '</button>').join('');
  $('#filters').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip').forEach(x => x.classList.toggle('on', x === b));
    $$('.card').forEach(c => {
      const show = b.dataset.f === 'all' || c.dataset.cat === b.dataset.f;
      c.classList.toggle('hide', !show);
      if (show) { c.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('in'))); }
    });
  };

  /* ---------- reusable before/after slider ---------- */
  function makeBA(before, after, tone) {
    const box = document.createElement('div');
    box.className = 'ba-box';
    const a = document.createElement('div'); a.className = 'ba-layer'; a.appendChild(makeImg(after, 'אחרי', tone || '#b9a98f'));
    const b = document.createElement('div'); b.className = 'ba-layer ba-before'; b.appendChild(makeImg(before, 'לפני', '#7d756a'));
    box.append(a, b);
    box.insertAdjacentHTML('beforeend', '<span class="ba-tag t-before">לפני</span><span class="ba-tag t-after">אחרי</span><div class="ba-handle"><b>⇆</b></div><input class="ba-range" type="range" min="0" max="100" value="50" aria-label="לפני ואחרי">');
    box.querySelector('.ba-range').addEventListener('input', e => box.style.setProperty('--pos', e.target.value + '%'));
    return box;
  }

  /* ---------- modal ---------- */
  const modal = $('#modal'), mBody = $('#mBody');
  let openIdx = 0, imgIdx = 0;
  function openModal(id) {
    openIdx = S.projects.findIndex(p => p.id === id); imgIdx = 0; renderModal();
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; modal.scrollTop = 0;
  }
  function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function renderModal() {
    const p = S.projects[openIdx];
    mBody.innerHTML = '';
    const main = makeImg(p.images[imgIdx], p.title, p.tone, 'm-main');
    const thumbs = document.createElement('div'); thumbs.className = 'm-thumbs';
    p.images.forEach((src, i) => {
      const b = document.createElement('button'); b.className = i === imgIdx ? 'on' : '';
      b.appendChild(makeImg(src, '', p.tone)); b.onclick = () => { imgIdx = i; renderModal(); };
      thumbs.appendChild(b);
    });
    const info = document.createElement('div');
    info.innerHTML = '<div class="m-meta"><span>מיקום<b>' + p.place + '</b></span><span>שנה<b>' + p.year + '</b></span><span>שטח<b>' + p.area + '</b></span></div>' +
      '<h2>' + p.title + '</h2><p><strong>' + p.summary + '</strong></p><p>' + p.story + '</p>' +
      '<p><a class="btn solid" href="#contact" id="mCta">רוצים משהו דומה? דברו איתי</a></p>';
    const dir = p.images[0].replace(/\/[^/]*$/, '');
    const ba = p.beforeAfter || { before: dir + '/before.jpg', after: dir + '/after.jpg' };
    const baWrap = document.createElement('div'); baWrap.className = 'm-ba';
    baWrap.innerHTML = '<h3>לפני ואחרי</h3><p class="m-hint">גררו את הקו כדי לראות את ההבדל</p>';
    baWrap.appendChild(makeBA(ba.before, ba.after, p.tone));
    mBody.append(main, thumbs, info, baWrap);
    $('#mCta').onclick = closeModal;
  }
  const step = d => { openIdx = (openIdx + d + S.projects.length) % S.projects.length; imgIdx = 0; renderModal(); modal.scrollTop = 0; };
  $('#mClose').onclick = closeModal;
  $('#mPrev').onclick = () => step(1); $('#mNext').onclick = () => step(-1);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- before / after ---------- */
  $('#baBox').replaceWith(makeBA(S.beforeAfter.before, S.beforeAfter.after, '#b9a98f'));
  $('#baCaption').textContent = S.beforeAfter.caption;
  $('#ba .ba-box').classList.add('reveal');

  /* ---------- services accordion ---------- */
  $('#acc').innerHTML = S.services.map((s, i) =>
    '<div class="acc-item reveal"><button class="acc-q">' + s.title + '<i>+</i></button><div class="acc-a"><p>' + s.text + '</p></div></div>').join('');
  $('#acc').onclick = e => {
    const q = e.target.closest('.acc-q'); if (!q) return;
    const item = q.parentElement, was = item.classList.contains('open');
    $$('.acc-item').forEach(i => { i.classList.remove('open'); $('.acc-a', i).style.maxHeight = 0; });
    if (!was) { item.classList.add('open'); const a = $('.acc-a', item); a.style.maxHeight = a.scrollHeight + 'px'; }
  };

  /* ---------- process ---------- */
  $('#steps').innerHTML = S.process.map((s, i) =>
    '<div class="step reveal" style="transition-delay:' + i * 110 + 'ms"><b>' + s.n + '</b><h3>' + s.title + '</h3><p>' + s.text + '</p></div>').join('');

  /* ---------- testimonials ---------- */
  $('#qWrap').innerHTML = S.testimonials.map((q, i) => '<div class="q' + (i ? '' : ' on') + '"><p>״' + q.text + '״</p><span>' + q.who + '</span></div>').join('');
  $('#qDots').innerHTML = S.testimonials.map((q, i) => '<button class="' + (i ? '' : 'on') + '" aria-label="המלצה ' + (i + 1) + '"></button>').join('');
  let qi = 0, qt;
  const showQ = i => { qi = i; $$('.q').forEach((x, k) => x.classList.toggle('on', k === i)); $$('#qDots button').forEach((x, k) => x.classList.toggle('on', k === i)); };
  const qLoop = () => { clearInterval(qt); qt = setInterval(() => showQ((qi + 1) % S.testimonials.length), 6000); };
  $$('#qDots button').forEach((b, i) => b.onclick = () => { showQ(i); qLoop(); }); qLoop();

  /* ---------- contact form -> WhatsApp ---------- */
  $('#form').onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const text = 'שלום שולי, שמי ' + f.get('name') + '.\nסוג פרויקט: ' + f.get('type') + '\nטלפון: ' + f.get('phone') + '\n' + (f.get('msg') || '');
    window.open('https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(text), '_blank');
  };

  /* ---------- nav, progress, cursor, reveal ---------- */
  const nav = $('#nav'), prog = $('#progress');
  addEventListener('scroll', () => {
    nav.classList.toggle('solid', scrollY > 60);
    const h = document.documentElement;
    prog.style.width = scrollY / (h.scrollHeight - h.clientHeight) * 100 + '%';
  }, { passive: true });
  const menu = $('#menu');
  $('#burger').onclick = () => { menu.classList.toggle('open'); nav.classList.toggle('menu-open'); };
  $$('#menu a').forEach(a => a.onclick = () => { menu.classList.remove('open'); nav.classList.remove('menu-open'); });

  const cur_ = $('#cursor');
  addEventListener('mousemove', e => { cur_.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, { passive: true });
  document.addEventListener('mouseover', e => cur_.classList.toggle('big', !!e.target.closest('.card,.ba-box,a,button')));

  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    const b = $('b[data-to]', en.target); if (b) countUp(b);
    io.unobserve(en.target);
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));
})();
