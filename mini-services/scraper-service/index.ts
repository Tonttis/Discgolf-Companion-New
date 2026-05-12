/**
 * Scraper Service - Runs on port 3030
 * Isolated service for scraping frisbeegolfradat.fi using z-ai-web-dev-sdk.
 * This avoids crashes in the Next.js process when the SDK fetches large pages.
 */

const PORT = 3030;
const BASE_URL = 'https://frisbeegolfradat.fi';

let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPTagContent(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
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
    if (label && value) {
      result.set(label, value);
    }
  }

  return result;
}

async function scrapeCourseList(): Promise<any[]> {
  const zai = await getZAI();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/radat/`,
  });

  const html: string = result.data.html;
  const tableMatch = html.match(/<table[^>]*id="radatlistaus"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Could not find courses table');

  const tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const courses: any[] = [];

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;

    const classImgMatch = cells[1].match(/alt="(a{1,3}\d|b{1,3}\d|c{1,3}\d)"/i);
    const classification = classImgMatch ? classImgMatch[1].toLowerCase() : '';

    const linkMatch = cells[2].match(/href="\/rata\/([^"]+)"/);
    const nameMatch = cells[2].match(/href="\/rata\/[^"]+">([^<]+)<\/a>/);
    const ratingMatch = cells[2].match(/class="rating-average">([0-9.]+)<\/div>/);
    const mapMatch = cells[2].match(/href="(https:\/\/frisbeegolfradat\.fi\/files\/[^"]+ratakartta[^"]+)"/);
    const isTop = cells[2].includes('course_plus');
    const isNew = cells[2].includes('UUSI');
    const city = stripHtml(cells[3]);
    const holes = parseInt(stripHtml(cells[4]), 10) || 0;

    if (linkMatch && nameMatch) {
      courses.push({
        slug: linkMatch[1],
        name: nameMatch[1],
        city,
        holes,
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
        classification,
        isTop,
        isNew,
        mapUrl: mapMatch ? mapMatch[1] : null,
      });
    }
  }

  return courses;
}

async function scrapeCourseDetail(slug: string): Promise<Record<string, any>> {
  const zai = await getZAI();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/rata/${slug}`,
  });

  const html: string = result.data.html;
  const detail: Record<string, any> = {};

  // Extract coordinates
  const mapsMatch = html.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/);
  if (mapsMatch) {
    detail.latitude = parseFloat(mapsMatch[1]);
    detail.longitude = parseFloat(mapsMatch[2]);
  }

  // Extract short description
  const captionMatch = html.match(/<span\s+class="caption">\s*<p>\s*([\s\S]*?)\s*<br>/);
  if (captionMatch) {
    detail.description = extractPTagContent(captionMatch[1]);
  }

  // Extract full description
  const descMatch = html.match(/<span\s+class="description">([\s\S]*?)<\/span>/);
  if (descMatch) {
    const fullDesc = extractPTagContent(descMatch[1]);
    if (fullDesc && fullDesc !== detail.description) {
      detail.descriptionFull = fullDesc;
    }
  }

  // Parse course info fields
  const infoMap = parseCourseInfoHtml(html);
  const labelToField: Record<string, string> = {
    'Osoite': 'address',
    'Perustettu': 'founded',
    'Korit': 'basketType',
    'Heittopaikat': 'teeType',
    'Pinnanmuodot': 'terrain',
    'Opasteet': 'signage',
    'Ratatyyppi': 'courseType',
    'Ylläpito': 'maintenance',
    'Ratamestari': 'courseMaster',
    'Suunnittelija': 'designer',
    'Ilmainen/maksullinen': 'isFree',
    'Lisätietoja': 'moreInfo',
    'Talvipelattavuus': 'winterPlay',
  };

  for (const [label, field] of Object.entries(labelToField)) {
    const value = infoMap.get(label);
    if (value) {
      detail[field] = value;
    }
  }

  // Parse address
  if (detail.address) {
    const addrLines = detail.address.split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (addrLines.length >= 2) {
      detail.address = addrLines[0];
      const zipCityMatch = addrLines[1].match(/^(\d{5})\s+(.+)$/);
      if (zipCityMatch) {
        detail.zipCode = zipCityMatch[1];
      }
    }
  }

  // Rating count
  const ratingImgMatch = html.match(/alt="(\d+)\s+votes?,\s+average:\s+([0-9,]+)\s+out\s+of\s+5"/i);
  if (ratingImgMatch) {
    detail.ratingCount = parseInt(ratingImgMatch[1], 10);
  }

  // Scorecard URL
  const scorecardMatch = html.match(/href="\/rata\/[^"]+\/tuloskortti\/[^"]+"/);
  if (scorecardMatch) {
    const href = scorecardMatch[0].replace(/href="/, '').replace(/"$/, '');
    detail.scorecardUrl = `${BASE_URL}${href}`;
  }

  return detail;
}

// Simple HTTP server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', port: PORT });
    }

    // Scrape course list
    if (url.pathname === '/scrape/list') {
      try {
        const courses = await scrapeCourseList();
        return Response.json({ success: true, courses, total: courses.length });
      } catch (error: any) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    // Scrape course detail
    if (url.pathname === '/scrape/detail' && req.method === 'POST') {
      try {
        const body = await req.json() as { slug: string };
        if (!body.slug) {
          return Response.json({ success: false, error: 'slug is required' }, { status: 400 });
        }
        const detail = await scrapeCourseDetail(body.slug);
        return Response.json({ success: true, detail });
      } catch (error: any) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`🥏 Scraper service running on port ${PORT}`);
