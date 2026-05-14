import { db } from '../src/lib/db';
async function main() {
  const cached = await db.course.findMany({
    where: { detailFetchedAt: { not: null } },
    select: { slug: true, name: true },
    take: 3,
  });
  console.log('Cached:', JSON.stringify(cached, null, 2));
  
  const uncached = await db.course.findMany({
    where: { detailFetchedAt: null },
    select: { slug: true, name: true },
    take: 3,
  });
  console.log('Uncached:', JSON.stringify(uncached, null, 2));
}
main().catch(console.error);
