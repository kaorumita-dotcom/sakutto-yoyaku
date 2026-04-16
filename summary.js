// ============================================================
//  サクッと要約 — summary.js
// ============================================================

const GEMINI_MODEL = 'gemini-2.5-flash';

// ── レベル設定 ────────────────────────────────────────────────

const LEVEL_CONFIG = {
  basic:    { passageChars: 150, summaryChars: 50,  desc: '150字程度の文章を、50字程度に要約しましょう' },
  middle:   { passageChars: 250, summaryChars: 80,  desc: '250字程度の文章を、80字程度に要約しましょう' },
  advanced: { passageChars: 350, summaryChars: 120, desc: '350字程度の文章を、120字程度に要約しましょう' },
};

// ── トピックプール（101種類） ─────────────────────────────────

const TOPICS = [
  // 日常生活
  '料理', '食事', '朝食', '睡眠', '一人暮らし', '節約', '掃除', '料理レシピ',
  // 食べ物・飲み物
  'コーヒー', 'お茶', 'パン', 'チョコレート', 'ラーメン', '和食', 'アイスクリーム', 'お弁当',
  // 趣味・娯楽
  '趣味', '音楽', '映画', '読書', 'ゲーム', '写真', '映画鑑賞', '絵を描くこと',
  'ポッドキャスト', 'DIY', '園芸', '手芸',
  // スポーツ・健康
  'スポーツ', '健康', 'ヨガ', 'ランニング', '水泳', '登山', 'サイクリング',
  'ストレッチ', 'ウォーキング',
  // 自然・環境
  '自然', '天気', '植物', '海', '山', '川', '森', '花火', '紅葉', '雪景色', '梅雨',
  // 社会・テクノロジー
  'テクノロジー', '環境', 'SNS', 'AI', 'テレワーク', '食品ロス', 'リサイクル',
  'SDGs', '少子化', '電気自動車', '再生可能エネルギー', '医療技術',
  // 文化・芸術
  '祭り', '伝統工芸', '書道', '茶道', '落語', '絵画', 'ファッション',
  // 旅行・観光
  '旅行', '温泉', '神社仏閣', '城', '観光地', '地方の食文化', '空港',
  // 学校・学び
  '学習', '学校生活', '語学学習', 'オンライン学習', '読書習慣', '図書館', '文房具',
  '就職活動', 'インターンシップ', '資格取得',
  // 人間関係・社会生活
  '友情', '家族', 'アルバイト', 'ボランティア',
  // 自然・動物・宇宙
  '動物', '宇宙', '天文学', 'ペット',
  // 場所・施設
  'カフェ', '公園', '博物館', '買い物', '交通', '自転車通学',
  // アウトドア
  'アウトドア', 'キャンプ', 'ピクニック',
];

// ── 状態 ─────────────────────────────────────────────────────

const state = {
  level: 'basic',
  passage: '',
  sessionScores: [],
  recentTopics: [],
  loading: false,
};

// ── DOM ──────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

// ── トピック選択（直近10件は除外） ───────────────────────────

function randomTopic() {
  const recent = state.recentTopics.slice(-10);
  const pool   = TOPICS.filter((t) => !recent.includes(t));
  const avail  = pool.length > 0 ? pool : TOPICS;
  const topic  = avail[Math.floor(Math.random() * avail.length)];
  state.recentTopics.push(topic);
  return topic;
}

// ── Gemini API（Netlifyプロキシ経由） ─────────────────────────

