import { testDatabaseConnection, prisma } from "../services/prisma.js";

async function main() {
  try {
    console.log("Testing connection to Neon PostgreSQL...");
    await testDatabaseConnection();

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`\nFound ${tables.length} tables in Neon PostgreSQL database:`);
    tables.forEach((t) => console.log(`  ✓ ${t.table_name}`));

    // Check pgvector extension
    const extensions = await prisma.$queryRaw`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
    `;
    if (extensions.length > 0) {
      console.log(`\n✓ pgvector extension is active (v${extensions[0].extversion})`);
    } else {
      console.warn("\n⚠️ pgvector extension not found!");
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
