import 'dotenv/config';
import { seedAchievements } from '../services/achievements';

async function main() {
  console.log('Seeding achievements...');
  const result = await seedAchievements();
  console.log(`Done. Created: ${result.created}, Skipped (already exist): ${result.skipped}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