async function callGemini(prompt) {
  const res = await fetch('/.netlify/functions/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `APIエラー (HTTP ${res.status})`);
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(text);
}

// ── 問題生成プロンプト ────────────────────────────────────────

async function generatePassage() {
  const cfg   = LEVEL_CONFIG[state.level];
  const topic = randomTopic();

  const prompt = `あなたは日本語要約練習の問題作成の専門家です。大学1年生向けの要約練習用の日本語文章を1段落生成してください。

条件：
- 文字数: 約${cfg.passageChars}字（±20字以内）
- トピック: ${topic}
- 内容: 日常的で身近なテーマ、明確なメインアイデア＋サポート情報1〜2つ
- 語彙: 大学1年生が読める難易度
- 禁止: 定型表現・テンプレートの使用、同じ内容の繰り返し

JSON形式のみで出力（説明文・コードフェンス不要）:
{
  "passage": "文章テキスト"
}`;

  return callGemini(prompt);
}

// ── フィードバックプロンプト ──────────────────────────────────

async function generateFeedback(passage, summary, targetChars) {
  const prompt = `あなたは日本語要約練習の採点者です。以下の文章と学生の要約を評価し、すべて日本語で回答してください。

【元の文章】
${passage}

【学生の要約】（目標: 約${targetChars}字）
${summary}

採点基準:
5: 要点が正確に、自分の言葉で簡潔にまとめられている
4: 要点は伝わるが、言い換えが不十分または冗長
3: 部分的に正しいが、重要情報の欠落や誤りがある
2: 元の文をそのままコピーしすぎ、または内容が不正確
1: 要約として機能していない（意味が不明瞭）

JSON形式のみで出力（説明文・コードフェンス不要）:
{
  "score": 整数1〜5,
  "overall": "総評（1〜2文）",
  "goodPoints": "良い点（1〜2文）",
  "improvements": "改善ヒント（1〜2文）",
  "modelAnswer": "模範要約例（約${targetChars}字）"
}`;

  return callGemini(prompt);
}

// ── UIヘルパー ────────────────────────────────────────────────

function setLoading(on, msg = '生成中...') {
  state.loading = on;
  el('loadingArea').classList.toggle('hidden', !on);
  el('loadingMsg').textContent = msg;
  el('generateBtn').disabled = on;
}

function starsHTML(score) {
  const colorMap = { 1: '#b91c1c', 2: '#ef4444', 3: '#f59e0b', 4: '#10b981', 5: '#059669' };
  const c = colorMap[score] || '#5c2d18';
  return `<span style="color:${c}">${'★'.repeat(score)}</span>` +
         `<span style="color:#d1d5db">${'★'.repeat(5 - score)}</span>`;
}

function scoreBg(score) {
  return { 1: '#fee2e2', 2: '#fef3c7', 3: '#fef9c3', 4: '#d1fae5', 5: '#a7f3d0' }[score] || '#ede3d6';
}

function updateScoreBar() {
  const scores = state.sessionScores;
  if (!scores.length) { el('scoreBar').classList.add('hidden'); return; }
  el('scoreBar').classList.remove('hidden');
  el('practiceCount').textContent = `${scores.length}回練習`;
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  el('avgScore').textContent = `平均 ${avg} / 5`;
  el('scoreDots').innerHTML = scores.map((s) => `<div class="dot dot-${s}">${s}</div>`).join('');
}

// ── アクション：問題生成 ──────────────────────────────────────

async function doGenerate() {
  if (state.loading) return;

  el('emptyState').classList.remove('hidden');
  el('passageBox').classList.add('hidden');
  el('summarySection').classList.add('faded');
  el('summarySection').classList.remove('active');
  el('feedbackSection').classList.add('hidden');
  el('summaryInput').value = '';
  el('summaryInput').disabled = true;
  el('summaryCharCount').textContent = '0';
  el('feedbackBtn').disabled = true;

  setLoading(true, '問題を生成中...');

  try {
    const result  = await generatePassage();
    state.passage = result.passage;

    const cfg = LEVEL_CONFIG[state.level];
    el('passageText').textContent      = result.passage;
    el('passageCharBadge').textContent = `${result.passage.length} 字`;
    el('targetChars').textContent      = cfg.summaryChars;

    el('emptyState').classList.add('hidden');
    el('passageBox').classList.remove('hidden');
    el('summarySection').classList.remove('faded');
    el('summarySection').classList.add('active');
    el('summaryInput').disabled = false;
    el('summaryInput').focus();

  } catch (err) {
    alert(`エラーが発生しました:\n${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ── アクション：フィードバック ────────────────────────────────

async function doFeedback() {
  if (state.loading) return;

  const summary = el('summaryInput').value.trim();
  if (!summary) return;

  const cfg = LEVEL_CONFIG[state.level];
  setLoading(true, 'フィードバックを生成中...');

  try {
    const fb = await generateFeedback(state.passage, summary, cfg.summaryChars);

    state.sessionScores.push(fb.score);
    updateScoreBar();

    el('scoreDisplay').style.background = scoreBg(fb.score);
    el('starDisplay').innerHTML  = starsHTML(fb.score);
    el('scoreValue').textContent = `${fb.score} / 5`;
    el('fbOverall').textContent  = fb.overall;
    el('fbGood').textContent     = fb.goodPoints;
    el('fbImprove').textContent  = fb.improvements;
    el('fbModel').textContent    = fb.modelAnswer;

    el('summaryInput').disabled = true;
    el('feedbackBtn').disabled  = true;
    el('feedbackSection').classList.remove('hidden');
    el('feedbackSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    alert(`エラーが発生しました:\n${err.message}`);
  } finally {
    setLoading(false);
  }
}

// ── モーダル ──────────────────────────────────────────────────

function showGuideModal() { el('guideModal').classList.remove('hidden'); }
function hideGuideModal() { el('guideModal').classList.add('hidden'); }

// ── イベントリスナー ──────────────────────────────────────────

document.querySelectorAll('.level-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.loading) return;
    document.querySelectorAll('.level-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.level = btn.dataset.level;
    el('levelDesc').textContent = LEVEL_CONFIG[state.level].desc;
  });
});

el('generateBtn').addEventListener('click', doGenerate);

el('summaryInput').addEventListener('input', () => {
  const len = el('summaryInput').value.trim().length;
  el('summaryCharCount').textContent = len;
  el('feedbackBtn').disabled = len < 5;
});

el('feedbackBtn').addEventListener('click', doFeedback);

el('nextBtn').addEventListener('click', () => {
  el('feedbackSection').classList.add('hidden');
  el('summaryInput').disabled = false;
  doGenerate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

el('guideBtn').addEventListener('click', showGuideModal);
el('closeGuideBtn').addEventListener('click', hideGuideModal);
el('guideModal').addEventListener('click', (e) => { if (e.target === el('guideModal')) hideGuideModal(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./summary-sw.js').catch(() => {});
}
