import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

const BASE_URL = 'https://frisbeegolfradat.fi';

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
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function scrapeCourseList(): Promise<ScrapedCourse[]> {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/radat/`,
  });

  const html: string = result.data.html;
  const tableMatch = html.match(/<table[^>]*id="radatlistaus"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('Could not find courses table');

  const tableHtml = tableMatch[1];
  const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const courses: ScrapedCourse[] = [];

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;

    const linkMatch = cells[2].match(/href="\/rata\/([^"]+)"/);
    const nameMatch = cells[2].match(/href="\/rata\/[^"]+">([^<]+)<\/a>/);
    const ratingMatch = cells[2].match(/class="rating-average">([0-9.]+)<\/div>/);
    const ratingImgMatch = cells[1].match(/ratings\/([a-z]+\d+)\.png/);
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
        classification: ratingImgMatch ? ratingImgMatch[1] : '',
        isTop,
        isNew,
        mapUrl: mapMatch ? mapMatch[1] : null,
      });
    }
  }

  return courses;
}

export async function scrapeCourseDetail(slug: string): Promise<CourseDetail> {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', {
    url: `${BASE_URL}/rata/${slug}`,
  });

  const html: string = result.data.html;
  const detail: CourseDetail = {};

  // Extract coordinates from Google Maps link
  const mapsMatch = html.match(/maps\.google\.com\/\?q=([0-9.-]+),([0-9.-]+)/);
  if (mapsMatch) {
    detail.latitude = parseFloat(mapsMatch[1]);
    detail.longitude = parseFloat(mapsMatch[2]);
  }

  // Strip all HTML and work with clean text
  const text = stripHtml(html);

  // Extract course_info section more precisely by finding the pattern:
  // Each field follows: "Label  Value" where Value ends at the next known label
  const fieldDefs: Array<{ label: string; field: keyof CourseDetail; endLabels: string[] }> = [
    { label: 'Perustettu', field: 'founded', endLabels: ['Korit'] },
    { label: 'Korit', field: 'basketType', endLabels: ['Heittopaikat', 'Väylien määrä'] },
    { label: 'Heittopaikat', field: 'teeType', endLabels: ['Pinnanmuodot'] },
    { label: 'Pinnanmuodot', field: 'terrain', endLabels: ['Opasteet'] },
    { label: 'Opasteet', field: 'signage', endLabels: ['Ratatyyppi'] },
    { label: 'Ratatyyppi', field: 'courseType', endLabels: ['Ylläpito'] },
    { label: 'Ylläpito', field: 'maintenance', endLabels: ['Ratamestari'] },
    { label: 'Ratamestari', field: 'courseMaster', endLabels: ['Suunnittelija'] },
    { label: 'Suunnittelija', field: 'designer', endLabels: ['Ilmainen', 'Lisätietoja'] },
    { label: 'Ilmainen/maksullinen', field: 'isFree', endLabels: ['Lisätietoja', 'Talvipelattavuus'] },
    { label: 'Lisätietoja', field: 'moreInfo', endLabels: ['Talvipelattavuus'] },
    { label: 'Talvipelattavuus', field: 'winterPlay', endLabels: ['Radan tiedot', 'Ratakartta', 'Tuloskortti'] },
  ];

  for (const { label, field, endLabels } of fieldDefs) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const endPattern = endLabels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Match: label, then content until any endLabel
    const pattern = new RegExp(
      `${escapedLabel}\\s+(.+?)(?:\\s+(?:${endPattern})\\s+|$)`,
      'i'
    );
    const match = text.match(pattern);
    if (match && match[1].trim()) {
      (detail as Record<string, string | number | undefined>)[field] = match[1].trim();
    }
  }

  // Extract address from the Osoite section
  const addressPattern = /Osoite\s+([\s\S]*?)(?=Rata kartalla|Perustettu)/i;
  const addressMatch = text.match(addressPattern);
  if (addressMatch) {
    const addrText = addressMatch[1].trim();
    // Parse address: "Kippasuonväylä 30 18100 Heinola"
    const addrParts = addrText.split(/\s+/);
    // Find the zip code (5 digits)
    const zipIdx = addrParts.findIndex(p => /^\d{5}$/.test(p));
    if (zipIdx >= 0) {
      detail.address = addrParts.slice(0, zipIdx).join(' ');
      detail.zipCode = addrParts[zipIdx];
    } else if (addrText) {
      detail.address = addrText;
    }
  }

  return detail;
}

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
