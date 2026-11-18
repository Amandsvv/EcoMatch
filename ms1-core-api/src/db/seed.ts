import { getDb, schema } from './index';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const db = getDb();
  console.log('🌱 Starting database seeding...');

  // 1. Clean database in correct dependency order
  console.log('🧹 Clearing all existing database records...');
  await db.delete(schema.dealEvents);
  await db.delete(schema.verificationRecords);
  await db.delete(schema.certificates);
  await db.delete(schema.logisticsBookings);
  await db.delete(schema.haulers);
  await db.delete(schema.outreachDrafts);
  await db.delete(schema.matches);
  await db.delete(schema.materialClassifications);
  await db.delete(schema.submissions);
  await db.delete(schema.businesses);
  await db.delete(schema.users);
  console.log('All existing records cleared successfully.');

  // 2. Generate Admin User only
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ecomatch.dev';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  const adminId = uuidv4();
  await db.insert(schema.users).values({
    id: adminId,
    email: adminEmail,
    passwordHash,
    role: 'admin',
    emailVerified: true,
  });

  console.log('Admin user created successfully!');
  console.log('----------------------------------------');
  console.log(`Role:     admin`);
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`User ID:  ${adminId}`);
  console.log('----------------------------------------');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
