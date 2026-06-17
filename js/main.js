/* =========================================
   かたづけ本舗 メインJS
========================================= */

/* ---------- サービス情報 ---------- */
const SERVICE_LABELS = {
  fuyo:     '🗑️ 不用品回収・処分 ｜ 実績ギャラリー',
  ihin:     '🕯️ 遺品整理 ｜ 実績ギャラリー',
  gomi:     '🏚️ ゴミ屋敷・片付け ｜ 実績ギャラリー',
  benriya:  '🔧 便利屋・日常サポート ｜ 実績ギャラリー',
  hikkoshi: '🚚 引越し補助・荷物運び ｜ 実績ギャラリー',
  cleaning: '🧹 ハウスクリーニング ｜ 実績ギャラリー',
  reform:   '🏗️ リフォーム ｜ 実績ギャラリー',
};

const SERVICE_ICONS = {
  fuyo: '🗑️', ihin: '🕯️', gomi: '🏚️',
  benriya: '🔧', hikkoshi: '🚚', cleaning: '🧹', reform: '🏗️',
};

/* ---------- 状態 ---------- */
let currentService = null;
let galleryCache   = null;   // ページロード中に1回だけfetchする

/* ---------- ギャラリーデータ取得 ---------- */
async function fetchGallery() {
  if (galleryCache) return galleryCache;
  try {
    const res = await fetch('./data/gallery.json');
    if (!res.ok) throw new Error('fetch failed');
    galleryCache = await res.json();
  } catch {
    galleryCache = {};
  }
  return galleryCache;
}

/* =========================================
   ハンバーガーメニュー
========================================= */
const hamburger = document.getElementById('hamburger');
const nav       = document.getElementById('global-nav');

hamburger.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
});
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    hamburger.classList.remove('open');
  });
});

/* =========================================
   お客様の声 タブ
========================================= */
document.querySelectorAll('.voice-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const idx = tab.dataset.tab;
    document.querySelectorAll('.voice-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.voice-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.voice-panel[data-panel="${idx}"]`).classList.add('active');
  });
});

/* =========================================
   実績モーダル
========================================= */
const overlay      = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalGallery = document.getElementById('modal-gallery');
const modalEmpty   = document.getElementById('modal-empty');
const modalClose   = document.getElementById('modal-close');

/* サービスカード クリック */
document.querySelectorAll('.service-item').forEach(item => {
  const open = () => openModal(item.dataset.service);
  item.addEventListener('click', open);
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
});

async function openModal(serviceKey) {
  currentService = serviceKey;
  modalTitle.textContent = SERVICE_LABELS[serviceKey] || serviceKey;

  // ローディング中はスピナーを表示
  modalGallery.innerHTML = '';
  modalEmpty.classList.remove('show');
  const loading = document.createElement('p');
  loading.className = 'gallery-loading';
  loading.textContent = '読み込み中…';
  modalGallery.appendChild(loading);

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  await renderGallery();
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  currentService = null;
}

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ギャラリー描画 */
async function renderGallery() {
  const data    = await fetchGallery();
  const records = data[currentService] || [];

  modalGallery.innerHTML = '';

  if (records.length === 0) {
    modalEmpty.classList.add('show');
    return;
  }
  modalEmpty.classList.remove('show');

  records.forEach((rec, idx) => {
    modalGallery.appendChild(createGalleryCard(rec, idx));
  });
}

function createGalleryCard(rec, idx) {
  const card = document.createElement('div');
  card.className = 'gallery-card';

  const imgBefore = rec.imgBefore || rec.imgUrl;
  const imgAfter  = rec.imgAfter;

  if (imgBefore || imgAfter) {
    const photoWrap = document.createElement('div');
    photoWrap.className = imgBefore && imgAfter ? 'gallery-photo-pair' : 'gallery-photo-single';

    function makePhoto(src, label) {
      const wrap = document.createElement('div');
      wrap.className = 'gallery-photo-wrap';

      const img = document.createElement('img');
      img.src     = src;
      img.alt     = label;
      img.loading = 'lazy';

      const placeholder = document.createElement('div');
      placeholder.className = 'gallery-img-placeholder';
      placeholder.style.display = 'none';
      placeholder.textContent = SERVICE_ICONS[currentService] || '📷';
      img.addEventListener('error', () => {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
      });

      const lbl = document.createElement('span');
      lbl.className = 'gallery-photo-label';
      lbl.textContent = label;

      wrap.appendChild(img);
      wrap.appendChild(placeholder);
      wrap.appendChild(lbl);
      return wrap;
    }

    if (imgBefore) photoWrap.appendChild(makePhoto(imgBefore, '施工前'));
    if (imgAfter)  photoWrap.appendChild(makePhoto(imgAfter,  '施工後'));
    card.appendChild(photoWrap);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'gallery-img-placeholder';
    placeholder.textContent = SERVICE_ICONS[currentService] || '📷';
    card.appendChild(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'gallery-card-body';
  const p = document.createElement('p');
  p.textContent = rec.comment;   // textContent でXSS対策
  body.appendChild(p);
  card.appendChild(body);

  return card;
}

/* =========================================
   ロゴ5回タップ → 管理ページへ
========================================= */
let logoTapCount = 0;
let logoTapTimer = null;
const logoEl = document.querySelector('.logo');

logoEl.addEventListener('click', () => {
  logoTapCount++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1500);

  if (logoTapCount >= 5) {
    logoTapCount = 0;
    window.location.href = './admin.html';
  }
});

/* =========================================
   お問い合わせフォーム
========================================= */
const form = document.getElementById('contact-form');
const msg  = document.getElementById('form-message');

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = '';
  msg.className   = 'form-message';

  if (!form.name.value.trim() || !form.tel.value.trim() || !form.service.value || !form.agree.checked) {
    msg.textContent = '必須項目をすべてご入力・ご確認ください。';
    msg.classList.add('error');
    return;
  }

  const submitBtn = form.querySelector('.btn-submit');
  const label     = submitBtn.textContent;
  submitBtn.disabled    = true;
  submitBtn.textContent = '送信中…';

  try {
    const res = await fetch(form.action, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();

    if (data.success) {
      form.reset();
      msg.textContent = '送信が完了しました。お問い合わせありがとうございます。担当者より折り返しご連絡いたします。';
      msg.classList.add('success');
    } else {
      throw new Error(data.message || '送信に失敗しました');
    }
  } catch {
    msg.textContent = '申し訳ありません。送信に失敗しました。お急ぎの場合はお電話（0120-490-530）でご連絡ください。';
    msg.classList.add('error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = label;
  }
});
