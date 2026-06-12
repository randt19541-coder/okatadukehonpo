/* =========================================
   かたづけ本舗 メインJS
========================================= */

/* ---------- 定数 ---------- */
// 管理者パスワードは「ハッシュ値（指紋）」で保存。元のパスワードはコードに残さない。
//
// ▼ パスワードを変更したいとき:
//   1. ブラウザでこのサイトを開き、F12 →「コンソール」タブに以下を貼って実行
//      （'あたらしい合言葉' の部分を新しいパスワードに書き換える）:
//        crypto.subtle.digest('SHA-256', new TextEncoder().encode('あたらしい合言葉'))
//          .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
//   2. 表示された長い文字列を、下の ADMIN_PASSWORD_HASH の値に貼り替えて保存。
const ADMIN_PASSWORD_HASH = '32280f7b56de2fc61b4f4a2356a37bdaad95f5c3d232d7793a00aaad95d320eb';
const STORAGE_KEY    = 'benriya_jisseki';

/* 入力文字列を SHA-256 でハッシュ化し、16進文字列で返す */
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  fuyo:'🗑️', ihin:'🕯️', gomi:'🏚️', benriya:'🔧', hikkoshi:'🚚', cleaning:'🧹', reform:'🏗️'
};

/* ---------- 状態 ---------- */
let isAdmin       = false;
let currentService = null;

/* ---------- LocalStorage ---------- */
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
const overlay       = document.getElementById('modal-overlay');
const modalTitle    = document.getElementById('modal-title');
const modalGallery  = document.getElementById('modal-gallery');
const modalEmpty    = document.getElementById('modal-empty');
const modalClose    = document.getElementById('modal-close');
const adminPanel    = document.getElementById('admin-panel');
const adminLogin    = document.getElementById('admin-login');
const adminToggleBtn    = document.getElementById('admin-toggle-btn');
const adminLoginForm    = document.getElementById('admin-login-form');
const adminPw           = document.getElementById('admin-pw');
const adminPwSubmit     = document.getElementById('admin-pw-submit');
const adminLoginMsg     = document.getElementById('admin-login-msg');
const adminAddBtn       = document.getElementById('admin-add-btn');
const adminLogoutBtn    = document.getElementById('admin-logout-btn');
const adminImgUrl       = document.getElementById('admin-img-url');
const adminComment      = document.getElementById('admin-comment');

/* サービスカード クリック */
document.querySelectorAll('.service-item').forEach(item => {
  const open = () => openModal(item.dataset.service);
  item.addEventListener('click', open);
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});

function openModal(serviceKey) {
  currentService = serviceKey;
  modalTitle.textContent = SERVICE_LABELS[serviceKey] || serviceKey;
  renderGallery();
  resetAdminUI();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
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
function renderGallery() {
  const data    = loadData();
  const records = (data[currentService] || []);
  modalGallery.innerHTML = '';

  if (records.length === 0) {
    modalEmpty.classList.add('show');
    return;
  }
  modalEmpty.classList.remove('show');

  records.forEach((rec, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    const imgPart = rec.imgUrl
      ? `<img src="${escHtml(rec.imgUrl)}" alt="実績写真 ${idx + 1}" loading="lazy" onerror="this.parentElement.querySelector('.gallery-img-placeholder').style.display='flex'; this.style.display='none';">
         <div class="gallery-img-placeholder" style="display:none">${SERVICE_ICONS[currentService]}</div>`
      : `<div class="gallery-img-placeholder">${SERVICE_ICONS[currentService]}</div>`;

    const deletePart = isAdmin
      ? `<button class="gallery-delete-btn" data-idx="${idx}" title="削除">✕</button>` : '';

    card.innerHTML = `
      ${imgPart}
      ${deletePart}
      <div class="gallery-card-body"><p>${escHtml(rec.comment)}</p></div>
    `;
    modalGallery.appendChild(card);
  });

  /* 削除ボタン */
  if (isAdmin) {
    modalGallery.querySelectorAll('.gallery-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i   = parseInt(btn.dataset.idx);
        const d   = loadData();
        d[currentService].splice(i, 1);
        saveData(d);
        renderGallery();
      });
    });
  }
}

/* 実績追加 */
adminAddBtn.addEventListener('click', () => {
  const url     = adminImgUrl.value.trim();
  const comment = adminComment.value.trim();
  if (!comment) { alert('コメントを入力してください。'); return; }

  const d = loadData();
  if (!d[currentService]) d[currentService] = [];
  d[currentService].push({ imgUrl: url, comment });
  saveData(d);

  adminImgUrl.value  = '';
  adminComment.value = '';
  renderGallery();
});

/* ---------- 管理者：ロゴ5回タップで起動 ---------- */
let logoTapCount = 0;
let logoTapTimer = null;
const logoEl = document.querySelector('.logo');

logoEl.style.cursor = 'pointer';
logoEl.addEventListener('click', () => {
  logoTapCount++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1500);

  if (logoTapCount >= 5) {
    logoTapCount = 0;
    const area = document.getElementById('admin-area');
    if (!isAdmin) {
      area.style.display = 'block';
      adminPw.focus();
    }
  }
});

adminPwSubmit.addEventListener('click', doLogin);
adminPw.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const inputHash = await sha256Hex(adminPw.value);
  if (inputHash === ADMIN_PASSWORD_HASH) {
    isAdmin = true;
    adminLogin.style.display  = 'none';
    adminPanel.style.display  = 'block';
    renderGallery();
  } else {
    adminLoginMsg.textContent = 'パスワードが違います。';
    adminPw.value = '';
    adminPw.focus();
  }
}

adminLogoutBtn.addEventListener('click', () => {
  isAdmin = false;
  adminPanel.style.display = 'none';
  adminLogin.style.display = 'block';
  document.getElementById('admin-area').style.display = 'none';
  adminPw.value = '';
  renderGallery();
});

function resetAdminUI() {
  if (!isAdmin) {
    adminLogin.style.display  = 'block';
    adminPanel.style.display  = 'none';
    // admin-areaの表示はロゴ5回タップで制御するためリセットしない
    adminLoginMsg.textContent = '';
  }
}

/* ---------- XSS対策 ---------- */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* =========================================
   お問い合わせフォーム
========================================= */
const form = document.getElementById('contact-form');
const msg  = document.getElementById('form-message');

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = '';
  msg.className   = 'form-message';

  // 必須項目チェック
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
    // Web3Forms へ送信（入力内容をそのまま受信メールに転送してくれる）
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();

    if (data.success) {
      form.reset();
      msg.textContent = '送信が完了しました。お問い合わせありがとうございます。担当者より折り返しご連絡いたします。';
      msg.classList.add('success');
    } else {
      throw new Error(data.message || '送信に失敗しました');
    }
  } catch (err) {
    msg.textContent = '申し訳ありません。送信に失敗しました。お急ぎの場合はお電話（0120-490-530）でご連絡ください。';
    msg.classList.add('error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = label;
  }
});
