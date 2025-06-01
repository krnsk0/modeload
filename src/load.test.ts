import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadModesFromFile } from './load.js';
import * as fs from 'fs';
import { CURSOR_SETTINGS_KEY } from './constants.js';

// Mock better-sqlite3
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn();
const mockClose = vi.fn();

const mockDatabase = {
  prepare: mockPrepare,
  close: mockClose
};

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(() => mockDatabase)
  };
});

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn()
  };
});

const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('loadModesFromFile', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to capture output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock setup
    mockPrepare.mockReturnValue({
      get: mockGet,
      run: mockRun
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('JSON file reading and parsing', () => {
    it('should successfully load valid modes from JSON file', async () => {
      const testModes = [
        { id: 'test1', name: 'Test Mode 1' },
        { id: 'test2', name: 'Test Mode 2' }
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockReadFileSync).toHaveBeenCalledWith('modes.json', 'utf-8');
      expect(consoleSpy).toHaveBeenCalledWith('📖 Reading modes from modes.json...');
      expect(consoleSpy).toHaveBeenCalledWith('✨ Found 2 mode(s) to import');
    });

    it('should throw error for non-existent JSON file', async () => {
      mockReadFileSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      });

      await expect(loadModesFromFile('/path/to/db', 'nonexistent.json'))
        .rejects.toThrow('Failed to read/parse JSON file: ENOENT: no such file or directory');
    });

    it('should throw error for invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('{ invalid json }');

      await expect(loadModesFromFile('/path/to/db', 'invalid.json'))
        .rejects.toThrow('Failed to read/parse JSON file:');
    });

    it('should throw error if JSON is not an array', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ not: 'an array' }));

      await expect(loadModesFromFile('/path/to/db', 'object.json'))
        .rejects.toThrow('JSON file must contain an array of modes');
    });

    it('should handle empty array', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'empty.json');

      expect(consoleSpy).toHaveBeenCalledWith('✨ Found 0 mode(s) to import');
    });
  });

  describe('Mode information display', () => {
    it('should display mode names and IDs', async () => {
      const testModes = [
        { id: 'mode1', name: 'Cool Mode' },
        { id: 'mode2', name: 'Another Mode' },
        { id: 'mode3' } // Missing name
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(consoleSpy).toHaveBeenCalledWith('   1. "Cool Mode" (mode1)');
      expect(consoleSpy).toHaveBeenCalledWith('   2. "Another Mode" (mode2)');
      expect(consoleSpy).toHaveBeenCalledWith('   3. "Unknown" (mode3)');
    });

    it('should handle modes with missing properties', async () => {
      const testModes = [
        {}, // Empty object
        { name: 'Named Mode' }, // Missing ID
        { id: 'just-id' } // Missing name
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(consoleSpy).toHaveBeenCalledWith('   1. "Unknown" (unknown)');
      expect(consoleSpy).toHaveBeenCalledWith('   2. "Named Mode" (unknown)');
      expect(consoleSpy).toHaveBeenCalledWith('   3. "Unknown" (just-id)');
    });
  });

  describe('Database operations', () => {
    it('should read current settings from database', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));

      const currentSettings = { composerState: { modes4: [] } };
      mockGet.mockReturnValue({ value: JSON.stringify(currentSettings) });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockPrepare).toHaveBeenCalledWith(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);
      expect(mockGet).toHaveBeenCalledWith(CURSOR_SETTINGS_KEY);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Reading current settings...');
    });

    it('should throw error if settings not found in database', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue(undefined);

      await expect(loadModesFromFile('/path/to/db', 'modes.json'))
        .rejects.toThrow(`Settings not found in database. Key: ${CURSOR_SETTINGS_KEY}`);
    });

    it('should throw error if current settings are invalid JSON', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({ value: '{ invalid json }' });

      await expect(loadModesFromFile('/path/to/db', 'modes.json'))
        .rejects.toThrow('Failed to parse current settings:');
    });

    it('should create composerState if it does not exist', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));

      // Settings without composerState
      const currentSettings = { someOtherProperty: 'value' };
      mockGet.mockReturnValue({ value: JSON.stringify(currentSettings) });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockRun).toHaveBeenCalled();
      const updateCall = mockRun.mock.calls[0];
      const updatedSettings = JSON.parse(updateCall[0]);
      expect(updatedSettings).toHaveProperty('composerState');
      expect(updatedSettings.composerState).toHaveProperty('modes4');
    });

    it('should update modes4 in existing composerState', async () => {
      const testModes = [
        { id: 'new1', name: 'New Mode 1' },
        { id: 'new2', name: 'New Mode 2' }
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));

      const currentSettings = {
        composerState: {
          modes4: [{ id: 'old', name: 'Old Mode' }],
          otherProperty: 'keep this'
        },
        otherData: 'preserve this too'
      };
      mockGet.mockReturnValue({ value: JSON.stringify(currentSettings) });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockRun).toHaveBeenCalled();
      const updateCall = mockRun.mock.calls[0];
      const updatedSettings = JSON.parse(updateCall[0]);

      expect(updatedSettings.composerState.modes4).toEqual(testModes);
      expect(updatedSettings.composerState.otherProperty).toBe('keep this');
      expect(updatedSettings.otherData).toBe('preserve this too');
    });

    it('should write updated settings to database', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockPrepare).toHaveBeenCalledWith(`
      UPDATE ItemTable
      SET value = ?
      WHERE key = ?
    `);
      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String), // JSON string of updated settings
        CURSOR_SETTINGS_KEY
      );
      expect(consoleSpy).toHaveBeenCalledWith('💾 Writing updated settings to database...');
    });

    it('should always close database connection', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(mockClose).toHaveBeenCalled();
    });

    it('should close database even if operation fails', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(loadModesFromFile('/path/to/db', 'modes.json'))
        .rejects.toThrow('Database error');

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Success scenarios', () => {
    it('should show success message with count', async () => {
      const testModes = [
        { id: 'mode1', name: 'Mode 1' },
        { id: 'mode2', name: 'Mode 2' },
        { id: 'mode3', name: 'Mode 3' }
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Successfully loaded 3 modes into Cursor database!');
      expect(consoleSpy).toHaveBeenCalledWith('\n⚠️  Important: Restart Cursor to see the changes');
    });

    it('should handle single mode correctly', async () => {
      const testModes = [{ id: 'single', name: 'Single Mode' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      expect(consoleSpy).toHaveBeenCalledWith('✨ Found 1 mode(s) to import');
      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Successfully loaded 1 modes into Cursor database!');
    });
  });

  describe('Database path handling', () => {
    it('should open database with correct path and options', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      const DatabaseConstructor = await import('better-sqlite3');
      const mockDatabaseConstructor = vi.mocked(DatabaseConstructor.default);

      await loadModesFromFile('/custom/path/to/db', 'modes.json');

      expect(mockDatabaseConstructor).toHaveBeenCalledWith('/custom/path/to/db', { readonly: false });
    });
  });

  describe('Console output', () => {
    it('should log all expected steps in order', async () => {
      const testModes = [{ id: 'test', name: 'Test Mode' }];
      mockReadFileSync.mockReturnValue(JSON.stringify(testModes));
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await loadModesFromFile('/path/to/db', 'modes.json');

      const logCalls = consoleSpy.mock.calls.map((call: any) => call[0]);

      expect(logCalls).toContain('📖 Reading modes from modes.json...');
      expect(logCalls).toContain('✨ Found 1 mode(s) to import');
      expect(logCalls).toContain('   1. "Test Mode" (test)');
      expect(logCalls).toContain('\n📖 Opening Cursor database...');
      expect(logCalls).toContain('🔍 Reading current settings...');
      expect(logCalls).toContain('🔄 Updating modes...');
      expect(logCalls).toContain('💾 Writing updated settings to database...');
      expect(logCalls).toContain('\n🎉 Successfully loaded 1 modes into Cursor database!');
      expect(logCalls).toContain('\n⚠️  Important: Restart Cursor to see the changes');
    });
  });
});