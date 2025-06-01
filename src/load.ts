import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { CURSOR_SETTINGS_KEY } from './constants.js';

/**
 * Load custom modes from a JSON file into the Cursor database
 * @param dbPath Path to the Cursor database file
 * @param inputFile Path to the JSON file to load
 * @returns Promise<void>
 */
export async function loadModesFromFile(dbPath: string, inputFile: string): Promise<void> {
  console.log(`📖 Reading modes from ${inputFile}...`);

  // Read and parse the JSON file
  let modesData: any;
  try {
    const fileContent = readFileSync(inputFile, 'utf-8');
    modesData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to read/parse JSON file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Ensure it's an array
  if (!Array.isArray(modesData)) {
    throw new Error('JSON file must contain an array of modes');
  }

  console.log(`✨ Found ${modesData.length} mode(s) to import`);

  // Log mode names for user feedback
  modesData.forEach((mode: any, index: number) => {
    const name = mode?.name || 'Unknown';
    const id = mode?.id || 'unknown';
    console.log(`   ${index + 1}. "${name}" (${id})`);
  });

  console.log('\n📖 Opening Cursor database...');

  // Open database in read-write mode
  const db = new Database(dbPath, { readonly: false });

  try {
    console.log('🔍 Reading current settings...');

    // Get current settings
    const stmt = db.prepare(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);

    const result = stmt.get(CURSOR_SETTINGS_KEY) as { value: string } | undefined;

    if (!result) {
      throw new Error(`Settings not found in database. Key: ${CURSOR_SETTINGS_KEY}`);
    }

    // Parse current settings
    let currentSettings: any;
    try {
      currentSettings = JSON.parse(result.value);
    } catch (parseError) {
      throw new Error(`Failed to parse current settings: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    console.log('🔄 Updating modes...');

    // Ensure composerState exists
    if (!currentSettings.composerState) {
      currentSettings.composerState = {};
    }

    // Update the modes4 array
    currentSettings.composerState.modes4 = modesData;

    console.log('💾 Writing updated settings to database...');

    // Update the database
    const updateStmt = db.prepare(`
      UPDATE ItemTable
      SET value = ?
      WHERE key = ?
    `);

    updateStmt.run(JSON.stringify(currentSettings), CURSOR_SETTINGS_KEY);

    console.log(`\n🎉 Successfully loaded ${modesData.length} modes into Cursor database!`);
    console.log('\n⚠️  Important: Restart Cursor to see the changes');

  } finally {
    // Always close the database
    db.close();
  }
}

