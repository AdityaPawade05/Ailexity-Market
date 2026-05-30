const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixSchema() {
  try {
    // Check if the price column exists in the Channel table
    const result = await prisma.$queryRaw`PRAGMA table_info(Channel);`;
    const priceColumn = result.find(col => col.name === 'price');
    
    if (!priceColumn) {
      console.log('Price column not found. Adding via SQL...');
      await prisma.$executeRaw`ALTER TABLE "Channel" ADD COLUMN "price" REAL NOT NULL DEFAULT 0;`;
      console.log('Price column added successfully.');
    } else {
      console.log('Price column already exists in DB.');
    }

    const result2 = await prisma.$queryRaw`PRAGMA table_info(Purchase);`;
    const channelIdCol = result2.find(col => col.name === 'channelId');
    if (!channelIdCol) {
      console.log('channelId column not found. Adding via SQL...');
      await prisma.$executeRaw`ALTER TABLE "Purchase" ADD COLUMN "channelId" TEXT;`;
      console.log('channelId column added successfully.');
    } else {
      console.log('channelId already exists.');
    }

  } catch (error) {
    console.error('Error modifying SQLite schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixSchema();
