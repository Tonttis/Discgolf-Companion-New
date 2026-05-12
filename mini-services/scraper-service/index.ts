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

  // Extract banner/cover photo and logo
  const coverPhotoMatch = html.match(/class="top-course-cover-photo"\s+style="background-image:\s*url\('([^']+)'\)/);
  if (coverPhotoMatch) {
    detail.bannerImageUrl = coverPhotoMatch[1];
  }

  const overlayLogoMatch = html.match(/class="overlay-logo">\s*<img\s+src="([^"]+)"/);
  if (overlayLogoMatch) {
    detail.logoUrl = overlayLogoMatch[1];
  }

  // Extract hole-by-hole descriptions (Väyläkuvaukset)
  detail.holes = parseHolesFromHtml(html);

  return detail;
}

interface ScrapedHole {
  holeNumber: number;
  name: string;
  length: number | null;
  par: number | null;
  note: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
}

function parseHolesFromHtml(html: string): ScrapedHole[] {
  const holes: ScrapedHole[] = [];

  // Only parse the first layout tab to avoid duplicate hole numbers
  // The first layout is in <div class="layout_tab active tab-1">
  const firstLayoutMatch = html.match(/<div\s+class="layout_tab\s+active\s+tab-1">([\s\S]*?)(?:<div\s+class="layout_tab\s+tab-|<\/div>\s*<\/div>)/);
  const searchHtml = firstLayoutMatch ? firstLayoutMatch[1] : html;

  // Find all <span class="fairway"> blocks within the first layout only
  const fairwayRegex = /<span\s+class="fairway">([\s\S]*?)<\/span>/g;
  let fairwayMatch;

  while ((fairwayMatch = fairwayRegex.exec(searchHtml)) !== null) {
    const fairwayHtml = fairwayMatch[1];

    // Extract image URLs from fairway_image div
    let imageUrl: string | null = null;
    let thumbUrl: string | null = null;

    const imageDivMatch = fairwayHtml.match(/<div\s+class="fairway_image">([\s\S]*?)<\/div>/);
    if (imageDivMatch) {
      const imageHtml = imageDivMatch[1];
      // Full-size image from <a href="...">
      const fullImgMatch = imageHtml.match(/<a\s+href="([^"]+)"[^>]*>/);
      if (fullImgMatch) imageUrl = fullImgMatch[1];
      // Thumbnail from <img src="...">
      const thumbMatch = imageHtml.match(/<img\s+src="([^"]+)"/);
      if (thumbMatch) thumbUrl = thumbMatch[1];
    }

    // Extract hole description
    const descDivMatch = fairwayHtml.match(/<div\s+class="fairway_desc">([\s\S]*?)<\/div>/);
    if (!descDivMatch) continue;

    const descHtml = descDivMatch[1];

    // Extract hole name from <h4>
    const h4Match = descHtml.match(/<h4>([\s\S]*?)<\/h4>/);
    if (!h4Match) continue;
    const name = stripHtml(h4Match[1]).trim();

    // Extract hole number from name like "Väylä 1: ..." or "Väylä 10: ..."
    const numMatch = name.match(/Väylä\s+(\d+)/i);
    const holeNumber = numMatch ? parseInt(numMatch[1], 10) : 0;
    if (!holeNumber) continue;

    // Extract length and par from <p>Pituus 87 metriä. Par 3</p>
    let length: number | null = null;
    let par: number | null = null;
    let note: string | null = null;

    const pTags = descHtml.match(/<p>([\s\S]*?)<\/p>/g) ?? [];
    for (const pTag of pTags) {
      const pText = stripHtml(pTag).trim();
      if (!pText) continue;

      // Try to parse "Pituus 87 metriä. Par 3"
      const lengthMatch = pText.match(/Pituus\s+(\d+)\s+metri/i);
      if (lengthMatch) length = parseInt(lengthMatch[1], 10);

      const parMatch = pText.match(/Par\s+(\d+)/i);
      if (parMatch) par = parseInt(parMatch[1], 10);

      // Anything after the Pituus/Par line that's not empty is a note
      // e.g. "HUOM! 3-väylä ei ole toistaiseksi pelattavissa."
      if (!pText.includes('Pituus') && !pText.includes('Par')) {
        note = pText;
      }
    }

    holes.push({
      holeNumber,
      name,
      length,
      par,
      note,
      imageUrl,
      thumbUrl,
    });
  }

  return holes;
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
