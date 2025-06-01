import { validateCliArgs, type AllCliArgs } from './cli-schema.js';

/**
 * Parse command line arguments from process.argv
 * @param argv Command line arguments (defaults to process.argv)
 * @returns Validated CLI arguments object
 */
export function parseArgs(argv: string[] = process.argv): AllCliArgs {
  // Remove 'node' and script name from argv
  const args = argv.slice(2);

  // Handle empty args or help/version flags
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return validateCliArgs({
      help: true,
      version: false,
      command: undefined,
      filename: undefined,
      dbPath: undefined
    });
  }

  if (args.includes('--version') || args.includes('-v')) {
    return validateCliArgs({
      version: true,
      help: false,
      command: undefined,
      filename: undefined,
      dbPath: undefined
    });
  }

  // Parse command and filename
  const command = args[0];
  const filename = args[1];

  if (!command) {
    throw new Error('Command is required. Use "save" or "load"');
  }

  if (!filename) {
    throw new Error('Filename is required');
  }

  // Parse optional flags
  let dbPath: string | undefined;

  // Look for --db-path flag
  const dbPathIndex = args.findIndex(arg => arg === '--db-path');
  if (dbPathIndex !== -1 && dbPathIndex + 1 < args.length) {
    dbPath = args[dbPathIndex + 1];
  }

  // Create arguments object
  const parsedArgs = {
    command,
    filename,
    dbPath,
    help: false,
    version: false
  };

  // Validate with Zod schema
  return validateCliArgs(parsedArgs);
}

/**
 * Display help message
 */
export function showHelp(): void {
  console.log(`
🚀 Modeload - Cursor Custom Modes Save/Load Tool

USAGE:
  modeload <command> <filename> [options]

COMMANDS:
  save <filename>    Export custom modes to JSON file
  load <filename>    Import custom modes from JSON file

OPTIONS:
  --db-path <path>   Use custom Cursor database location
  --help, -h         Show this help message
  --version, -v      Show version information

EXAMPLES:
  modeload save my-modes.json
  modeload load my-modes.json
  modeload save backup.json --db-path "/custom/path/state.vscdb"
  modeload load settings.json --db-path "/opt/cursor/state.vscdb"

NOTES:
  • Filenames must have .json extension
  • Database is auto-discovered if --db-path not provided
  • Database is automatically backed up before load operations
  • All modes are validated before import/export
`);
}

/**
 * Display version information
 */
export function showVersion(): void {
  // In a real app, this would come from package.json
  console.log(`
🚀 Modeload v1.0.0
A simple CLI tool to save and load Cursor custom modes

Database Discovery: ✅ Cross-platform (macOS, Windows, Linux)
Validation: ✅ Zod schema validation
Safety: ✅ Automatic database backup
`);
}