
/* ============================================================
   PERSISTENCE — theme + reading position + quiz state
   Uses localStorage. This file is saved to disk and opened
   directly in a browser, so localStorage is available.
============================================================ */
const STORAGE_KEY = 'edu-notes:' + (document.title || 'untitled');
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY + ':' + k)); }catch{ return null; } },
  set(k,v){ try{ localStorage.setItem(STORAGE_KEY + ':' + k, JSON.stringify(v)); }catch{} },
};

/* ============================================================
   THEME
============================================================ */
(function initTheme(){
  const saved = store.get('theme');
  if(saved) document.documentElement.setAttribute('data-theme', saved);
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
    document.documentElement.setAttribute('data-theme','dark');
  }
})();
document.getElementById('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.set('theme', next);
});

/* ============================================================
   FOCUS MODE
============================================================ */
(function initFocus(){
  if(store.get('focus')){
    document.body.classList.add('focus-mode');
    const btn = document.getElementById('focusBtn');
    btn.setAttribute('data-active','true');
    btn.setAttribute('aria-pressed','true');
  }
})();
document.getElementById('focusBtn').addEventListener('click', () => {
  document.body.classList.toggle('focus-mode');
  const on = document.body.classList.contains('focus-mode');
  const btn = document.getElementById('focusBtn');
  btn.setAttribute('data-active', on ? 'true' : 'false');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  store.set('focus', on);
});

/* ============================================================
   FONT SIZE — five steps, driven by --reading-scale on :root
   0.88 / 1.00 / 1.15 / 1.30 / 1.50. Wraps at ends (no cycle).
   Persists per-artifact as 'font'. `0` key resets to 1.00.
============================================================ */
const FONT_STEPS = [0.88, 1.00, 1.15, 1.30, 1.50];
function applyFontStep(idx){
  const step = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, idx))];
  document.documentElement.style.setProperty('--reading-scale', step);
  store.set('font', idx);
}
(function initFont(){
  const saved = store.get('font');
  applyFontStep(typeof saved === 'number' ? saved : 1);
})();
document.getElementById('fontUpBtn').addEventListener('click', () => {
  const cur = store.get('font');
  applyFontStep((typeof cur === 'number' ? cur : 1) + 1);
});
document.getElementById('fontDownBtn').addEventListener('click', () => {
  const cur = store.get('font');
  applyFontStep((typeof cur === 'number' ? cur : 1) - 1);
});

/* ============================================================
   BACK TO TOP — fades in after 400px of scroll; smooth-scrolls.
============================================================ */
(function initTopBtn(){
  const btn = document.getElementById('topBtn');
  function update(){
    if(window.scrollY > 400) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  }
  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  update();
})();

/* ============================================================
   PRINT BUTTON — same effect as the P shortcut.
============================================================ */
document.getElementById('printBtn').addEventListener('click', () => window.print());

/* ============================================================
   SHORTCUTS MODAL — open with helpBtn or "?", close with Esc,
   click-outside, or the Close button. Focus is trapped
   passively — Esc always closes.
============================================================ */
(function initHelp(){
  const dlg = document.getElementById('shortcuts');
  const openBtn = document.getElementById('helpBtn');
  const closeBtn = document.getElementById('shortcutsClose');
  function open(){ dlg.hidden = false; closeBtn.focus(); }
  function close(){ dlg.hidden = true; openBtn.focus(); }
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  dlg.addEventListener('click', e => { if(e.target === dlg) close(); });
  window.helpDialog = { open, close, toggle: () => dlg.hidden ? open() : close() };
})();

/* ============================================================
   HEADING ANCHOR COPY — click any h2/h3 to copy its anchor URL.
   Falls back gracefully when the Clipboard API is unavailable.
============================================================ */
(function initAnchorCopy(){
  document.querySelectorAll('#canvas h2, #canvas h3').forEach(h => {
    h.addEventListener('click', async e => {
      if(!h.id) return;
      const url = window.location.href.split('#')[0] + '#' + h.id;
      try{ await navigator.clipboard.writeText(url); }
      catch{
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); }catch{}
        ta.remove();
      }
      h.classList.add('anchor-copied');
      setTimeout(() => h.classList.remove('anchor-copied'), 1400);
    });
  });
})();

