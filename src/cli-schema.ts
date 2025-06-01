import { z } from 'zod';
import { existsSync } from 'fs';
import { extname } from 'path';

// Command enumeration
const CommandSchema = z.enum(['save', 'load'], {
  errorMap: () => ({ message: 'Command must be either "save" or "load"' })
});

// File path validation for save/load operations
const FilePathSchema = z.string()
  .min(1, 'Filename cannot be empty')
  .refine((path) => {
    const ext = extname(path);
    return ext === '.json';
  }, {
    message: 'Filename must have a .json extension'
  });

// Custom database path validation (optional)
const DatabasePathSchema = z.string()
  .min(1, 'Database path cannot be empty')
  .refine((path) => existsSync(path), {
    message: 'Database path does not exist'
  })
  .optional();

// Main CLI arguments schema
export const CliArgsSchema = z.object({
  command: CommandSchema,
  filename: FilePathSchema,
  dbPath: DatabasePathSchema,
  help: z.boolean().default(false),
  version: z.boolean().default(false)
});

// Type inference for TypeScript
export type CliArgs = z.infer<typeof CliArgsSchema>;

// Help command schema (when no other args provided)
export const HelpSchema = z.object({
  help: z.literal(true),
  version: z.boolean().default(false),
  command: z.undefined(),
  filename: z.undefined(),
  dbPath: z.undefined()
});

// Version command schema
export const VersionSchema = z.object({
  version: z.literal(true),
  help: z.boolean().default(false),
  command: z.undefined(),
  filename: z.undefined(),
  dbPath: z.undefined()
});

// Union type for all possible CLI inputs
export const AllCliArgsSchema = z.union([
  CliArgsSchema,
  HelpSchema,
  VersionSchema
]);

export type AllCliArgs = z.infer<typeof AllCliArgsSchema>;

// Validation function with helpful error messages
export function validateCliArgs(args: unknown): AllCliArgs {
  try {
    return AllCliArgsSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n');

      throw new Error(`
Invalid command line arguments:

${errorMessages}

Usage:
  modeload save <filename.json> [--db-path <path>]
  modeload load <filename.json> [--db-path <path>]
  modeload --help
  modeload --version

Examples:
  modeload save my-modes.json
  modeload load my-modes.json --db-path "/custom/path/state.vscdb"
`);
    }
    throw error;
  }
}

// Example validation scenarios for testing
export const ExampleValidInputs = {
  save: {
    command: 'save' as const,
    filename: 'modes.json',
    dbPath: undefined,
    help: false,
    version: false
  },
  saveWithDbPath: {
    command: 'save' as const,
    filename: 'backup-modes.json',
    dbPath: '/Users/test/state.vscdb',
    help: false,
    version: false
  },
  load: {
    command: 'load' as const,
    filename: 'modes.json',
    dbPath: undefined,
    help: false,
    version: false
  },
  help: {
    help: true,
    version: false,
    command: undefined,
    filename: undefined,
    dbPath: undefined
  },
  version: {
    version: true,
    help: false,
    command: undefined,
    filename: undefined,
    dbPath: undefined
  }
};