# Modeload - Cursor Custom Modes Save/Load Tool

## Project Goal
Create a VERY SIMPLE CLI tool that can save and load Cursor custom modes to/from disk.

## Core Features
1. **Save Command**: `modeload save modes.json` - Export custom modes to specified file
2. **Load Command**: `modeload load modes.json` - Import custom modes from specified file

## Requirements
- [ ] Back up the Cursor DB before any load operation
- [ ] Use `better-sqlite3` npm package (includes SQLite, no external dependencies)
- [ ] Use TSUP for build tooling
- [ ] Use Zod for schema validation of modes files before loading
- [ ] Automatically find Cursor's state.vscdb database location
- [ ] Allow custom database path override via CLI flag

## Dependencies
```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "tsup": "^8.0.1",
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.10.0"
  }
}
```

## Technical Details

### Database Location Discovery
```typescript
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

function findCursorDatabase(): string {
  const possiblePaths = [
    // macOS
    join(homedir(), 'Library/Application Support/Cursor/User/globalStorage/state.vscdb'),
    // Windows
    join(homedir(), 'AppData/Roaming/Cursor/User/globalStorage/state.vscdb'),
    // Linux
    join(homedir(), '.config/Cursor/User/globalStorage/state.vscdb'),
    // Alternative Linux location
    join(homedir(), '.cursor/User/globalStorage/state.vscdb')
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('Cursor database not found. Use --db-path to specify custom location.');
}
```

### CLI Options
```bash
# Auto-discover database
modeload save modes.json
modeload load modes.json

# Custom database path
modeload save modes.json --db-path "/custom/path/to/state.vscdb"
modeload load modes.json --db-path "/custom/path/to/state.vscdb"
```

### Database Structure
- **DB Key**: `src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser`
- **JSON Path**: `composerState.modes4[]`

### Mode Schema
```json
{
  "id": "unique-id",
  "name": "Display Name",
  "icon": "icon-name",
  "description": "Description text",
  "thinkingLevel": "none|basic|advanced",
  "autoRun": true/false,
  "shouldAutoApplyIfNoEditTool": true/false,
  "autoFix": true/false,
  "enabledTools": [array of tool IDs],
  "enabledMcpServers": [array],
  "customRulesForAI": "custom instructions text"
}
```

### Zod Validation Schema
```typescript
import { z } from 'zod';

const ModeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  icon: z.string(),
  description: z.string().optional(),
  thinkingLevel: z.enum(['none', 'basic', 'advanced']).optional(),
  autoRun: z.boolean(),
  shouldAutoApplyIfNoEditTool: z.boolean(),
  autoFix: z.boolean(),
  enabledTools: z.array(z.number()),
  enabledMcpServers: z.array(z.any()).optional(),
  customRulesForAI: z.string().optional()
});

const ModesFileSchema = z.array(ModeSchema);
```

### SQLite Implementation
```typescript
import Database from 'better-sqlite3';

function openDatabase(customPath?: string): Database.Database {
  const dbPath = customPath || findCursorDatabase();

  if (!existsSync(dbPath)) {
    throw new Error(`Database not found at: ${dbPath}`);
  }

  return new Database(dbPath, { readonly: false });
}

// Query for modes data
function getModesFromDb(db: Database.Database) {
  const stmt = db.prepare(`
    SELECT value
    FROM ItemTable
    WHERE key = 'src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser'
  `);
  return stmt.get();
}
```

## Implementation Tasks
- [ ] Set up TypeScript project with TSUP
- [ ] Install better-sqlite3 and Zod dependencies
- [ ] Create CLI interface with commands for save/load
- [ ] Implement database discovery logic for multiple OS platforms
- [ ] Add --db-path CLI option for custom database location
- [ ] Implement better-sqlite3 database operations
- [ ] Implement Zod schema for mode validation
- [ ] Add validation step before loading modes into DB
- [ ] Add database backup functionality before loads
- [ ] Handle JSON serialization/deserialization of modes
- [ ] Add comprehensive error handling and validation feedback
- [ ] Test with existing custom modes (like "PLAN" mode)
- [ ] Test with invalid modes files to ensure validation works
- [ ] Test database discovery on different OS platforms

## Error Handling
- [ ] Handle database not found scenarios
- [ ] Provide helpful error messages for each OS
- [ ] Validate database is actually a Cursor database
- [ ] Handle permission issues when accessing database

## Validation Flow
1. **On Load**: Discover DB → Parse JSON file → Validate with Zod schema → Backup DB → Write to DB
2. **On Save**: Discover DB → Read from DB → Validate with Zod schema → Write JSON file
3. **Error Handling**: Provide clear validation error messages for malformed files

## Built-in Modes (Reference)
1. Agent (agent) - Plan, search, make edits, run commands
2. Ask (chat) - Ask Cursor questions about the context you add
3. Manual (edit) - Edit only specific files
4. Background (background) - Create background agent

## Current Custom Mode Example
- **Name**: "PLAN"
- **ID**: e94d8f3d-cf6d-49d1-ad5e-d0241284f1ad
- **Settings**: Auto-apply enabled, Auto-fix enabled
- **Custom Rules**: "only edit files in ./memory folder"
