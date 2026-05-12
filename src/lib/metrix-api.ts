import {
  MetrixCourse,
  CoursesListResponse,
  Course,
  CourseGroup,
} from './types';

const BASE_URL = 'https://discgolfmetrix.com/api.php';

// ==========================================
// Raw API calls
// ==========================================

export async function fetchCoursesList(
  countryCode: string,
  nameSearch?: string
): Promise<MetrixCourse[]> {
  const params = new URLSearchParams({
    content: 'courses_list',
    country_code: countryCode,
  });

  if (nameSearch) {
    params.set('name', nameSearch);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }

  const data: CoursesListResponse = await response.json();
  return data.courses ?? [];
}

// ==========================================
// Data transformers (raw → app types)
// ==========================================

export function transformCourse(raw: MetrixCourse): Course {
  return {
    id: raw.ID,
    parentId: raw.ParentID,
    name: raw.Name,
    shortName: raw.Short,
    fullName: raw.Fullname,
    type: raw.Type === '1' ? 'parent' : 'layout',
    countryCode: raw.CountryCode,
    area: raw.Area,
    city: raw.City,
    location: raw.Location,
    latitude: parseFloat(raw.X) || 0,
    longitude: parseFloat(raw.Y) || 0,
    isActive: !raw.Enddate,
    endDate: raw.Enddate || null,
  };
}

// ==========================================
// Course grouping: parent + children
// ==========================================

export function groupCourses(courses: Course[]): CourseGroup[] {
  const parentMap = new Map<string, Course>();
  const childrenMap = new Map<string, Course[]>();

  for (const course of courses) {
    if (course.type === 'parent') {
      parentMap.set(course.id, course);
    } else {
      const parentId = course.parentId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(course);
    }
  }

  const groups: CourseGroup[] = [];

  // Add parent courses with their children
  for (const [parentId, parent] of parentMap) {
    const layouts = childrenMap.get(parentId) ?? [];
    const activeLayoutCount = layouts.filter((l) => l.isActive).length;
    groups.push({
      parent,
      layouts,
      activeLayoutCount,
      totalLayoutCount: layouts.length,
    });
  }

  // Add standalone layout courses (orphan layouts with no parent in the result set)
  const parentIds = new Set(parentMap.keys());
  for (const course of courses) {
    if (course.type === 'layout' && !parentIds.has(course.parentId)) {
      groups.push({
        parent: course, // The layout IS the "parent" for display
        layouts: [],
        activeLayoutCount: course.isActive ? 1 : 0,
        totalLayoutCount: 1,
      });
    }
  }

  return groups;
}

// ==========================================
// Helper: extract unique filter values from courses
// ==========================================

export function extractUniqueValues(
  courses: Course[]
): {
  countries: string[];
  areas: string[];
  cities: string[];
} {
  const countrySet = new Set<string>();
  const areaSet = new Set<string>();
  const citySet = new Set<string>();

  for (const course of courses) {
    if (course.countryCode) countrySet.add(course.countryCode);
    if (course.area) areaSet.add(course.area);
    if (course.city) citySet.add(course.city);
  }

  return {
    countries: Array.from(countrySet).sort(),
    areas: Array.from(areaSet).sort(),
    cities: Array.from(citySet).sort(),
  };
}

// ==========================================
// Helper: distance between coordinates (Haversine)
// ==========================================

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==========================================
// Helper: course stats
// ==========================================

export function getCourseStats(courses: Course[]): {
  totalCourses: number;
  parentCourses: number;
  activeCourses: number;
  cities: number;
  areas: number;
} {
  const parents = courses.filter((c) => c.type === 'parent');
  const active = courses.filter((c) => c.isActive);
  const citySet = new Set(courses.map((c) => c.city).filter(Boolean));
  const areaSet = new Set(courses.map((c) => c.area).filter(Boolean));

  return {
    totalCourses: courses.length,
    parentCourses: parents.length,
    activeCourses: active.length,
    cities: citySet.size,
    areas: areaSet.size,
  };
}
