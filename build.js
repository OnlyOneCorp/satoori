#!/usr/bin/env node
/**
 * 사투리 맞추기 정적 페이지 생성기
 * 사용법: node build.js  →  public/{slug}/index.html × 200 + sitemap.xml + robots.txt
 * 데이터: ./public/index.html에서 `const POOL = {...}` 자동 추출
 * 주의: 기존 public/ 구조(index.html, _headers, worker.js 연동)를 유지한 채 페이지만 추가 생성
 */
const fs = require("fs");
const path = require("path");

/* ── 설정 ── */
const SITE = "https://satoori.onlyonecorpceo.workers.dev";
const GA_ID = "G-PLXQF9Z93K";
const HUB = "https://main.onlyonecorpceo.workers.dev";
const EMAIL = "onlyonecorpceo@gmail.com";
const COUPANG_URL = "https://link.coupang.com/a/eYpzkaxPs4";
const AMAZON_URL = "https://www.amazon.com/s?k=dialect+slang+books&tag=onlyone0c-20";
const PUB = path.join(__dirname, "public");
const INDEX = path.join(PUB, "index.html");

/* ── index.html에서 POOL 추출 ── */
const src = fs.readFileSync(INDEX, "utf8");
const m = src.match(/const POOL = (\{[\s\S]*?\n\});/);
if (!m) { console.error("❌ index.html에서 POOL 블록을 찾지 못했습니다."); process.exit(1); }
const POOL = eval("(" + m[1] + ")");

