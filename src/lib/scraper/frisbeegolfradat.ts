/**
 * In-process scraper for frisbeegolfradat.fi
 * Uses direct HTTP fetch() — no dependency on z-ai-web-dev-sdk.
 * Works on any machine with internet access.
 */

import { db } from '@/lib/db';

const BASE_URL = 'https://frisbeegolfradat.fi';

/**
 * Fetch a page from frisbeegolfradat.fi and return its HTML.
 */
async function fetchPageHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DiscGolfApp/1.0 (Course Data Sync)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fi,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// ==========================================
// List Scraping Types
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

/**
 * Extract the text content from a <p>...</p> tag,
 * preserving <br> as newlines for multiline fields.
 */
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

/**
 * Parse all key-value pairs from the <ul class="course_info"> section.
 * Returns a map of Finnish label → value string.
 */
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

  // Find the courses table
  const tableMatch = html.match(/<table[^>]*id="radatlistaus"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Could not find courses table on frisbeegolfradat.fi/radat/');

  const tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const courses: ScrapedCourse[] = [];

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;

    // Cell 0: row number (skip)
    // Cell 1: classification image (<img ... alt="a1" ...>)
    // Cell 2: course name with link, rating, map link, top/new badges
    // Cell 3: city
    // Cell 4: holes count

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

  // --- 3. Parse all course info fields ---
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

  // --- 4. Parse address ---
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
// Sync Functions
// ==========================================

export async function syncCourseList(): Promise<{ added: number; updated: number; total: number }> {
  const courses = await scrapeCourseList();

  // Get all existing slugs in one query
  const existingCourses = await db.course.findMany({
    select: { slug: true },
  });
  const existingSlugSet = new Set(existingCourses.map(c => c.slug));

  const toCreate = courses.filter(c => !existingSlugSet.has(c.slug));
  const toUpdate = courses.filter(c => existingSlugSet.has(c.slug));

  // Batch insert new courses (chunks of 100 for SQLite variable limit)
  let added = 0;
  for (let i = 0; i < toCreate.length; i += 100) {
    const chunk = toCreate.slice(i, i + 100);
    const result = await db.course.createMany({
      data: chunk.map(c => ({
        slug: c.slug,
        name: c.name,
        city: c.city ?? '',
        holes: c.holes ?? 0,
        rating: c.rating,
        classification: c.classification ?? '',
        isTop: c.isTop ?? false,
        isNew: c.isNew ?? false,
        mapUrl: c.mapUrl,
      })),
      skipDuplicates: true,
    });
    added += result.count;
  }

  // Update existing courses in parallel chunks
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += 50) {
    const chunk = toUpdate.slice(i, i + 50);
    const results = await Promise.allSettled(
      chunk.map(c =>
        db.course.update({
          where: { slug: c.slug },
          data: {
            name: c.name,
            city: c.city,
            holes: c.holes,
            rating: c.rating,
            classification: c.classification,
            isTop: c.isTop,
            isNew: c.isNew,
            mapUrl: c.mapUrl,
          },
        })
      )
    );
    updated += results.filter(r => r.status === 'fulfilled').length;
  }

  return { added, updated, total: courses.length };
}

export async function fetchAndCacheCourseDetail(slug: string) {
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
