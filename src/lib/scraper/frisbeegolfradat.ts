import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

const BASE_URL = 'https://frisbeegolfradat.fi';

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

  // Extract the course_info <ul> section
  const sectionMatch = html.match(/<ul\s+class="course_info">([\s\S]*?)<\/ul>/);
  if (!sectionMatch) return result;

  const section = sectionMatch[1];

  // Pattern 1: <li class="course_info_left"> or <li class="course_info_right">
  //   <b>Label</b><br><p>Value</p>
  // Pattern 2: <li> or <li class="course_info">
  //   <b>Label</b><br><p>Value</p>

  // Match all <li> elements within the section
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
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/radat/`,
  });

  const html: string = result.data.html;

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

    // Extract classification from image alt text
    const classImgMatch = cells[1].match(/alt="(a{1,3}\d|b{1,3}\d|c{1,3}\d)"/i);
    const classification = classImgMatch ? classImgMatch[1].toLowerCase() : '';

    // Extract slug and name from the link
    const linkMatch = cells[2].match(/href="\/rata\/([^"]+)"/);
    const nameMatch = cells[2].match(/href="\/rata\/[^"]+">([^<]+)<\/a>/);

    // Extract numeric rating
    const ratingMatch = cells[2].match(/class="rating-average">([0-9.]+)<\/div>/);

    // Extract map URL
    const mapMatch = cells[2].match(/href="(https:\/\/frisbeegolfradat\.fi\/files\/[^"]+ratakartta[^"]+)"/);

    // Check for top course badge
    const isTop = cells[2].includes('course_plus');

    // Check for new badge
    const isNew = cells[2].includes('UUSI');

    // Extract city
    const city = stripHtml(cells[3]);

    // Extract holes count
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
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/rata/${slug}`,
  });

  const html: string = result.data.html;
  const detail: CourseDetail = {};

  // --- 1. Extract coordinates from Google Maps link ---
  const mapsMatch = html.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/);
  if (mapsMatch) {
    detail.latitude = parseFloat(mapsMatch[1]);
    detail.longitude = parseFloat(mapsMatch[2]);
  }

  // --- 2. Extract description ---
  // Short description is in <span class="caption"><p>TEXT<br><br><a>Lue lisää</a></p></span>
  const captionMatch = html.match(/<span\s+class="caption">\s*<p>\s*([\s\S]*?)\s*<br>/);
  if (captionMatch) {
    detail.description = extractPTagContent(captionMatch[1]);
  }

  // Full description is in <span class="description">...</span>
  const descMatch = html.match(/<span\s+class="description">([\s\S]*?)<\/span>/);
  if (descMatch) {
    const fullDesc = extractPTagContent(descMatch[1]);
    // Only store full description if it differs from the short one
    if (fullDesc && fullDesc !== detail.description) {
      detail.descriptionFull = fullDesc;
    }
  }

  // --- 3. Parse all course info fields from the structured HTML ---
  const infoMap = parseCourseInfoHtml(html);

  // Map Finnish labels to our fields
  const labelToField: Record<string, keyof CourseDetail> = {
    'Osoite': 'address',
    'Perustettu': 'founded',
    'Korit': 'basketType',
    'Väylien määrä': 'holes', // redundant but available
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
    if (value && field !== 'holes') { // skip holes, already from list
      (detail as Record<string, string | number | undefined>)[field] = value;
    }
  }

  // --- 4. Parse address more precisely ---
  // The address field from HTML is like "Joensuuntie 136\n83750 Polvijärvi"
  // Split into street, zip, city
  if (detail.address) {
    const addrLines = detail.address.split('\n').map(l => l.trim()).filter(Boolean);
    if (addrLines.length >= 2) {
      // First line is street address
      detail.address = addrLines[0];
      // Second line may be "zipCode city"
      const zipCityMatch = addrLines[1].match(/^(\d{5})\s+(.+)$/);
      if (zipCityMatch) {
        detail.zipCode = zipCityMatch[1];
        // City from address line (don't overwrite - already from list)
      }
    }
  }

  // --- 5. Extract rating count from the star images ---
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

  // --- 7. Extract map URL from detail page sidebar (more reliable than list) ---
  if (!detail.mapUrl) {
    const sidebarMapMatch = html.match(/class="sidebar_map">\s*<a\s+href="(https:\/\/frisbeegolfradat\.fi\/files\/[^"]+)"/);
    if (sidebarMapMatch) {
      // Store in mapUrl if not already set - but this is a detail-only field
      // We'll just note it for now
    }
  }

  // --- 8. Extract banner/cover photo and logo ---
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
