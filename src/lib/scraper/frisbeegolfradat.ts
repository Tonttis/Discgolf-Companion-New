/**
 * Frisbeegolfradat.fi scraper — works locally with direct fetch.
 * Falls back to z-ai-web-dev-sdk page_reader if available (cloud sandbox).
 */

const BASE_URL = 'https://frisbeegolfradat.fi';

// Try to use Z.ai SDK as fallback (works in cloud sandbox with gateway)
let zaiAvailable = false;
let zaiInstance: any = null;

async function tryInitZAI(): Promise<boolean> {
  if (zaiAvailable) return true;
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    zaiInstance = await ZAI.create();
    zaiAvailable = true;
    return true;
  } catch {
    return false;
  }
}

// Initialize SDK in background
tryInitZAI();

/**
 * Fetch a web page and return its HTML.
 * Tries direct fetch first, falls back to Z.ai page_reader if that fails.
 */
async function fetchPageHtml(url: string): Promise<string> {
  // Try direct fetch first (works locally and in most environments)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DiscGolfCompanion/1.0 (https://github.com/discgolf-companion)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fi,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      const html = await response.text();
      if (html && html.length > 100) {
        return html;
      }
    }
    throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
  } catch (directError: any) {
    // Fallback to Z.ai SDK page_reader (works in cloud sandbox)
    if (zaiAvailable && zaiInstance) {
      try {
        const result = await zaiInstance.functions.invoke('page_reader', { url });
        if (result?.data?.html) {
          return result.data.html;
        }
      } catch {
        // SDK also failed
      }
    }

    // Re-try Z.ai init in case it wasn't ready before
    const sdkReady = await tryInitZAI();
    if (sdkReady && zaiInstance) {
      try {
        const result = await zaiInstance.functions.invoke('page_reader', { url });
        if (result?.data?.html) {
          return result.data.html;
        }
      } catch {
        // Really failed
      }
    }

    throw new Error(`Failed to fetch ${url}: ${directError.message}`);
  }
}

// ==========================================
// Types
// ==========================================

interface ScrapedCourse {
  slug: string;
  name: string;
  city: string;
  holes: number;
  rating: number | null;
  classification: string;
  isTop: boolean;
  isNew: boolean;
  mapUrl: string | null;
}

interface CourseDetail {
  address?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  founded?: string;
  basketType?: string;
  teeType?: string;
  terrain?: string;
  signage?: string;
  courseType?: string;
  maintenance?: string;
  courseMaster?: string;
  designer?: string;
  isFree?: string;
  moreInfo?: string;
  winterPlay?: string;
  description?: string;
  descriptionFull?: string;
  scorecardUrl?: string;
  ratingCount?: number;
  bannerImageUrl?: string;
  logoUrl?: string;
}

// ==========================================
// Utility Functions
// ==========================================

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

// ==========================================
// Course List Scraper
// ==========================================