/* ============================================================
   PRINT-URL DEDUP — auto-mark links whose visible text is already
   the URL, so the @media print rule does not print it twice.
   Runs once at load; new links added by the reader would need a
   re-run, but the template does not add links dynamically.
============================================================ */
(function markSelfLabeledLinks(){
  document.querySelectorAll('#canvas a[href^="http"]').forEach(a => {
    const label = (a.textContent || '').trim();
    const href = a.getAttribute('href') || '';
    // "self-labeled" if the text matches the href, or is the href
    // minus a trailing slash / minus the protocol.
    const stripped = href.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const labelStripped = label.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if(label === href || labelStripped === stripped){
      a.classList.add('print-url-hide');
    }
  });
})();

/* ============================================================
   TABLE OF CONTENTS — auto-generate from h2/h3
============================================================ */
(function buildTOC(){
  const canvas = document.getElementById('canvas');
  const toc = document.getElementById('toc');
  const headings = canvas.querySelectorAll('h2, h3');
  headings.forEach(h => {
    if(!h.id){
      h.id = h.textContent.toLowerCase()
        .replace(/[^a-z0-9\s-]/g,'')
        .trim().replace(/\s+/g,'-').slice(0,60);
    }
    const li = document.createElement('li');
    if(h.tagName === 'H3') li.className = 'toc-l3';
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    toc.appendChild(li);
  });
})();

/* ============================================================
   INTERSECTION OBSERVER — highlight current section
============================================================ */
(function initObserver(){
  const links = document.querySelectorAll('.toc a');
  const map = new Map();
  links.forEach(a => map.set(a.getAttribute('href').slice(1), a));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = map.get(e.target.id);
      if(!link) return;
      if(e.isIntersecting){
        document.querySelectorAll('.toc a.is-active').forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
  document.querySelectorAll('#canvas h2, #canvas h3').forEach(h => observer.observe(h));
})();

/* ============================================================
   PROGRESS BAR + reading badge + position restore
   The badge and the top bar share the same scroll listener so
   they stay in sync without adding a second observer.
============================================================ */
(function initProgress(){
  const fill = document.getElementById('progressFill');
  const pctEl = document.getElementById('readingPct');
  let scrollThrottle = null;
  function update(){
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (scrolled / total) * 100 : 0;
    fill.style.width = pct + '%';
    if(pctEl) pctEl.textContent = Math.round(pct) + '%';
    // Throttle localStorage writes — every scroll event is too many.
    if(scrollThrottle) return;
    scrollThrottle = setTimeout(() => {
      store.set('scroll', window.scrollY);
      scrollThrottle = null;
    }, 250);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
  // Restore prior position after a beat so layout settles.
  const saved = store.get('scroll');
  if(typeof saved === 'number' && saved > 100){
    setTimeout(() => window.scrollTo({ top: saved, behavior: 'instant' }), 60);
  }
})();

/* ============================================================
   FLIP CARDS — click + keyboard support
============================================================ */
document.querySelectorAll('.flip-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  card.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      card.classList.toggle('is-flipped');
    }
  });
});

/* ============================================================
   QUIZ — auto grade + persist
============================================================ */
(function initQuiz(){
  const quiz = document.getElementById('quiz');
  if(!quiz) return;
  const check = document.getElementById('quizCheck');
  const reset = document.getElementById('quizReset');
  const score = document.getElementById('quizScore');

  // Restore prior answers
  const prior = store.get('quiz') || {};
  Object.entries(prior).forEach(([name, val]) => {
    const input = quiz.querySelector(`input[name="${name}"][value="${val}"]`);
    if(input) input.checked = true;
  });

  quiz.addEventListener('change', () => {
    const state = {};
    quiz.querySelectorAll('input[type=radio]:checked').forEach(i => state[i.name] = i.value);
    store.set('quiz', state);
  });

  check.addEventListener('click', () => {
    let correct = 0, total = 0;
    quiz.querySelectorAll('fieldset').forEach(fs => {
      const answer = parseInt(fs.dataset.answer, 10);
      const selected = fs.querySelector('input:checked');
      total++;
      // Reset styling on all options first
      fs.querySelectorAll('.quiz__option').forEach(o => {
        o.classList.remove('correct-answer','incorrect-answer');
      });
      // Mark the correct one green
      const correctOption = fs.querySelector(`input[value="${answer}"]`);
      if(correctOption) correctOption.closest('.quiz__option').classList.add('correct-answer');
      // If the user picked wrong, mark theirs red
      if(selected && parseInt(selected.value, 10) !== answer){
        selected.closest('.quiz__option').classList.add('incorrect-answer');
      }
      if(selected && parseInt(selected.value, 10) === answer) correct++;
    });
    quiz.classList.add('is-graded');
    const pct = Math.round((correct / total) * 100);
    let msg = `${correct} / ${total} correct (${pct}%)`;
    if(pct === 100) msg += ' — 🎯 nailed it';
    else if(pct >= 66) msg += ' — solid';
    else msg += ' — worth another pass through the boundaries section';
    score.textContent = msg;
  });

  reset.addEventListener('click', () => {
    quiz.querySelectorAll('input[type=radio]').forEach(i => i.checked = false);
    quiz.querySelectorAll('.quiz__option').forEach(o => o.classList.remove('correct-answer','incorrect-answer'));
    quiz.classList.remove('is-graded');
    score.textContent = '';
    store.set('quiz', {});
  });
})();

