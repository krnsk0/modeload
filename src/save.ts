import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import { CURSOR_SETTINGS_KEY, COMPOSER_STATE_KEY, MODES_KEY } from './constants.js';

/**
 * Save custom modes from Cursor database to a JSON file
 * @param dbPath Path to the Cursor database file
 * @param outputFile Path where to save the JSON file
 * @returns Promise<void>
 */
export async function saveModesToFile(dbPath: string, outputFile: string): Promise<void> {
  console.log('📖 Opening Cursor database...');

  // Open database in readonly mode for safety
  const db = new Database(dbPath, { readonly: true });

  try {
    console.log('🔍 Querying for custom modes...');

    // Query for the settings data
    const stmt = db.prepare(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);

    const result = stmt.get(CURSOR_SETTINGS_KEY) as { value: string } | undefined;

    if (!result) {
      throw new Error(`Settings not found in database. Key: ${CURSOR_SETTINGS_KEY}`);
    }

    console.log('📋 Parsing database content...');

    // Parse the JSON value
    let settingsData: any;
    try {
      settingsData = JSON.parse(result.value);
    } catch (parseError) {
      throw new Error(`Failed to parse settings JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Extract modes (trust the database structure)
    const modes = settingsData?.[COMPOSER_STATE_KEY]?.[MODES_KEY];

    if (!modes || !Array.isArray(modes)) {
      console.log('⚠️  No custom modes found in database');
      console.log('   This might mean:');
      console.log('   • No custom modes have been created yet');
      console.log('   • Cursor version doesn\'t support custom modes');
      console.log('   • Database structure has changed');

      // Create empty array for consistency
      writeModesToFile([], outputFile);
      return;
    }

    console.log(`✨ Found ${modes.length} mode(s)`);

    // Log mode names for user feedback
    modes.forEach((mode: any, index: number) => {
      const name = mode?.name || 'Unknown';
      const id = mode?.id || 'unknown';
      console.log(`   ${index + 1}. "${name}" (${id})`);
    });

    // Write to file (no validation - trust the database)
    writeModesToFile(modes, outputFile);

    console.log(`\n🎉 Successfully saved ${modes.length} modes to: ${outputFile}`);

  } finally {
    // Always close the database
    db.close();
  }
}

/**
 * Write modes array to JSON file with pretty formatting
 */
function writeModesToFile(modes: any[], outputFile: string): void {
  console.log(`💾 Writing modes to ${outputFile}...`);

  try {
    const jsonContent = JSON.stringify(modes, null, 2);
    writeFileSync(outputFile, jsonContent, 'utf-8');
  } catch (writeError) {
    throw new Error(`Failed to write file: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
  }
}

/**
 * Get a preview of modes without saving (for debugging)
 */
export async function previewModes(dbPath: string): Promise<any[]> {
  const db = new Database(dbPath, { readonly: true });

  try {
    const stmt = db.prepare(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);

    const result = stmt.get(CURSOR_SETTINGS_KEY) as { value: string } | undefined;

    if (!result) {
      return [];
    }

    const settingsData = JSON.parse(result.value);
    const modes = settingsData?.[COMPOSER_STATE_KEY]?.[MODES_KEY] || [];

    return Array.isArray(modes) ? modes : [];
  } finally {
    db.close();
  }
}