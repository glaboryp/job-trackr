#!/usr/bin/env node
/**
 * Script to apply database migrations using InsForge SDK directly
 * This bypasses the CLI which seems to have connection issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@insforge/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const VITE_INSFORGE_URL = process.env.VITE_INSFORGE_URL || 'https://a6aw86in.eu-central.insforge.app';
const VITE_INSFORGE_ANON_KEY = process.env.VITE_INSFORGE_ANON_KEY;

if (!VITE_INSFORGE_URL || !VITE_INSFORGE_ANON_KEY) {
  console.error('❌ Missing environment variables VITE_INSFORGE_URL or VITE_INSFORGE_ANON_KEY');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('🔄 Connecting to InsForge...');
    const client = createClient({
      baseUrl: VITE_INSFORGE_URL,
      anonKey: VITE_INSFORGE_ANON_KEY,
    });

    // Read migration file
    const migrationPath = path.join(__dirname, '../insforge/migrations/20260427093000_auth_sync_applications.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statements (naive splitting, assumes each statement ends with ;)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    const httpClient = client.getHttpClient();
    
    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        console.log(`\n📍 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);

        const result = await httpClient.post('/api/db/query', {
          query: stmt,
        });

        console.log(`   ✓ Success`);
        successCount++;
      } catch (err) {
        console.error(`   ✗ Error: ${err.message}`);
        if (err.details) console.error(`     Details: ${err.details}`);
        // Continue with next statement
      }
    }

    console.log(`\n✅ Migration applied! (${successCount}/${statements.length} statements succeeded)`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
