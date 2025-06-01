#!/usr/bin/env node

import { findCursorDatabase, validateCursorDatabase } from './database';

async function main() {
  try {
    console.log('🚀 Modeload - Cursor Custom Modes Tool\n');

    // Test database discovery
    const dbPath = findCursorDatabase();

    // Validate the database
    if (validateCursorDatabase(dbPath)) {
      console.log('✅ Found Cursor sqlite settings database\n');
    } else {
      console.log('⚠️  Database validation failed - may not be a valid SQLite file\n');
    }

    console.log(`📍 Database location: ${dbPath}`);
    console.log('\n🎉 Database discovery successful!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