/* ============================================================
   KEYBOARD SHORTCUTS
   Ignored inside form fields. Metakeys skip so browser shortcuts
   (Ctrl-F find, Cmd-P print) still work as expected.

   Vim-style: pressing `g` waits ~500ms for a second `g` (top of
   page). Shift-G goes to bottom. `n`/`p` jump between headings.
============================================================ */
(function initShortcuts(){
  const dlg = document.getElementById('shortcuts');
  let gPending = false;
  let gTimer = null;

  function scrollToTop(){ window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function scrollToBottom(){ window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }

  function headings(){ return Array.from(document.querySelectorAll('#canvas h2, #canvas h3')); }
  function currentHeadingIndex(){
    const hs = headings();
    const y = window.scrollY + 80;
    let idx = -1;
    hs.forEach((h, i) => { if(h.getBoundingClientRect().top + window.scrollY <= y) idx = i; });
    return { hs, idx };
  }
  function jumpHeading(delta){
    const { hs, idx } = currentHeadingIndex();
    const next = Math.max(0, Math.min(hs.length - 1, idx + delta));
    if(hs[next]) hs[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('keydown', e => {
    // Never intercept in form controls, in editable elements, or with modifiers.
    if(e.target.matches('input, textarea, select')) return;
    if(e.target.isContentEditable) return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;

    // Escape closes the shortcuts dialog if open.
    if(e.key === 'Escape' && !dlg.hidden){
      window.helpDialog.close();
      e.preventDefault();
      return;
    }

    const k = e.key;
    switch(k){
      case 'j': window.scrollBy({ top: 200, behavior: 'smooth' }); break;
      case 'k': window.scrollBy({ top: -200, behavior: 'smooth' }); break;
      case 'f': document.getElementById('focusBtn').click(); break;
      case 't': document.getElementById('themeBtn').click(); break;
      case 'P': window.print(); break;                       // Shift-P prints
      case 'n': jumpHeading(1); break;                       // n → next heading
      case 'p': jumpHeading(-1); break;                      // p → previous heading
      case '+': case '=': document.getElementById('fontUpBtn').click(); break;
      case '-': case '_': document.getElementById('fontDownBtn').click(); break;
      case '0': applyFontStep(1); break;                     // 0 → reset font
      case '?': window.helpDialog.toggle(); e.preventDefault(); break;
      case '/':                                              // / → open search
        if(window.searchBar){ window.searchBar.open(); e.preventDefault(); }
        break;
      case 'Home': scrollToTop(); e.preventDefault(); break;
      case 'End': scrollToBottom(); e.preventDefault(); break;
      case 'G': scrollToBottom(); break;                     // Shift-G → bottom
      case 'g':                                              // g g → top
        if(gPending){
          clearTimeout(gTimer); gPending = false;
          scrollToTop();
        } else {
          gPending = true;
          gTimer = setTimeout(() => { gPending = false; }, 500);
        }
        break;
    }
  });
})();

/* ============================================================
   SEARCH-WITHIN-PAGE
   / opens the bar; typing highlights every match inside #canvas;
   Enter jumps to next, Shift-Enter to previous; Esc closes.
   Auto-expands any <details> containing a match so the reader
   sees hidden content (S/I/P/R probes, deep-dive expansions).
============================================================ */
(function initSearch(){
  const bar = document.getElementById('searchBar');
  const input = document.getElementById('searchInput');
  const count = document.getElementById('searchCount');
  const btnPrev = document.getElementById('searchPrev');
  const btnNext = document.getElementById('searchNext');
  const btnClose = document.getElementById('searchClose');
  const btnOpen = document.getElementById('searchBtn');
  const canvas = document.getElementById('canvas');
  if(!bar || !canvas) return;

  let hits = [];       // DOM <mark class="search-hit"> nodes
  let cursor = -1;
  let lastQuery = '';
  let openedDetails = []; // details we auto-opened so we can leave them alone if user closes them

  function clearHits(){
    hits.forEach(m => {
      const parent = m.parentNode;
      if(!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    hits = [];
    cursor = -1;
    updateCount();
  }
  function updateCount(){
    if(!hits.length) count.textContent = lastQuery ? '0 / 0' : '';
    else count.textContent = (cursor + 1) + ' / ' + hits.length;
  }
  function markMatches(query){
    if(!query || query.length < 2) return;
    const q = query.toLowerCase();
    // Walk text nodes inside canvas, skipping our own marks and script/style.
    const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let p = node.parentNode;
        while(p && p !== canvas){
          if(p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
          if(p.classList && (p.classList.contains('search-hit') || p.classList.contains('search-hit--current'))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const targets = [];
    while(walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach(node => {
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      let start = 0, idx;
      const frag = document.createDocumentFragment();
      let matched = false;
      while((idx = lower.indexOf(q, start)) !== -1){
        matched = true;
        if(idx > start) frag.appendChild(document.createTextNode(text.slice(start, idx)));
        const mk = document.createElement('mark');
        mk.className = 'search-hit';
        mk.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mk);
        hits.push(mk);
        start = idx + q.length;
      }
      if(!matched) return;
      if(start < text.length) frag.appendChild(document.createTextNode(text.slice(start)));
      node.parentNode.replaceChild(frag, node);
    });
  }
  function autoOpenDetails(){
    openedDetails = [];
    hits.forEach(m => {
      let p = m.parentNode;
      while(p && p !== canvas){
        if(p.tagName === 'DETAILS' && !p.open){
          p.open = true;
          openedDetails.push(p);
        }
        p = p.parentNode;
      }
    });
  }
  function focusCurrent(){
    hits.forEach(m => m.classList.remove('search-hit--current'));
    if(cursor < 0 || cursor >= hits.length) return;
    const m = hits[cursor];
    m.classList.add('search-hit--current');
    m.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function runSearch(){
    clearHits();
    lastQuery = input.value.trim();
    if(lastQuery.length < 2){ updateCount(); return; }
    markMatches(lastQuery);
    autoOpenDetails();
    cursor = hits.length ? 0 : -1;
    updateCount();
    focusCurrent();
  }
  function move(delta){
    if(!hits.length) return;
    cursor = (cursor + delta + hits.length) % hits.length;
    focusCurrent();
    updateCount();
  }
  function open(){
    bar.hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 0);
  }
  function close(){
    bar.hidden = true;
    clearHits();
    input.value = '';
    lastQuery = '';
    updateCount();
  }

  btnOpen.addEventListener('click', open);
  btnClose.addEventListener('click', close);
  btnNext.addEventListener('click', () => move(1));
  btnPrev.addEventListener('click', () => move(-1));
  input.addEventListener('input', () => {
    // Debounce a touch so typing "hello" doesn't rebuild the tree per keystroke.
    clearTimeout(input._t);
    input._t = setTimeout(runSearch, 120);
  });
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      e.preventDefault();
      move(e.shiftKey ? -1 : 1);
    } else if(e.key === 'Escape'){
      e.preventDefault();
      close();
    }
  });
  window.searchBar = { open, close, isOpen: () => !bar.hidden };
})();

/* ============================================================
   USER HIGHLIGHTS
   Reader selects text inside #canvas; a floating "Highlight"
   button appears near the selection. Click wraps the selection
   in <mark class="user-mark"> and saves it to localStorage.
   Existing marks are restored on load; clicking a mark removes it.
============================================================ */
(function initHighlights(){
  const canvas = document.getElementById('canvas');
  const btn = document.getElementById('markBtn');
  if(!canvas || !btn) return;

  function loadStored(){
    try{ return store.get('highlights') || []; }catch{ return []; }
  }
  function saveStored(list){
    store.set('highlights', list);
  }
  function inCanvas(node){
    let n = node.nodeType === 1 ? node : node.parentNode;
    while(n){ if(n === canvas) return true; n = n.parentNode; }
    return false;
  }
  function positionButton(range){
    const rect = range.getBoundingClientRect();
    if(!rect || (!rect.width && !rect.height)){ btn.hidden = true; return; }
    btn.style.left = (rect.left + rect.width / 2 + window.scrollX) + 'px';
    btn.style.top = (rect.top + window.scrollY) + 'px';
    btn.hidden = false;
  }
  function currentSelection(){
    const sel = window.getSelection();
    if(!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if(text.length < 3) return null;
    if(!inCanvas(range.startContainer) || !inCanvas(range.endContainer)) return null;
    return { range, text };
  }
  function wrapSelection(){
    const cur = currentSelection();
    if(!cur) return;
    try{
      const mark = document.createElement('mark');
      mark.className = 'user-mark';
      cur.range.surroundContents(mark);
      const list = loadStored();
      list.push(cur.text);
      saveStored(list);
      window.getSelection().removeAllRanges();
      btn.hidden = true;
    }catch{
      // surroundContents fails if the range crosses element boundaries.
      // Fall back to extractContents/appendChild.
      try{
        const mark = document.createElement('mark');
        mark.className = 'user-mark';
        mark.appendChild(cur.range.extractContents());
        cur.range.insertNode(mark);
        const list = loadStored();
        list.push(cur.text);
        saveStored(list);
        window.getSelection().removeAllRanges();
        btn.hidden = true;
      }catch{ /* selection spans an unwrappable structure; give up quietly. */ }
    }
  }
  function restoreHighlights(){
    // v1 limitations, intentional:
    //   (a) FIRST-MATCH ONLY. If the same text appears multiple times and
    //       the user highlighted a later occurrence, restore lands on the
    //       first one. A more robust design would store an occurrence index
    //       or a small context window (leading/trailing chars).
    //   (b) SINGLE TEXT-NODE ONLY. Highlights that cross element boundaries
    //       (e.g. "the <strong>quick</strong> brown fox") do not restore —
    //       the walker rejects text nodes that don't contain the full string.
    //   Both are acceptable for a reading aid; upgrade only if user
    //   feedback shows people notice.
    const list = loadStored();
    if(!list || !list.length) return;
    list.forEach(text => {
      if(!text || text.length < 3) return;
      const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          let p = node.parentNode;
          while(p && p !== canvas){
            if(p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
            if(p.classList && (p.classList.contains('user-mark') || p.classList.contains('search-hit'))) return NodeFilter.FILTER_REJECT;
            p = p.parentNode;
          }
          return node.nodeValue && node.nodeValue.includes(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const node = walker.nextNode();
      if(!node) return;
      const idx = node.nodeValue.indexOf(text);
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      const mark = document.createElement('mark');
      mark.className = 'user-mark';
      try{ range.surroundContents(mark); }catch{}
    });
  }
  function removeMark(mark){
    const parent = mark.parentNode;
    if(!parent) return;
    // Rebuild the stored list by re-reading current marks after removal.
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
    const remaining = Array.from(canvas.querySelectorAll('mark.user-mark')).map(m => m.textContent);
    saveStored(remaining);
  }
  function clearAll(){
    canvas.querySelectorAll('mark.user-mark').forEach(m => {
      const parent = m.parentNode;
      if(!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    saveStored([]);
  }

  document.addEventListener('selectionchange', () => {
    const cur = currentSelection();
    if(!cur){ btn.hidden = true; return; }
    positionButton(cur.range);
  });
  btn.addEventListener('mousedown', e => {
    // mousedown fires before selectionchange collapses the selection.
    e.preventDefault();
    wrapSelection();
  });
  canvas.addEventListener('click', e => {
    const m = e.target.closest('mark.user-mark');
    if(m){ removeMark(m); }
  });
  window.addEventListener('scroll', () => { if(!btn.hidden) btn.hidden = true; }, { passive: true });
  const clearBtn = document.getElementById('clearHighlightsBtn');
  if(clearBtn) clearBtn.addEventListener('click', () => { clearAll(); });

  // Restore after other init has completed (TOC, IntersectionObserver, etc.).
  setTimeout(restoreHighlights, 100);
})();

/* ============================================================
   SECTION-VISITED TRACKING
   Each h2/h3 gets a cumulative timer that ticks while the
   heading is inside the viewport. After ≥5s cumulative dwell,
   the heading is marked visited and its TOC entry gets a ✓.
   Persists per-artifact.
============================================================ */
(function initVisited(){
  const canvas = document.getElementById('canvas');
  const toc = document.getElementById('toc');
  if(!canvas || !toc) return;

  // Threshold scales by artifact length. SHORT readers scroll faster;
  // LONG readers dwell longer. Read from <meta name="artifact-length">.
  const lengthMeta = document.querySelector('meta[name="artifact-length"]');
  const lengthVal = (lengthMeta && lengthMeta.content || 'MEDIUM').toUpperCase();
  const DWELL_MS = { SHORT: 3000, MEDIUM: 5000, LONG: 8000 }[lengthVal] || 5000;
  const stored = new Set(store.get('visited') || []);
  const headings = Array.from(canvas.querySelectorAll('h2, h3'));
  if(!headings.length) return;

  const tocLinks = new Map();
  toc.querySelectorAll('a').forEach(a => tocLinks.set(a.getAttribute('href').slice(1), a));
  function markVisited(id){
    if(stored.has(id)) return;
    stored.add(id);
    store.set('visited', Array.from(stored));
    const link = tocLinks.get(id);
    if(link) link.classList.add('is-visited');
    const h = document.getElementById(id);
    if(h) h.setAttribute('data-visited', 'true');
  }
  // Apply already-visited marks from prior sessions.
  stored.forEach(markVisited);

  const dwell = new Map();        // heading id → cumulative ms
  const enteredAt = new Map();    // heading id → timestamp

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const id = e.target.id;
      if(!id) return;
      if(e.isIntersecting){
        enteredAt.set(id, performance.now());
      } else if(enteredAt.has(id)){
        const start = enteredAt.get(id);
        const ms = performance.now() - start;
        enteredAt.delete(id);
        dwell.set(id, (dwell.get(id) || 0) + ms);
        if(dwell.get(id) >= DWELL_MS) markVisited(id);
      }
    });
  }, { threshold: 0.1 });
  headings.forEach(h => { if(h.id) observer.observe(h); });

  // While hidden (unfocused tab, minimized window) do not accrue dwell.
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      enteredAt.forEach((start, id) => {
        dwell.set(id, (dwell.get(id) || 0) + (performance.now() - start));
        enteredAt.delete(id);
      });
    } else {
      // Re-arm timers for headings still visible.
      const seen = new Set();
      const io2 = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if(e.isIntersecting && !seen.has(e.target.id)){
            seen.add(e.target.id);
            enteredAt.set(e.target.id, performance.now());
          }
        });
        io2.disconnect();
      }, { threshold: 0.1 });
      headings.forEach(h => { if(h.id) io2.observe(h); });
    }
  });

  // Periodic tick to mark long-dwelling visible headings without needing them to leave the viewport.
  setInterval(() => {
    enteredAt.forEach((start, id) => {
      const ms = (dwell.get(id) || 0) + (performance.now() - start);
      if(ms >= DWELL_MS) markVisited(id);
    });
  }, 1000);

  const resetBtn = document.getElementById('clearVisitedBtn');
  if(resetBtn) resetBtn.addEventListener('click', () => {
    stored.clear();
    store.set('visited', []);
    toc.querySelectorAll('a.is-visited').forEach(a => a.classList.remove('is-visited'));
    canvas.querySelectorAll('[data-visited]').forEach(h => h.removeAttribute('data-visited'));
    dwell.clear();
    enteredAt.clear();
  });
})();

/* ============================================================
   PHASE ORBIT — light up phase nodes as reader scrolls;
   clicking a node smooth-scrolls to that phase.
============================================================ */
(function initOrbit(){
  const nodes = Array.from(document.querySelectorAll('.orbit__node'));
  if(!nodes.length) return;
  const reached = new Set(store.get('reached') || []);
  // Restore already-reached state
  nodes.forEach(n => {
    if(reached.has(n.dataset.target)) n.setAttribute('data-reached','true');
  });
  // Click to jump
  nodes.forEach(n => {
    n.addEventListener('click', () => {
      const target = document.getElementById(n.dataset.target);
      if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
  // Observe each phase heading; mark reached + active on entry
  const targets = nodes.map(n => document.getElementById(n.dataset.target)).filter(Boolean);
  if(!targets.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const node = nodes.find(n => n.dataset.target === e.target.id);
      if(!node) return;
      if(e.isIntersecting){
        node.setAttribute('data-reached','true');
        reached.add(e.target.id);
        store.set('reached', Array.from(reached));
        nodes.forEach(n => n.removeAttribute('data-active'));
        node.setAttribute('data-active','true');
      }
    });
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
  targets.forEach(t => observer.observe(t));
})();

/* ============================================================
   CONTEXTUAL AMPLIFIER — hover .term-amp[data-note] → fill #amplifier
============================================================ */
(function initAmplifier(){
  const amp = document.getElementById('amplifier');
  const pool = document.getElementById('ampNotes');
  if(!amp || !pool) return;
  const emptyHtml = amp.innerHTML;
  let currentId = null;

  function show(id){
    if(id === currentId) return;
    const note = pool.querySelector(`[data-note-id="${id}"]`);
    if(!note) return;
    currentId = id;
    amp.innerHTML = '<span class="amplifier__label">Term amplifier</span>' + note.innerHTML;
    // Mark the corresponding term active
    document.querySelectorAll('.term-amp.is-active').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll(`.term-amp[data-note="${id}"]`).forEach(t => t.classList.add('is-active'));
  }
  function reset(){
    currentId = null;
    amp.innerHTML = emptyHtml;
    document.querySelectorAll('.term-amp.is-active').forEach(t => t.classList.remove('is-active'));
  }

  document.querySelectorAll('.term-amp[data-note]').forEach(t => {
    t.addEventListener('mouseenter', () => show(t.dataset.note));
    t.addEventListener('focus', () => show(t.dataset.note));
    t.setAttribute('tabindex','0');
  });
  const canvas = document.getElementById('canvas');
  if(canvas){
    canvas.addEventListener('mouseleave', reset);
  }
})();

/* ============================================================
   METACOGNITIVE CHECKPOINTS — textarea persistence + Compare to Expert
============================================================ */
(function initCheckpoints(){
  document.querySelectorAll('.checkpoint').forEach(cp => {
    const id = cp.dataset.checkpointId;
    const ta = cp.querySelector('textarea');
    const savedLabel = cp.querySelector('[data-checkpoint-saved]');
    const revealBtn = cp.querySelector('[data-checkpoint-reveal]');
    if(!id || !ta) return;

    // Restore prior answer
    const prior = store.get('cp:' + id);
    if(prior){ ta.value = prior; if(savedLabel) savedLabel.textContent = 'Saved'; }

    // Persist as user types (debounced)
    let t;
    ta.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        store.set('cp:' + id, ta.value);
        if(savedLabel) savedLabel.textContent = 'Saved';
      }, 400);
    });

    if(revealBtn){
      revealBtn.addEventListener('click', () => {
        cp.classList.toggle('is-revealed');
        revealBtn.textContent = cp.classList.contains('is-revealed')
          ? 'Hide expert answer'
          : 'Compare to expert answer';
      });
    }
  });
})();

/* ============================================================
   LAUNCH PAD — progressive hint reveal
============================================================ */
(function initLaunchpad(){
  const btn = document.getElementById('hintBtn');
  if(!btn) return;
  const hints = Array.from(document.querySelectorAll('.launchpad__hint'));
  const total = hints.length;
  let shown = 0;

  // Restore prior state
  const prior = parseInt(store.get('hints') || 0, 10);
  for(let i=0; i<prior && i<total; i++){
    hints[i].classList.add('is-visible');
    shown = i + 1;
  }
  updateBtn();

  btn.addEventListener('click', () => {
    if(shown >= total) return;
    hints[shown].classList.add('is-visible');
    shown++;
    store.set('hints', shown);
    updateBtn();
  });

  function updateBtn(){
    if(shown >= total){
      btn.textContent = 'All hints revealed';
      btn.disabled = true;
    } else {
      btn.textContent = `Reveal hint ${shown + 1} of ${total}`;
    }
  }
})();
