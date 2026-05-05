const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.service.deleteMany().catch(() => {});
  await prisma.service.createMany({ data: [
    {
      id: 'IG-2944-PR',
      name: 'Instagram Power Likes',
      category: 'Instagram',
      description: 'Instant engagement from high-authority accounts.',
      pricePer1k: 12.5,
      minOrder: 50,
      maxOrder: 1000000,
      speed: '10K/Day',
      retention: 'Lifetime',
      quality: 'Real Profiles',
      badge: 'ELITE HIVE'
    },
    {
      id: 'TT-8842-VW',
      name: 'TikTok Viral Views',
      category: 'TikTok',
      description: 'Optimized for TikTok algorithm.',
      pricePer1k: 0.42,
      minOrder: 100,
      maxOrder: 10000000,
      speed: '1M/Day',
      retention: 'High',
      quality: 'Monetization Safe',
      badge: 'HIGH RETENTION'
    }
  ]});
  console.log('Seeded services');
}

main()
  .catch(e => console.error(e))
  .finally(async () => { await prisma.$disconnect(); });