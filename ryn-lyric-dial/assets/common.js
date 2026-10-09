// Shared bits for the Ryn lyric-dial concepts. Original placeholder lyrics.
const C = {bg:'#111725', bg2:'#141a28', gold:'#b8955a', goldHi:'#d4b47a', text:'#e6e8ee', sec:'#a3aab8', muted:'#6b7385', line:'#222a3a'};
const FONT_JA = '"Noto Sans CJK JP", Inter, sans-serif';
const FONT_ZH = '"Noto Sans CJK SC", Inter, sans-serif';
const FONT_UI = 'Inter, "Noto Sans CJK JP", sans-serif';
const LYRICS = [
  {ja:'窓の向こうで 夜がほどけていく', zh:'窗外的夜色 正一点点解开'},
  {ja:'名前のない駅に 灯りがひとつ', zh:'无名的车站 亮着一盏灯'},
  {ja:'君が残した 鼻歌をなぞる', zh:'我循着你留下的哼唱'},
  {ja:'針はまだ 同じ場所を回る', zh:'指针仍在同一处打转'},
  {ja:'遠回りした道も 地図になるなら', zh:'若绕过的远路 也能成为地图'},
  {ja:'迷った日々を 星座と呼ぼう', zh:'就把迷路的日子 称作星座'},
  {ja:'静かな音が 胸の奥で揺れる', zh:'安静的声音 在心底摇晃'},
  {ja:'言えなかった言葉 風に預けて', zh:'把说不出口的话 托付给风'},
  {ja:'朝が来るたび 少しずつ近づく', zh:'每当清晨来临 就靠近一点'},
  {ja:'今日の光を 明日へ渡そう', zh:'把今天的光 递给明天'},
  {ja:'回り続ける この小さな世界で', zh:'在这不停旋转的小小世界里'},
  {ja:'もう一度だけ 君の歌を聴かせて', zh:'再让我听一次 你的歌'},
];
const N = LYRICS.length, LINE_DUR = 3.0, TRANS = 0.9, SONG_DUR = N * LINE_DUR;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOutCubic = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOutBack = (x, s = 1.2) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const mod = (a, n) => ((a % n) + n) % n;

// p: continuous "line position". Holds at idx for most of the line, eases idx-1 -> idx during the first TRANS seconds.
function lyricState(t, trans = TRANS, ease = easeInOutCubic) {
  const step = Math.floor(t / LINE_DUR), local = t - step * LINE_DUR;
  const k = ease(clamp(local / trans));
  return {t, idx: mod(step, N), local, k, p: mod(step - 1 + k, N), song: mod(t, SONG_DUR), progress: mod(t, SONG_DUR) / SONG_DUR};
}
// signed distance of line i from p, wrapped to [-N/2, N/2)
function rel(i, p) { return mod(i - p + N / 2, N) - N / 2; }
// 1 at the current line, falls to 0 one line away
function focus(d) { return clamp(1 - Math.abs(d)); }
function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// fake audio: smooth pseudo-spectrum
function fakeLevel(t) { return .55 + .25 * Math.sin(t * 7.1) * Math.sin(t * 2.3) + .15 * Math.sin(t * 13.7 + 1.3); }
function fakeBand(t, x) { // x in [0,1)
  const s = Math.sin(t * 3.1 + x * 19) * .5 + Math.sin(t * 5.7 - x * 31) * .3 + Math.sin(t * 1.3 + x * 7) * .2;
  return clamp(.35 + .45 * s * fakeLevel(t) + .2 * Math.sin(x * 60 + t * 9) * Math.sin(t * 4.4));
}

// Draw text along an arc. Glyph tops point away from the centre. align: 'center' | 'start'
function arcText(ctx, str, cx, cy, r, angle, align = 'center', letter = 0) {
  const chars = [...str], ws = chars.map(ch => ctx.measureText(ch).width + letter);
  const total = ws.reduce((a, b) => a + b, 0) - letter;
  let a = align === 'center' ? angle - total / r / 2 : angle;
  for (let i = 0; i < chars.length; i++) {
    const am = a + ws[i] / 2 / r;
    ctx.save();
    ctx.translate(cx + r * Math.cos(am), cy + r * Math.sin(am));
    ctx.rotate(am + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    a += ws[i] / r;
  }
  return total / r;
}

const params = new URLSearchParams(location.search);
const FROZEN = params.has('t') ? parseFloat(params.get('t')) : null;
const T0 = parseFloat(params.get('start') || '1.2');

function loadImage(src) { return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }

async function boot(draw, opts = {}) {
  const stage = document.getElementById('stage');
  const fit = () => { const s = Math.min(innerWidth / 1280, innerHeight / 800); stage.style.transform = `translate(${(innerWidth - 1280 * s) / 2}px,${(innerHeight - 800 * s) / 2}px) scale(${s})`; };
  fit(); addEventListener('resize', fit);
  const cv = document.createElement('canvas'), dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
  cv.width = 1280 * dpr; cv.height = 800 * dpr; stage.prepend(cv);
  const ctx = cv.getContext('2d');
  try { await Promise.all(['400 20px "Noto Sans CJK JP"', '400 20px "Noto Sans CJK SC"', '400 20px Inter', '600 20px Inter'].map(f => document.fonts.load(f))); } catch (e) {}
  const cover = await loadImage('../assets/cover.png');
  const env = {ctx, cover, w: 1280, h: 800};
  if (opts.init) opts.init(env);
  const start = performance.now();
  const frame = now => {
    const t = FROZEN != null ? FROZEN : T0 + (now - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(env, t, lyricState(t, opts.trans, opts.ease));
    const el = document.getElementById('time'); if (el) el.textContent = fmtTime(mod(t, SONG_DUR)) + ' / ' + fmtTime(SONG_DUR);
    if (FROZEN == null) requestAnimationFrame(frame); else document.body.dataset.ready = '1';
  };
  requestAnimationFrame(frame);
}

// circular cover clip
function drawCover(ctx, img, x, y, r, rot = 0) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(x, y); ctx.rotate(rot);
  if (img) ctx.drawImage(img, -r, -r, r * 2, r * 2); else { ctx.fillStyle = '#2a3346'; ctx.fillRect(-r, -r, r * 2, r * 2); }
  ctx.restore();
}
function bgFill(ctx, cx = 640, cy = 400, r = 900) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, C.bg2); g.addColorStop(1, C.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 800);
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
