require('dotenv').config();
const { execSync } = require('child_process');
const { Client } = require('pg');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const tenants = [
  { slug: 'khpi', name: 'Kharkiv Polytechnic Institute' },
  { slug: 'kpi', name: 'Kyiv Polytechnic Institute' },
  { slug: 'lnu', name: 'Lviv National University' }
];

const baseDbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function setup() {
  console.log('=== Starting Isolated Multi-tenancy Setup (Random UUID v4) ===');

  console.log('\n--- Setting up public registry schema ---');
  execSync(`npm run db:push:public`, {
    env: {
      ...process.env,
      DATABASE_URL: baseDbUrl,
      DIRECT_URL: baseDbUrl
    },
    stdio: 'inherit'
  });

  const client = new Client({ connectionString: baseDbUrl });
  await client.connect();

  try {
    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.slug}`);

      const res = await client.query('SELECT "schemaName" FROM "Tenant" WHERE slug = $1', [tenant.slug]);
      let schemaName;

      if (res.rows.length > 0) {
        schemaName = res.rows[0].schemaName;
        console.log(`Using existing schema name: ${schemaName}`);
      } else {
        schemaName = uuidv4();
        console.log(`Generated new random schema name: ${schemaName}`);
        await client.query(
          'INSERT INTO "Tenant" (id, slug, name, "schemaName", "isActive") VALUES (gen_random_uuid(), $1, $2, $3, true)',
          [tenant.slug, tenant.name, schemaName]
        );
      }

      console.log(`--- Setting up university schema: ${schemaName} ---`);

      const tenantUrl = new URL(baseDbUrl);
      tenantUrl.searchParams.set('schema', schemaName);
      const tenantUrlString = tenantUrl.toString();
      const tenantEnv = {
        ...process.env,
        DATABASE_URL: tenantUrlString,
        DIRECT_URL: tenantUrlString
      };

      console.log(`Pushing university data structure to ${schemaName}...`);
      execSync(`npm run db:push:tenant`, { env: tenantEnv, stdio: 'inherit' });

      console.log(`Seeding data for ${schemaName}...`);
      execSync(`npx ts-node prisma/seed.ts ${schemaName}`, { env: tenantEnv, stdio: 'inherit' });
    }

  } catch (error) {
    console.error('Fatal setup error:', error);
  } finally {
    await client.end();
  }

  console.log('\n=== Isolated Multi-tenancy Setup Complete ===');
}

setup();
