import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * Find the Cursor database location across different operating systems
 * @param customPath Optional custom database path override
 * @returns Path to the Cursor state.vscdb file
 * @throws Error if database cannot be found
 */
export function findCursorDatabase(customPath?: string): string {
  // If custom path provided, validate and return it
  if (customPath) {
    if (!existsSync(customPath)) {
      throw new Error(`Custom database path not found: ${customPath}`);
    }
    return customPath;
  }

  // Standard Cursor database locations for different OS
  const possiblePaths = [
    // macOS
    join(homedir(), 'Library/Application Support/Cursor/User/globalStorage/state.vscdb'),

    // Windows
    join(homedir(), 'AppData/Roaming/Cursor/User/globalStorage/state.vscdb'),

    // Linux (standard XDG location)
    join(homedir(), '.config/Cursor/User/globalStorage/state.vscdb'),

    // Linux (alternative location)
    join(homedir(), '.cursor/User/globalStorage/state.vscdb'),

    // Additional possible locations for different Cursor installations
    join(homedir(), 'snap/cursor/current/.config/Cursor/User/globalStorage/state.vscdb'),
    join(homedir(), '.local/share/Cursor/User/globalStorage/state.vscdb')
  ];

  console.log('🔍 Searching for Cursor database...');

  for (const path of possiblePaths) {
    console.log(`   Checking: ${path}`);
    if (existsSync(path)) {
      console.log(`✅ Found Cursor database at: ${path}`);
      return path;
    }
  }

  // If no database found, provide helpful error message
  const errorMessage = `
❌ Cursor database not found in any of the standard locations:

${possiblePaths.map(p => `   • ${p}`).join('\n')}

This could mean:
1. Cursor is not installed
2. Cursor is installed in a non-standard location
3. Cursor hasn't been run yet (database not created)

Solutions:
• Make sure Cursor is installed and has been run at least once
• Use --db-path to specify a custom database location
• Check if Cursor is installed in a different location

Example with custom path:
   modeload save modes.json --db-path "/path/to/your/state.vscdb"
`;

  throw new Error(errorMessage);
}

/**
 * Validate that a file is actually a Cursor database
 * @param dbPath Path to the database file
 * @returns true if it appears to be a valid Cursor database
 */
export function validateCursorDatabase(dbPath: string): boolean {
  if (!existsSync(dbPath)) {
    return false;
  }

  // Basic validation - check if it's a SQLite file
  // SQLite files start with "SQLite format 3"
  try {
    const buffer = readFileSync(dbPath, { encoding: null });
    const header = buffer.toString('ascii', 0, 16);
    return header.startsWith('SQLite format 3');
  } catch {
    return false;
  }
}