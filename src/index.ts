#!/usr/bin/env node

import { findCursorDatabase, validateCursorDatabase } from './database.js';
import { parseArgs, showHelp, showVersion } from './arg-parser.js';
import { saveModesToFile } from './save.js';
import { loadModesFromFile } from './load.js';
import type { CliArgs } from './cli-schema.js';

async function main() {
  try {
    // Parse and validate command line arguments
    const args = parseArgs();

    // Handle help command
    if ('help' in args && args.help) {
      showHelp();
      return;
    }

    // Handle version command
    if ('version' in args && args.version) {
      showVersion();
      return;
    }

    // Must be a command with filename (type narrowing)
    const commandArgs = args as CliArgs;
    if (commandArgs.command && commandArgs.filename) {
      console.log('🚀 Modeload - Cursor Custom Modes Tool\n');

      // Discover database (use custom path if provided)
      console.log('🔍 Discovering Cursor database...');
      const dbPath = findCursorDatabase(commandArgs.dbPath);

      // Validate the database
      if (validateCursorDatabase(dbPath)) {
        console.log('✅ Found valid Cursor database\n');
      } else {
        throw new Error('Database validation failed - not a valid SQLite file');
      }

      console.log(`📍 Database: ${dbPath}`);
      console.log(`📄 File: ${commandArgs.filename}`);
      console.log(`⚡ Command: ${commandArgs.command}\n`);

      // Execute the appropriate command
      switch (commandArgs.command) {
        case 'save':
          await handleSaveCommand(dbPath, commandArgs.filename);
          break;
        case 'load':
          await handleLoadCommand(dbPath, commandArgs.filename);
          break;
        default:
          throw new Error(`Unknown command: ${commandArgs.command}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle the save command - export modes from database to JSON file
 */
async function handleSaveCommand(dbPath: string, filename: string): Promise<void> {
  console.log(`💾 Exporting custom modes to ${filename}...\n`);

  try {
    await saveModesToFile(dbPath, filename);
  } catch (error) {
    throw new Error(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle the load command - import modes from JSON file to database
 */
async function handleLoadCommand(dbPath: string, filename: string): Promise<void> {
  console.log(`📥 Importing custom modes from ${filename}...\n`);

  try {
    await loadModesFromFile(dbPath, filename);
  } catch (error) {
    throw new Error(`Load failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch(console.error);
