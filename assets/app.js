(() => {
  const LS = 'col783:';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} },
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ICON = {
    grip: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3.5" r="1.3"/><circle cx="10.5" cy="3.5" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12.5" r="1.3"/><circle cx="10.5" cy="12.5" r="1.3"/></svg>',
    up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  };

  /* ---------- diagrams ---------- */
  function renderPlot(svg) {
    let spec;
    try { spec = JSON.parse(svg.dataset.plot); } catch (e) { console.warn('bad plot', svg.dataset.plot); return; }
    const W = spec.w || 320, H = spec.h || 130, P = spec.pad ?? 14;
    const [x0, x1] = spec.x, [y0, y1] = spec.y;
    const X = (x) => P + ((x - x0) / (x1 - x0)) * (W - 2 * P);
    const Y = (y) => H - P - ((y - y0) / (y1 - y0)) * (H - 2 * P);
    let out = '';
    const ay = y0 <= 0 && y1 >= 0 ? Y(0) : H - P;
    const ax = spec.yaxis === false ? null : (x0 <= 0 && x1 >= 0 ? X(0) : P);
    out += `<line class="ax" x1="${P - 4}" y1="${ay}" x2="${W - P + 6}" y2="${ay}"/>`;
    if (ax != null) out += `<line class="ax" x1="${ax}" y1="${H - P + 2}" x2="${ax}" y2="${P - 6}"/>`;
    if (spec.xl) out += `<text x="${W - P + 8}" y="${ay + 4}">${spec.xl}</text>`;
    if (spec.yl && ax != null) out += `<text x="${ax + 5}" y="${P - 2}">${spec.yl}</text>`;
    (spec.marks || []).forEach((m) => {
      out += `<line class="ax dash" x1="${X(m.x)}" y1="${P - 4}" x2="${X(m.x)}" y2="${H - P + 2}"/>`;
      if (m.t) out += `<text class="mid sm" x="${X(m.x)}" y="${H - 1}">${m.t}</text>`;
    });
    (spec.hmarks || []).forEach((m) => {
      out += `<line class="ax dash" x1="${P}" y1="${Y(m.y)}" x2="${W - P}" y2="${Y(m.y)}"/>`;
      if (m.t) out += `<text class="sm" x="${P + 2}" y="${Y(m.y) - 3}">${m.t}</text>`;
    });
    (spec.curves || []).forEach((c) => {
      let f;
      try { f = new Function('x', 'with(Math){return (' + c.f + ');}'); } catch (e) { return; }
      const n = c.n || 400, a = c.from ?? x0, b = c.to ?? x1;
      let d = '', pen = false;
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        let y; try { y = f(x); } catch (e) { y = NaN; }
        if (!isFinite(y)) { pen = false; continue; }
        y = Math.max(y0 - (y1 - y0) * 0.5, Math.min(y1 + (y1 - y0) * 0.5, y));
        d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1);
        pen = true;
      }
      out += `<path class="c${c.c || 1}${c.dash ? ' dash' : ''}${c.thin ? ' thin' : ''}" d="${d}"/>`;
      if (c.t) out += `<text class="lbl${c.c || 1} b" x="${X(c.tx ?? b) + (c.tdx || 0)}" y="${Y(c.ty ?? f(c.tx ?? b)) + (c.tdy || -6)}">${c.t}</text>`;
    });
    (spec.stems || []).forEach((s) => {
      const cl = s.c || 1;
      (s.pts || []).forEach(([x, y]) => {
        out += `<line class="c${cl} thin" x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(y)}"/><circle class="f${cl}" cx="${X(x)}" cy="${Y(y)}" r="3"/>`;
        if (s.labels) out += `<text class="mid sm" x="${X(x)}" y="${Y(y) - 7}">${+y.toFixed(2)}</text>`;
      });
    });
    (spec.dots || []).forEach((p) => { out += `<circle class="f${p.c || 1}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r || 4}"/>`; });
    (spec.text || []).forEach((t) => { out += `<text class="${t.cl || ''}" x="${X(t.x)}" y="${Y(t.y)}">${t.t}</text>`; });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = out;
  }

  function renderGrid(el) {
    const rows = el.dataset.grid.split('/');
    const num = el.classList.contains('num');
    let cols = 0, html = '';
    rows.forEach((r) => {
      const cells = num ? r.trim().split(/\s+/) : [...r.trim()];
      cols = Math.max(cols, cells.length);
      cells.forEach((c) => {
        if (num) {
          const hl = c.endsWith('*'), on = c.endsWith('!');
          const v = c.replace(/[*!]$/, '');
          html += `<span class="${hl ? 'hl' : on ? 'add' : ''}">${v === '_' ? '' : v}</span>`;
        } else {
          const cls = { '#': 'on', '+': 'add', x: 'rem', o: 'on org', O: 'org', '*': 'hl', '?': 'dc', '.': '' }[c] ?? '';
          html += `<span class="${cls}"></span>`;
        }
      });
    });
    el.style.setProperty('--cols', cols);
    el.innerHTML = html;
  }

  $$('svg.plot[data-plot]').forEach(renderPlot);
  $$('.grid[data-grid]').forEach(renderGrid);

  /* ---------- chapters & slides ---------- */
  const chapters = $$('article.chapter');
  const byId = Object.fromEntries(chapters.map((c) => [c.dataset.id, c]));
  const defaultOrder = chapters.map((c) => c.dataset.id);
  let order = store.get('order', defaultOrder).filter((id) => byId[id]);
  defaultOrder.forEach((id) => { if (!order.includes(id)) order.push(id); });
  let done = store.get('done', {});
  const slidesOf = (id) => $$('section.slide', byId[id]);

  chapters.forEach((c) => {
    const slides = slidesOf(c.dataset.id);
    slides.forEach((s, i) => {
      s.dataset.sid = c.dataset.id + '.' + i;
      const b = document.createElement('button');
      b.className = 'tick'; b.type = 'button'; b.innerHTML = ICON.check;
      b.setAttribute('aria-label', 'Mark slide done');
      b.addEventListener('click', () => { setDone(s.dataset.sid, !done[s.dataset.sid]); });
      s.appendChild(b);
      if (done[s.dataset.sid]) s.classList.add('done');
    });
    const meta = $('.ch-meta', c);
    if (meta) meta.insertAdjacentHTML('afterbegin', `<span><b data-pos></b></span><span><b>${slides.length}</b> slides</span>`);
  });

  function setDone(sid, v) {
    if (v) done[sid] = 1; else delete done[sid];
    store.set('done', done);
    const s = $(`section.slide[data-sid="${sid}"]`);
    if (s) s.classList.toggle('done', !!v);
    renderToc(); renderPlan();
  }

  /* ---------- planner state ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  let start = store.get('start', null);
  if (!start) { start = Date.now(); store.set('start', start); }
  let deadline = store.get('deadline', '03:30');
  let target = store.get('target', null);
  if (!byId[target]) target = order[order.length - 1];
  let current = store.get('current', order[0]);
  if (!byId[current]) current = order[0];

  function deadlineDate() {
    const s = new Date(start);
    const [h, m] = deadline.split(':').map(Number);
    const d = new Date(s); d.setHours(h, m, 0, 0);
    if (d <= s) d.setDate(d.getDate() + 1);
    return d;
  }

  const fmtDur = (ms) => {
    const neg = ms < 0; ms = Math.abs(ms);
    const m = Math.round(ms / 60000), h = Math.floor(m / 60);
    return (neg ? '−' : '') + (h ? `${h}h ${pad(m % 60)}m` : `${m}m`);
  };

  function computePlan() {
    const scope = order.slice(0, order.indexOf(target) + 1);
    const slides = scope.flatMap((id) => slidesOf(id).map((s) => ({ sid: s.dataset.sid, ch: id })));
    const total = slides.length || 1;
    const doneN = slides.filter((s) => done[s.sid]).length;
    const end = deadlineDate().getTime();
    const now = Date.now();
    const pace = Math.max(1, (end - start) / total);
    const expected = Math.max(0, Math.min(total, (now - start) / pace));
    const delta = (doneN - expected) * pace;
    const idx = Math.min(total - 1, Math.floor(expected));
    const at = slides[idx];
    const atCh = at ? at.ch : scope[0];
    const atN = at ? slidesOf(atCh).findIndex((s) => s.dataset.sid === at.sid) + 1 : 1;
    let proj = null;
    if (doneN > 0 && doneN < total) proj = new Date(now + (total - doneN) * ((now - start) / doneN));
    return { total, doneN, pace, expected, delta, atCh, atN, end, now, proj, scope };
  }

  /* ---------- planner UI ---------- */
  const planEl = $('#plan');
  planEl.innerHTML = `
    <div class="plan-top">
      <div class="brand">COL783<small>major · 22 Nov</small></div>
      <button class="icon-btn" id="theme" type="button" aria-label="Toggle theme">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>
      </button>
    </div>
    <div class="status" id="status"><span class="status-delta" id="delta">—</span><span class="status-word" id="word"></span></div>
    <div class="bar"><div class="bar-fill" id="fill"></div><div class="bar-tick" id="btick"></div></div>
    <dl class="facts">
      <dt>Should be at</dt><dd><button type="button" id="at"></button></dd>
      <dt>Done</dt><dd id="donef"></dd>
      <dt>Per slide</dt><dd id="pace"></dd>
      <dt>Time left</dt><dd id="left"></dd>
      <dt>Finish at this rate</dt><dd id="proj"></dd>
    </dl>
    <div class="fields">
      <label class="field full">Finish through<select id="target"></select></label>
      <label class="field">Started<input type="time" id="start"></label>
      <label class="field">Deadline<input type="time" id="deadline"></label>
    </div>
    <div class="plan-actions">
      <button class="txt-btn" type="button" id="restart">Start now</button>
      <button class="txt-btn" type="button" id="resetOrder">Reset order</button>
    </div>`;

  const tocEl = $('#toc');
  const title = (id) => byId[id].dataset.title;

  function renderPlan() {
    const p = computePlan();
    const st = $('#status');
    const mins = p.delta / 60000;
    st.className = 'status ' + (Math.abs(mins) < 3 ? 'is-ontrack' : mins > 0 ? 'is-ahead' : 'is-behind');
    $('#delta').textContent = (mins >= 0 ? '+' : '−') + fmtDur(Math.abs(p.delta));
    $('#word').textContent = Math.abs(mins) < 3 ? 'on track' : mins > 0 ? 'ahead' : 'behind';
    $('#fill').style.width = (100 * p.doneN / p.total) + '%';
    $('#btick').style.left = `calc(${(100 * p.expected / p.total).toFixed(2)}% - 1px)`;
    const at = $('#at');
    at.textContent = `${order.indexOf(p.atCh) + 1}. ${title(p.atCh)} · ${p.atN}`;
    at.dataset.go = p.atCh;
    $('#donef').textContent = `${p.doneN} / ${p.total}`;
    $('#pace').textContent = `${(p.pace / 60000).toFixed(1)} min`;
    $('#left').textContent = p.end > p.now ? fmtDur(p.end - p.now) : '0m';
    $('#proj').textContent = p.doneN >= p.total ? 'done' : p.proj ? hm(p.proj) : '—';
    const mb = $('#mDelta');
    if (mb) { mb.textContent = $('#delta').textContent; mb.style.color = getComputedStyle($('#delta')).color; }
  }

  function renderTargetSelect() {
    const sel = $('#target');
    sel.innerHTML = order.map((id, i) => `<option value="${id}"${id === target ? ' selected' : ''}>${i + 1}. ${title(id)}</option>`).join('');
  }

  function renderToc() {
    const ti = order.indexOf(target);
    tocEl.innerHTML = order.map((id, i) => {
      const sl = slidesOf(id), d = sl.filter((s) => done[s.dataset.sid]).length;
      const tag = byId[id].dataset.tag;
      return `<li draggable="true" data-id="${id}" class="${id === current ? 'current' : ''}${i > ti ? ' out' : ''}" tabindex="0">
        <span class="t-grip" aria-hidden="true">${ICON.grip}</span>
        <span class="t-num">${pad(i + 1)}</span>
        <span class="t-title"><i class="${tag}"></i>${title(id)}</span>
        <span class="t-right">${id === target ? '<span class="t-target">END</span>' : ''}
          <span class="t-prog${d === sl.length ? ' full' : ''}">${d}/${sl.length}</span>
          <span class="t-move"><button type="button" data-mv="-1" aria-label="Move up">${ICON.up}</button><button type="button" data-mv="1" aria-label="Move down">${ICON.down}</button></span>
        </span></li>`;
    }).join('');
    chapters.forEach((c) => { const b = $('[data-pos]', c); if (b) b.textContent = `#${order.indexOf(c.dataset.id) + 1}`; });
  }

  function saveOrder() { store.set('order', order); renderToc(); renderTargetSelect(); renderPlan(); renderNav(); }

  tocEl.addEventListener('click', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      e.stopPropagation();
      const i = order.indexOf(li.dataset.id), j = i + Number(mv.dataset.mv);
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      saveOrder();
      const nb = tocEl.querySelector(`li[data-id="${li.dataset.id}"] [data-mv="${mv.dataset.mv}"]`);
      if (nb) nb.focus();
      return;
    }
    open(li.dataset.id);
  });
  tocEl.addEventListener('keydown', (e) => {
    const li = e.target.closest('li'); if (!li || e.target !== li) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(li.dataset.id); }
  });

  let dragId = null;
  tocEl.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    dragId = li.dataset.id; li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
  });
  const clearDrop = () => $$('.drop-before,.drop-after', tocEl).forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  tocEl.addEventListener('dragover', (e) => {
    const li = e.target.closest('li'); if (!li || !dragId) return;
    e.preventDefault();
    clearDrop();
    const r = li.getBoundingClientRect();
    li.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
  });
  tocEl.addEventListener('dragleave', (e) => { if (!tocEl.contains(e.relatedTarget)) clearDrop(); });
  tocEl.addEventListener('drop', (e) => {
    const li = e.target.closest('li'); if (!li || !dragId) return;
    e.preventDefault();
    const after = li.classList.contains('drop-after');
    clearDrop();
    if (li.dataset.id === dragId) return;
    order.splice(order.indexOf(dragId), 1);
    order.splice(order.indexOf(li.dataset.id) + (after ? 1 : 0), 0, dragId);
    dragId = null; saveOrder();
  });
  tocEl.addEventListener('dragend', () => { dragId = null; clearDrop(); $$('.dragging', tocEl).forEach((x) => x.classList.remove('dragging')); });

  $('#target').addEventListener('change', (e) => { target = e.target.value; store.set('target', target); renderToc(); renderPlan(); });
  const startIn = $('#start'), dlIn = $('#deadline');
  startIn.value = hm(new Date(start)); dlIn.value = deadline;
  startIn.addEventListener('change', () => {
    if (!startIn.value) return;
    const [h, m] = startIn.value.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    if (d.getTime() > Date.now() + 60000) d.setDate(d.getDate() - 1);
    start = d.getTime(); store.set('start', start); renderPlan();
  });
  dlIn.addEventListener('change', () => { if (!dlIn.value) return; deadline = dlIn.value; store.set('deadline', deadline); renderPlan(); });
  $('#restart').addEventListener('click', () => { start = Date.now(); store.set('start', start); startIn.value = hm(new Date(start)); renderPlan(); });
  $('#resetOrder').addEventListener('click', () => { order = [...defaultOrder]; saveOrder(); });
  $('#at').addEventListener('click', (e) => open(e.currentTarget.dataset.go));

  /* theme */
  const root = document.documentElement;
  let theme = store.get('theme', 'dark');
  root.dataset.theme = theme;
  $('#theme').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = theme; store.set('theme', theme); renderPlan(); });

  /* ---------- navigation ---------- */
  const navEl = $('#chnav');
  function renderNav() {
    const i = order.indexOf(current);
    const p = order[i - 1], n = order[i + 1];
    navEl.innerHTML = `
      <button type="button" class="prev" ${p ? `data-go="${p}"` : 'disabled'}><small>Previous</small><span>${p ? title(p) : ''}</span></button>
      <button type="button" class="next" ${n ? `data-go="${n}"` : 'disabled'}><small>Next</small><span>${n ? title(n) : ''}</span></button>`;
  }
  navEl.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) open(b.dataset.go); });

  let above = {};
  function open(id, keepScroll) {
    if (!byId[id]) return;
    current = id; store.set('current', id);
    chapters.forEach((c) => c.classList.toggle('on', c.dataset.id === id));
    $('#mTitle') && ($('#mTitle').textContent = title(id));
    renderToc(); renderNav();
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    if (!keepScroll) window.scrollTo(0, 0);
    document.querySelector('.app').classList.remove('drawer');
    above = {};
    requestAnimationFrame(() => slidesOf(id).forEach((s) => { above[s.dataset.sid] = s.getBoundingClientRect().bottom < innerHeight * 0.3; }));
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      slidesOf(current).forEach((s) => {
        const sid = s.dataset.sid;
        const now = s.getBoundingClientRect().bottom < innerHeight * 0.3;
        if (now && above[sid] === false && !done[sid]) setDone(sid, true);
        above[sid] = now;
      });
    });
  }, { passive: true });

  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (byId[id] && id !== current) open(id); });
  $('#menu') && $('#menu').addEventListener('click', () => document.querySelector('.app').classList.toggle('drawer'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelector('.app').classList.remove('drawer'); });

  const hashId = location.hash.slice(1);
  renderTargetSelect();
  open(byId[hashId] ? hashId : current, false);
  renderPlan();
  setInterval(renderPlan, 15000);

  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false,
    });
  }
})();
