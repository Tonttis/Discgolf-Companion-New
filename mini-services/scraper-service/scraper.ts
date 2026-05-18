/**
 * Scraper Service - Runs on port 3030
 * Scrapes frisbeegolfradat.fi using direct HTTP fetch.
 * Works locally with just Bun's built-in fetch — no external deps needed.
 * Uses Node http module (works in Bun) to avoid Bun.serve crash on large responses.
 */

import http from 'http';

const PORT = 3030;
const BASE_URL = 'https://frisbeegolfradat.fi';

async function fetchPageHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DiscGolfCompanion/1.0 (https://github.com/discgolf-companion)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fi,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  const html = await response.text();
  if (!html || html.length < 100) throw new Error('Empty or too small response');
  return html;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
}

function extractPTagContent(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

function parseCourseInfoHtml(html: string): Map<string, string> {
  const result = new Map<string, string>();
  const sectionMatch = html.match(/<ul\s+class="course_info">([\s\S]*?)<\/ul>/);
  if (!sectionMatch) return result;
  const section = sectionMatch[1];
  const liRegex = /<li[^>]*>\s*<b>\s*([\s\S]*?)\s*<\/b>\s*<br\s*\/?>\s*<p>\s*([\s\S]*?)\s*<\/p>\s*<\/li>/g;
  let match;
  while ((match = liRegex.exec(section)) !== null) {
    const label = stripHtml(match[1]).trim();
    const value = extractPTagContent(match[2]).trim();
    if (label && value) result.set(label, value);
  }
  return result;
}

async function scrapeCourseList(): Promise<any[]> {
  const html = await fetchPageHtml(`${BASE_URL}/radat/`);
  const tableMatch = html.match(/<table[^>]*id="radatlistaus"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Could not find courses table');
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const courses: any[] = [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const classImgMatch = cells[1].match(/alt="(a{1,3}\d|b{1,3}\d|c{1,3}\d)"/i);
    const linkMatch = cells[2].match(/href="\/rata\/([^"]+)"/);
    const nameMatch = cells[2].match(/href="\/rata\/[^"]+">([^<]+)<\/a>/);
    const ratingMatch = cells[2].match(/class="rating-average">([0-9.]+)<\/div>/);
    const mapMatch = cells[2].match(/href="(https:\/\/frisbeegolfradat\.fi\/files\/[^"]+ratakartta[^"]+)"/);
    if (linkMatch && nameMatch) {
      courses.push({
        slug: linkMatch[1], name: nameMatch[1], city: stripHtml(cells[3]),
        holes: parseInt(stripHtml(cells[4]), 10) || 0,
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
        classification: classImgMatch ? classImgMatch[1].toLowerCase() : '',
        isTop: cells[2].includes('course_plus'), isNew: cells[2].includes('UUSI'),
        mapUrl: mapMatch ? mapMatch[1] : null,
      });
    }
  }
  return courses;
}

async function scrapeCourseDetail(slug: string): Promise<Record<string, any>> {
  const html = await fetchPageHtml(`${BASE_URL}/rata/${slug}`);
  const detail: Record<string, any> = {};
  const mapsMatch = html.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/);
  if (mapsMatch) { detail.latitude = parseFloat(mapsMatch[1]); detail.longitude = parseFloat(mapsMatch[2]); }
  const captionMatch = html.match(/<span\s+class="caption">\s*<p>\s*([\s\S]*?)\s*<br>/);
  if (captionMatch) detail.description = extractPTagContent(captionMatch[1]);
  const descMatch = html.match(/<span\s+class="description">([\s\S]*?)<\/span>/);
  if (descMatch) { const f = extractPTagContent(descMatch[1]); if (f && f !== detail.description) detail.descriptionFull = f; }
  const infoMap = parseCourseInfoHtml(html);
  for (const [l, f] of Object.entries({ 'Osoite':'address','Perustettu':'founded','Korit':'basketType','Heittopaikat':'teeType','Pinnanmuodot':'terrain','Opasteet':'signage','Ratatyyppi':'courseType','Ylläpito':'maintenance','Ratamestari':'courseMaster','Suunnittelija':'designer','Ilmainen/maksullinen':'isFree','Lisätietoja':'moreInfo','Talvipelattavuus':'winterPlay' })) {
    const v = infoMap.get(l); if (v) detail[f] = v;
  }
  if (detail.address) { const a = detail.address.split('\n').map((s:string)=>s.trim()).filter(Boolean); if (a.length>=2) { detail.address=a[0]; const z=a[1].match(/^(\d{5})\s+(.+)$/); if(z) detail.zipCode=z[1]; } }
  const rc = html.match(/alt="(\d+)\s+votes?,\s+average:\s+([0-9,]+)\s+out\s+of\s+5"/i);
  if (rc) detail.ratingCount = parseInt(rc[1], 10);
  const sc = html.match(/href="\/rata\/[^"]+\/tuloskortti\/[^"]+"/);
  if (sc) detail.scorecardUrl = `${BASE_URL}${sc[0].replace(/href="/,'').replace(/"$/,'')}`;
  const cp = html.match(/class="top-course-cover-photo"\s+style="background-image:\s*url\('([^']+)'\)/);
  if (cp) detail.bannerImageUrl = cp[1];
  const ol = html.match(/class="overlay-logo">\s*<img\s+src="([^"]+)"/);
  if (ol) detail.logoUrl = ol[1];
  // Parse holes
  const holes: any[] = [];
  const fm = html.match(/<div\s+class="layout_tab\s+active\s+tab-1">([\s\S]*?)(?:<div\s+class="layout_tab\s+tab-|<\/div>\s*<\/div>)/);
  const sh = fm ? fm[1] : html;
  const fr = /<span\s+class="fairway">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = fr.exec(sh)) !== null) {
    const fh = m[1];
    let imageUrl: string|null = null, thumbUrl: string|null = null;
    const id = fh.match(/<div\s+class="fairway_image">([\s\S]*?)<\/div>/);
    if (id) { const fi = id[1].match(/<a\s+href="([^"]+)"[^>]*>/); if(fi) imageUrl=fi[1]; const ti = id[1].match(/<img\s+src="([^"]+)"/); if(ti) thumbUrl=ti[1]; }
    const dd = fh.match(/<div\s+class="fairway_desc">([\s\S]*?)<\/div>/);
    if (!dd) continue;
    const h4 = dd[1].match(/<h4>([\s\S]*?)<\/h4>/);
    if (!h4) continue;
    const name = stripHtml(h4[1]).trim();
    const nm = name.match(/Väylä\s+(\d+)/i);
    const holeNumber = nm ? parseInt(nm[1],10) : 0;
    if (!holeNumber) continue;
    let length: number|null = null, par: number|null = null, note: string|null = null;
    const pts = dd[1].match(/<p>([\s\S]*?)<\/p>/g) ?? [];
    for (const pt of pts) { const t = stripHtml(pt).trim(); if(!t) continue; const lm=t.match(/Pituus\s+(\d+)\s+metri/i); if(lm) length=parseInt(lm[1],10); const pm=t.match(/Par\s+(\d+)/i); if(pm) par=parseInt(pm[1],10); if(!t.includes('Pituus')&&!t.includes('Par')) note=t; }
    holes.push({ holeNumber, name, length, par, note, imageUrl, thumbUrl });
  }
  detail.holes = holes;
  return detail;
}

// Helper: read JSON body from request
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// Helper: send JSON response
function sendJson(res: http.ServerResponse, data: any, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

// Start HTTP server using Node http module (stable, no Bun.serve crash)
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/health') {
      sendJson(res, { status: 'ok', port: PORT, mode: 'direct' });
    } else if (url.pathname === '/scrape/list') {
      const courses = await scrapeCourseList();
      sendJson(res, { success: true, courses, total: courses.length });
    } else if (url.pathname === '/scrape/detail' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (!body.slug) { sendJson(res, { success: false, error: 'slug required' }, 400); return; }
      const detail = await scrapeCourseDetail(body.slug);
      sendJson(res, { success: true, detail });
    } else {
      sendJson(res, { error: 'Not found' }, 404);
    }
  } catch (error: any) {
    console.error('Request error:', error.message);
    sendJson(res, { success: false, error: error.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`🥏 Scraper service running on port ${PORT} (direct fetch — works locally)`);
});