/* ── 지역 영문명 (한국어 풀용) ── */
const REGION_EN = { "경상도": "Gyeongsang", "전라도": "Jeolla", "충청도": "Chungcheong", "강원도": "Gangwon", "제주도": "Jeju" };

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const used = new Set();
function slugify(q) {
  let s = q.trim().replace(/[?!.,'"’‘]/g, "").replace(/\s+/g, "-").toLowerCase();
  if (s.length > 60) s = s.slice(0, 60);
  let base = s || "w", i = 2;
  while (used.has(s)) s = base + "-" + i++;
  used.add(s);
  return s;
}

/* ── 페이지 템플릿 ── */
function pageHtml(it, bonus, related) {
  const isKo = it.pool === "ko";
  const hint = POOL[it.pool].hint[it.r] || "";
  const regionEn = isKo ? REGION_EN[it.r] || it.r : it.r;

  const titleKo = isKo
    ? `${it.q} 뜻 — 어느 지역 사투리?`
    : `${it.q} 뜻 — 영어 사투리 표현`;
  const desc = isKo
    ? `'${it.q}'는 ${it.r} 사투리로 '${it.m}'라는 뜻이에요. 사투리 맞추기 퀴즈로 지역별 사투리 실력을 확인해보세요.`
    : `'${it.q}' is ${it.r} dialect meaning '${it.m}'. Test your dialect IQ with our quiz.`;

  const h1Ko = isKo ? `'${it.q}', 무슨 뜻일까?` : `'${it.q}', 무슨 뜻일까?`;
  const h1En = `What does '${it.q}' mean?`;

  const meanKo = isKo
    ? `<b>${it.r}</b> 사투리로 <b>'${esc(it.m)}'</b>라는 뜻이에요.`
    : `<b>${esc(it.r)}</b> 지역 영어 사투리로 <b>'${esc(it.m)}'</b>라는 뜻이에요.`;
  const meanEn = isKo
    ? `A Korean dialect expression from <b>${regionEn}</b>. Standard Korean: <b>'${esc(it.m)}'</b>.`
    : `<b>${esc(it.r)}</b> dialect meaning <b>'${esc(it.m)}'</b>.`;

  const hintKo = isKo ? esc(hint) : "";
  const hintEn = !isKo ? esc(hint) : "";
  const srcHtml = it.src ? `<div class="srcline"><span data-ko>🎬 출처: ${esc(it.src)}</span><span data-en class="hidden">🎬 From: ${esc(it.src)}</span></div>` : "";

  const bonusHtml = bonus.map(b => `<div class="card">
    <div class="bq">${esc(b.q)}</div>
    <div class="ba"><span data-ko>${b.pool === "ko" ? esc(b.r) + " 사투리 · '" + esc(b.m) + "'" : esc(b.r) + " · '" + esc(b.m) + "'"}</span><span data-en class="hidden">${b.pool === "ko" ? (REGION_EN[b.r] || b.r) + " dialect · '" + esc(b.m) + "'" : esc(b.r) + " · '" + esc(b.m) + "'"}</span></div>
    <a class="more" href="/${encodeURIComponent(b.slug)}/"><span data-ko>자세히 →</span><span data-en class="hidden">More →</span></a>
  </div>`).join("");

  const relHtml = related.map(r =>
    `<a href="/${encodeURIComponent(r.slug)}/">${esc(r.q)}</a>`).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titleKo)} | 사투리 맞추기</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${encodeURIComponent(it.slug)}/">
<meta property="og:title" content="${esc(titleKo)} | 사투리 맞추기">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/${encodeURIComponent(it.slug)}/">
<meta property="og:type" content="article">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script>
<style>
:root{--ink:#1d1d1f;--sub:#6e6e73;--line:#e3e3e6;--bg:#f5f5f7;--card:#fff;--logo:#43474d;--accent:#0071e3;--ok:#1c8e4a}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--ink);line-height:1.7;-webkit-font-smoothing:antialiased}
.wrap{max-width:640px;margin:0 auto;padding:24px 20px 60px}
header{display:flex;justify-content:space-between;align-items:center;padding:8px 0 32px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--ink);font-weight:700;font-size:15px}
.lang-btn{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:6px 14px;font-size:13px;cursor:pointer;color:var(--ink);font-family:inherit}
.crumb{font-size:13px;color:var(--sub);margin-bottom:10px}
h1{font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.35;margin-bottom:20px}
.answer{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:14px}
.badge{display:inline-block;background:var(--ink);color:#fff;border-radius:99px;padding:4px 14px;font-size:13px;font-weight:700;margin-bottom:12px}
.answer .mean{font-size:17px;margin-bottom:10px}
.answer .hint{font-size:14px;color:var(--sub)}
.srcline{font-size:13px;color:var(--sub);margin-top:10px}
h2{font-size:19px;font-weight:700;margin:32px 0 12px;letter-spacing:-.01em}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-bottom:10px}
.card .bq{font-weight:800;font-size:16px;margin-bottom:4px}
.card .ba{font-size:14px;color:var(--sub);margin-bottom:8px}
.card .more{font-size:13px;text-decoration:none;color:var(--logo);font-weight:600}
.cta{display:block;text-align:center;background:var(--ink);color:#fff;text-decoration:none;border-radius:14px;padding:16px;font-weight:700;font-size:16px;margin:32px 0 10px;transition:opacity .15s}
.cta:hover{opacity:.85}
.cta-sub{text-align:center;font-size:13px;color:var(--sub)}
.rels{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rels a{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:8px 16px;font-size:14px;text-decoration:none;color:var(--ink);font-weight:600}
.book{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-top:28px;font-size:14px}
.book a{display:inline-block;margin-top:8px;border:1px solid var(--line);border-radius:99px;padding:7px 16px;font-size:13px;text-decoration:none;color:var(--ink);font-weight:600}
footer{margin-top:48px;padding-top:24px;border-top:1px solid var(--line);font-size:12px;color:#a1a1a6;text-align:center;line-height:2}
footer a{color:#a1a1a6}
.disc{font-size:11px;color:#b6b6bb;margin-top:8px}
.hidden{display:none}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="logo" href="${HUB}" aria-label="OnlyOne">
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none"><circle cx="10" cy="8" r="6.5" stroke="#43474d" stroke-width="3"/><rect x="8.5" y="14" width="3" height="10" rx="1.5" fill="#43474d"/></svg>
      OnlyOne
    </a>
    <button class="lang-btn" onclick="toggleLang()"><span data-ko>EN</span><span data-en class="hidden">한국어</span></button>
  </header>

  <article>
    <div class="crumb">🗣️ <span data-ko>사투리 맞추기 · ${isKo ? esc(it.r) : esc(it.r)}</span><span data-en class="hidden">Guess the Dialect · ${esc(regionEn)}</span></div>
    <h1><span data-ko>${esc(h1Ko)}</span><span data-en class="hidden">${esc(h1En)}</span></h1>

    <div class="answer">
      <div class="badge"><span data-ko>${isKo ? esc(it.r) : esc(it.r)}</span><span data-en class="hidden">${esc(regionEn)}</span></div>
      <div class="mean"><span data-ko>${meanKo}</span><span data-en class="hidden">${meanEn}</span></div>
      ${hintKo ? `<div class="hint"><span data-ko>💡 ${hintKo}</span></div>` : ""}${hintEn ? `<div class="hint"><span data-en class="hidden">💡 ${hintEn}</span></div>` : ""}
      ${srcHtml}
    </div>

    <h2><span data-ko>${isKo ? "같은 지역 표현 더 보기" : "같은 사투리 표현 더 보기"}</span><span data-en class="hidden">More from this dialect</span></h2>
    ${bonusHtml}

    <a class="cta" href="${SITE}/?utm_source=seo&utm_medium=static&utm_campaign=dialect">
      <span data-ko>🗣️ 사투리 맞추기 10문제 도전</span><span data-en class="hidden">🗣️ Take the 10-question dialect quiz</span>
    </a>
    <p class="cta-sub"><span data-ko>지역 맞추기 퀴즈 · 명대사 보너스 · 랭킹 등록</span><span data-en class="hidden">Guess the region · movie-quote bonus · leaderboard</span></p>

    <h2><span data-ko>이 표현들도 알아요?</span><span data-en class="hidden">Know these too?</span></h2>
    <div class="rels">${relHtml}</div>

    <div class="book">
      <span data-ko>📚 사투리와 지역 문화가 궁금하다면 관련 책도 추천해요.</span><span data-en class="hidden">📚 Curious about dialects? Books are a great deep-dive.</span><br>
      <a data-ko href="${COUPANG_URL}" target="_blank" rel="noopener sponsored">쿠팡에서 관련 책 보기</a>
      <a data-en class="hidden" href="${AMAZON_URL}" target="_blank" rel="noopener sponsored">Dialect books on Amazon</a>
    </div>
  </article>

  <footer>
    <a href="${HUB}">OnlyOne — For a Happy Day</a><br>
    Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>
    <div class="disc"><span data-ko>이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</span><span data-en class="hidden">As an Amazon Associate, OnlyOne earns from qualifying purchases.</span></div>
  </footer>
</div>

<div id="consent" style="display:none;position:fixed;bottom:16px;left:16px;right:16px;max-width:480px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 20px;box-shadow:0 8px 30px rgba(0,0,0,.08);font-size:13px;z-index:99">
  <p style="margin-bottom:12px;font-size:13px"><span data-ko>방문 통계를 위해 Google Analytics 쿠키를 사용해도 될까요? 거부해도 그대로 이용할 수 있어요.</span><span data-en class="hidden">May we use Google Analytics cookies for visit stats? You can decline and still use everything.</span></p>
  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button onclick="consent(false)" style="border:1px solid var(--line);background:#fff;border-radius:99px;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--ink)"><span data-ko>거부</span><span data-en class="hidden">Decline</span></button>
    <button onclick="consent(true)" style="border:none;background:var(--ink);color:#fff;border-radius:99px;padding:8px 18px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600"><span data-ko>동의</span><span data-en class="hidden">Accept</span></button>
  </div>
</div>

<script>
function applyLang(l){
  document.querySelectorAll('[data-ko]').forEach(e=>e.classList.toggle('hidden',l==='en'));
  document.querySelectorAll('[data-en]').forEach(e=>e.classList.toggle('hidden',l!=='en'));
  document.documentElement.lang=l==='en'?'en':'ko';
}
function toggleLang(){
  const l=(localStorage.getItem('oo_dialect_lang')==='en')?'ko':'en';
  localStorage.setItem('oo_dialect_lang',l);applyLang(l);
}
applyLang(localStorage.getItem('oo_dialect_lang')||((navigator.language||'ko').startsWith('ko')?'ko':'en'));

const EEA=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
function grant(){gtag('consent','update',{analytics_storage:'granted'})}
function consent(ok){
  localStorage.setItem('oo_consent',ok?'granted':'denied');
  if(ok)grant();
  document.getElementById('consent').style.display='none';
}
(function(){
  const saved=localStorage.getItem('oo_consent');
  if(saved==='granted'){grant();return}
  if(saved==='denied')return;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
  const isEU=/Europe\\//.test(tz)||EEA.includes((navigator.language.split('-')[1]||'').toUpperCase());
  if(isEU){document.getElementById('consent').style.display='block'}
  else{localStorage.setItem('oo_consent','granted');grant()}
})();
</script>
</body>
</html>`;
}

/* ── 빌드 ── */
const items = [];
for (const pool of ["ko", "en"]) {
  for (const w of POOL[pool].q) items.push({ ...w, pool, slug: slugify(w.q) });
}

const urls = [];
items.forEach((it, i) => {
  const sameRegion = items.filter(x => x.pool === it.pool && x.r === it.r && x.slug !== it.slug);
  const pick = (arr, n, off) => Array.from({ length: Math.min(n, arr.length) }, (_, k) => arr[(i + k + off) % arr.length]);
  const bonus = pick(sameRegion, 2, 0);
  const relPool = sameRegion.length >= 10 ? sameRegion : items.filter(x => x.slug !== it.slug);
  const related = pick(relPool, 8, 2);
  const dir = path.join(PUB, it.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), pageHtml(it, bonus, related));
  urls.push(`${SITE}/${encodeURIComponent(it.slug)}/`);
});

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(PUB, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[SITE + "/", ...urls].map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>`);
fs.writeFileSync(path.join(PUB, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`✅ ${items.length}개 페이지 + sitemap.xml + robots.txt → public/`);