export async function scrapeCourseList(): Promise<ScrapedCourse[]> {
  const html = await fetchPageHtml(`${BASE_URL}/radat/`);

  const tableMatch = html.match(/<table[^>]*id="radatlistaus"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Could not find courses table on frisbeegolfradat.fi/radat/');

  const tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const courses: ScrapedCourse[] = [];

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

// ==========================================
// Course Detail Scraper
// ==========================================

export async function scrapeCourseDetail(slug: string): Promise<CourseDetail> {
  const html = await fetchPageHtml(`${BASE_URL}/rata/${slug}`);
  const detail: CourseDetail = {};

  // --- 1. Extract coordinates from Google Maps link ---
  const mapsMatch = html.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/);
  if (mapsMatch) {
    detail.latitude = parseFloat(mapsMatch[1]);
    detail.longitude = parseFloat(mapsMatch[2]);
  }

  // --- 2. Extract description ---
  const captionMatch = html.match(/<span\s+class="caption">\s*<p>\s*([\s\S]*?)\s*<br>/);
  if (captionMatch) {
    detail.description = extractPTagContent(captionMatch[1]);
  }

  const descMatch = html.match(/<span\s+class="description">([\s\S]*?)<\/span>/);
  if (descMatch) {
    const fullDesc = extractPTagContent(descMatch[1]);
    if (fullDesc && fullDesc !== detail.description) {
      detail.descriptionFull = fullDesc;
    }
  }

  // --- 3. Parse all course info fields from the structured HTML ---
  const infoMap = parseCourseInfoHtml(html);

  const labelToField: Record<string, keyof CourseDetail> = {
    'Osoite': 'address',
    'Perustettu': 'founded',
    'Korit': 'basketType',
    'Väylien määrä': 'holes',
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
    if (value && field !== 'holes') {
      (detail as Record<string, string | number | undefined>)[field] = value;
    }
  }

  // --- 4. Parse address more precisely ---
  if (detail.address) {
    const addrLines = detail.address.split('\n').map(l => l.trim()).filter(Boolean);
    if (addrLines.length >= 2) {
      detail.address = addrLines[0];
      const zipCityMatch = addrLines[1].match(/^(\d{5})\s+(.+)$/);
      if (zipCityMatch) {
        detail.zipCode = zipCityMatch[1];
      }
    }
  }

  // --- 5. Extract rating count ---
  const ratingImgMatch = html.match(/alt="(\d+)\s+votes?,\s+average:\s+([0-9,]+)\s+out\s+of\s+5"/i);
  if (ratingImgMatch) {
    detail.ratingCount = parseInt(ratingImgMatch[1], 10);
  }

  // --- 6. Extract scorecard URL ---
  const scorecardMatch = html.match(/href="\/rata\/[^"]+\/tuloskortti\/[^"]+"/);
  if (scorecardMatch) {
    const href = scorecardMatch[0].replace(/href="/, '').replace(/"$/, '');
    detail.scorecardUrl = `${BASE_URL}${href}`;
  }

  // --- 7. Extract banner/cover photo and logo ---
  const coverPhotoMatch = html.match(/class="top-course-cover-photo"\s+style="background-image:\s*url\('([^']+)'\)/);
  if (coverPhotoMatch) {
    (detail as Record<string, string | number | undefined>).bannerImageUrl = coverPhotoMatch[1];
  }

  const overlayLogoMatch = html.match(/class="overlay-logo">\s*<img\s+src="([^"]+)"/);
  if (overlayLogoMatch) {
    (detail as Record<string, string | number | undefined>).logoUrl = overlayLogoMatch[1];
  }

  return detail;
}

// ==========================================
// Sync Functions (used by /api/sync)
// ==========================================

export async function syncCourseList(): Promise<{ added: number; updated: number; total: number }> {
  const { db } = await import('@/lib/db');
  const courses = await scrapeCourseList();
  let added = 0;
  let updated = 0;

  for (const course of courses) {
    const existing = await db.course.findUnique({ where: { slug: course.slug } });

    if (existing) {
      await db.course.update({
        where: { slug: course.slug },
        data: {
          name: course.name,
          city: course.city,
          holes: course.holes,
          rating: course.rating,
          classification: course.classification,
          isTop: course.isTop,
          isNew: course.isNew,
          mapUrl: course.mapUrl,
        },
      });
      updated++;
    } else {
      await db.course.create({
        data: {
          slug: course.slug,
          name: course.name,
          city: course.city,
          holes: course.holes,
          rating: course.rating,
          classification: course.classification,
          isTop: course.isTop,
          isNew: course.isNew,
          mapUrl: course.mapUrl,
        },
      });
      added++;
    }
  }

  return { added, updated, total: courses.length };
}

export async function fetchAndCacheCourseDetail(slug: string) {
  const { db } = await import('@/lib/db');
  const detail = await scrapeCourseDetail(slug);

  await db.course.update({
    where: { slug },
    data: {
      ...detail,
      detailFetchedAt: new Date(),
    },
  });

  return db.course.findUnique({ where: { slug } });
}
