/* OnlyOne · 사투리 퀴즈 — Worker (정적 자산 + 글로벌 리더보드)
   배포:
   1) wrangler kv namespace create LEADERBOARD  → 출력된 id를 wrangler.toml에 붙여넣기
   2) index.html 을 ./public/index.html 로 둔다
   3) wrangler deploy
*/

const MAX = 100;   // KV에 저장할 최대 기록 수
const TOP = 20;    // 응답으로 내려줄 상위 수
const LANGS = ["ko", "en"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/lb") {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
      return handleLB(req, env, url);
    }

    // 그 외 경로는 정적 자산으로 처리
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return new Response("Not found", { status: 404 });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

function lbKey(lang) { return "lb:" + (LANGS.includes(lang) ? lang : "ko"); }
function sanitize(s) { return String(s || "").replace(/[<>&"'`]/g, "").trim().slice(0, 12) || "Anon"; }

async function load(env, lang) {
  try { const v = await env.LEADERBOARD.get(lbKey(lang)); return v ? JSON.parse(v) : []; }
  catch (e) { return []; }
}
function strip(e) { return { name: e.name, score: e.score, streak: e.streak, cid: e.cid }; }

async function handleLB(req, env, url) {
  if (!env.LEADERBOARD) return json({ error: "kv-missing" }, 500);

  if (req.method === "GET") {
    const lang = url.searchParams.get("lang") || "ko";
    const list = await load(env, lang);
    return json({ top: list.slice(0, TOP).map(strip) });
  }

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch (e) { return json({ error: "bad-json" }, 400); }

    const lang = LANGS.includes(b.lang) ? b.lang : "ko";
    const score = Math.max(0, Math.min(10, parseInt(b.score, 10) || 0));
    const streak = Math.max(0, Math.min(10, parseInt(b.streak, 10) || 0));
    const name = sanitize(b.name);
    const cid = (sanitize(b.cid).slice(0, 24)) || ("a" + Math.random().toString(36).slice(2));

    let list = await load(env, lang);
    const prev = list.find(e => e.cid === cid);
    const entry = { cid, name, score, streak, ts: Date.now() };

    if (prev) {
      // 같은 사용자는 더 좋은 기록만 갱신 (스팸 방지), 이름은 항상 최신으로
      if (score > prev.score || (score === prev.score && streak > prev.streak)) {
        list = list.filter(e => e.cid !== cid);
        list.push(entry);
      } else {
        prev.name = name;
      }
    } else {
      list.push(entry);
    }

    list.sort((a, b) => b.score - a.score || b.streak - a.streak || a.ts - b.ts);
    list = list.slice(0, MAX);
    await env.LEADERBOARD.put(lbKey(lang), JSON.stringify(list));

    const rank = list.findIndex(e => e.cid === cid) + 1;
    return json({ top: list.slice(0, TOP).map(strip), rank: rank || null });
  }

  return json({ error: "method" }, 405);
}
