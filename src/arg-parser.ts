import { validateCliArgs, type AllCliArgs } from './cli-schema.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      dbPath: undefined,
      yes: false
    });
  }

  if (args.includes('--version') || args.includes('-v')) {
    return validateCliArgs({
      version: true,
      help: false,
      command: undefined,
      filename: undefined,
      dbPath: undefined,
      yes: false
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
  let yes = false;

  // Look for --db-path flag
  const dbPathIndex = args.findIndex(arg => arg === '--db-path');
  if (dbPathIndex !== -1 && dbPathIndex + 1 < args.length) {
    dbPath = args[dbPathIndex + 1];
  }

  // Look for -y flag
  if (args.includes('-y') || args.includes('--yes')) {
    yes = true;
  }

  // Create arguments object
  const parsedArgs = {
    command,
    filename,
    dbPath,
    help: false,
    version: false,
    yes
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
  -y, --yes          Skip load confirmation prompt (auto-confirm)
  --help, -h         Show this help message
  --version, -v      Show version information

EXAMPLES:
  modeload save my-modes.json
  modeload load my-modes.json
  modeload load my-modes.json -y
  modeload save backup.json --db-path "/custom/path/state.vscdb"
  modeload load settings.json --db-path "/opt/cursor/state.vscdb" -y

NOTES:
  • Filenames must have .json extension
  • Database is auto-discovered if --db-path not provided
  • Use -y to skip the safety confirmation when loading modes
`);
}

/**
 * Display version information
 */
export function showVersion(): void {
  let version = 'unknown';
  try {
    // Read package.json to get version
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    version = packageJson.version || 'unknown';
  } catch {
    // Default to unknown if we can't read package.json
  }

  console.log(`
🚀 Modeload v${version}
`);
}