import { z } from 'zod';
import { existsSync } from 'fs';
import { extname } from 'path';

// Command enumeration
const CommandSchema = z.enum(['save', 'load']);

// File path validation for save/load operations
const FilePathSchema = z.string()
  .min(1)
  .refine((path) => extname(path) === '.json');

// Custom database path validation (optional)
const DatabasePathSchema = z.string()
  .min(1)
  .refine((path) => existsSync(path))
  .optional();

// Main CLI arguments schema
export const CliArgsSchema = z.object({
  command: CommandSchema,
  filename: FilePathSchema,
  dbPath: DatabasePathSchema,
  help: z.boolean().default(false),
  version: z.boolean().default(false),
  yes: z.boolean().default(false)
});

// Type inference for TypeScript
export type CliArgs = z.infer<typeof CliArgsSchema>;

// Help command schema (when no other args provided)
export const HelpSchema = z.object({
  help: z.literal(true),
  version: z.boolean().default(false),
  command: z.undefined(),
  filename: z.undefined(),
  dbPath: z.undefined(),
  yes: z.boolean().default(false)
});

// Version command schema
export const VersionSchema = z.object({
  version: z.literal(true),
  help: z.boolean().default(false),
  command: z.undefined(),
  filename: z.undefined(),
  dbPath: z.undefined(),
  yes: z.boolean().default(false)
});

// Union type for all possible CLI inputs
export const AllCliArgsSchema = z.union([
  CliArgsSchema,
  HelpSchema,
  VersionSchema
]);

export type AllCliArgs = z.infer<typeof AllCliArgsSchema>;

// Simple validation function
export function validateCliArgs(args: unknown): AllCliArgs {
  return AllCliArgsSchema.parse(args);
}