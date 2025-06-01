import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveModesToFile, previewModes } from './save.js';
import * as fs from 'fs';
import { CURSOR_SETTINGS_KEY } from './constants.js';

// Mock better-sqlite3
const mockGet = vi.fn();
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
    writeFileSync: vi.fn()
  };
});

const mockWriteFileSync = vi.mocked(fs.writeFileSync);

describe('saveModesToFile', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to capture output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default mock setup
    mockPrepare.mockReturnValue({
      get: mockGet
    });

    // Reset writeFileSync to not throw by default
    mockWriteFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Database operations', () => {
    it('should open database in readonly mode', async () => {
      const testModes = [{ id: 'test', name: 'Test Mode' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      const DatabaseConstructor = await import('better-sqlite3');
      const mockDatabaseConstructor = vi.mocked(DatabaseConstructor.default);

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockDatabaseConstructor).toHaveBeenCalledWith('/path/to/db', { readonly: true });
    });

    it('should query database with correct SQL and key', async () => {
      const testModes = [{ id: 'test', name: 'Test Mode' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockPrepare).toHaveBeenCalledWith(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);
      expect(mockGet).toHaveBeenCalledWith(CURSOR_SETTINGS_KEY);
    });

    it('should throw error if settings not found in database', async () => {
      mockGet.mockReturnValue(undefined);

      await expect(saveModesToFile('/path/to/db', 'output.json'))
        .rejects.toThrow(`Settings not found in database. Key: ${CURSOR_SETTINGS_KEY}`);
    });

    it('should throw error if settings JSON is invalid', async () => {
      mockGet.mockReturnValue({ value: '{ invalid json }' });

      await expect(saveModesToFile('/path/to/db', 'output.json'))
        .rejects.toThrow('Failed to parse settings JSON:');
    });

    it('should always close database connection', async () => {
      const testModes = [{ id: 'test', name: 'Test Mode' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockClose).toHaveBeenCalled();
    });

    it('should close database even if operation fails', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(saveModesToFile('/path/to/db', 'output.json'))
        .rejects.toThrow('Database error');

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Modes extraction and handling', () => {
    it('should successfully extract and save valid modes', async () => {
      const testModes = [
        { id: 'mode1', name: 'Test Mode 1' },
        { id: 'mode2', name: 'Test Mode 2' }
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify(testModes, null, 2),
        'utf-8'
      );
    });

    it('should handle empty modes array', async () => {
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: [] } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should handle missing modes4 property', async () => {
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: {} })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should handle missing composerState property', async () => {
      mockGet.mockReturnValue({
        value: JSON.stringify({ otherProperty: 'value' })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should handle modes4 being non-array', async () => {
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: 'not an array' } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify([], null, 2),
        'utf-8'
      );
    });

    it('should handle modes with missing properties', async () => {
      const testModes = [
        { id: 'complete', name: 'Complete Mode' },
        { id: 'no-name' }, // Missing name
        { name: 'No ID' }, // Missing ID
        {} // Empty object
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'output.json',
        JSON.stringify(testModes, null, 2),
        'utf-8'
      );
    });
  });

  describe('File writing', () => {
    it('should write file with correct formatting', async () => {
      const testModes = [
        { id: 'test1', name: 'Test 1' },
        { id: 'test2', name: 'Test 2' }
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'custom-output.json');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'custom-output.json',
        JSON.stringify(testModes, null, 2),
        'utf-8'
      );
    });

    it('should throw error if file writing fails', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(saveModesToFile('/path/to/db', 'output.json'))
        .rejects.toThrow('Failed to write file: Permission denied');
    });

    it('should handle non-Error write failures', async () => {
      const testModes = [{ id: 'test', name: 'Test' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });
      mockWriteFileSync.mockImplementation(() => {
        throw 'String error';
      });

      await expect(saveModesToFile('/path/to/db', 'output.json'))
        .rejects.toThrow('Failed to write file: String error');
    });
  });

  describe('Console output and logging', () => {
    it('should display mode information correctly', async () => {
      const testModes = [
        { id: 'mode1', name: 'Cool Mode' },
        { id: 'mode2', name: 'Another Mode' },
        { id: 'mode3' } // Missing name
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(consoleSpy).toHaveBeenCalledWith('   1. "Cool Mode" (mode1)');
      expect(consoleSpy).toHaveBeenCalledWith('   2. "Another Mode" (mode2)');
      expect(consoleSpy).toHaveBeenCalledWith('   3. "Unknown" (mode3)');
    });

    it('should handle modes with missing ID and name', async () => {
      const testModes = [
        {}, // Empty object
        { name: 'Named Mode' }, // Missing ID
        { id: 'just-id' } // Missing name
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(consoleSpy).toHaveBeenCalledWith('   1. "Unknown" (unknown)');
      expect(consoleSpy).toHaveBeenCalledWith('   2. "Named Mode" (unknown)');
      expect(consoleSpy).toHaveBeenCalledWith('   3. "Unknown" (just-id)');
    });

    it('should show warning when no modes found', async () => {
      // This should trigger the warning path - when modes is not an array or undefined
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: {} }) // Missing modes4
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(consoleSpy).toHaveBeenCalledWith('⚠️  No custom modes found in database');
      expect(consoleSpy).toHaveBeenCalledWith('   This might mean:');
      expect(consoleSpy).toHaveBeenCalledWith('   • No custom modes have been created yet');
      expect(consoleSpy).toHaveBeenCalledWith('   • Cursor version doesn\'t support custom modes');
      expect(consoleSpy).toHaveBeenCalledWith('   • Database structure has changed');
    });

    it('should show success message with count and filename', async () => {
      const testModes = [
        { id: 'mode1', name: 'Mode 1' },
        { id: 'mode2', name: 'Mode 2' },
        { id: 'mode3', name: 'Mode 3' }
      ];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'my-modes.json');

      expect(consoleSpy).toHaveBeenCalledWith('✨ Found 3 mode(s)');
      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Successfully saved 3 modes to: my-modes.json');
    });

    it('should handle single mode correctly', async () => {
      const testModes = [{ id: 'single', name: 'Single Mode' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      expect(consoleSpy).toHaveBeenCalledWith('✨ Found 1 mode(s)');
      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Successfully saved 1 modes to: output.json');
    });

    it('should log all expected steps in order', async () => {
      const testModes = [{ id: 'test', name: 'Test Mode' }];
      mockGet.mockReturnValue({
        value: JSON.stringify({ composerState: { modes4: testModes } })
      });

      await saveModesToFile('/path/to/db', 'output.json');

      const logCalls = consoleSpy.mock.calls.map((call: any) => call[0]);

      expect(logCalls).toContain('📖 Opening Cursor database...');
      expect(logCalls).toContain('🔍 Querying for custom modes...');
      expect(logCalls).toContain('📋 Parsing database content...');
      expect(logCalls).toContain('✨ Found 1 mode(s)');
      expect(logCalls).toContain('   1. "Test Mode" (test)');
      expect(logCalls).toContain('💾 Writing modes to output.json...');
      expect(logCalls).toContain('\n🎉 Successfully saved 1 modes to: output.json');
    });
  });
});

describe('previewModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReturnValue({
      get: mockGet
    });
  });

  it('should return modes array from database', async () => {
    const testModes = [
      { id: 'mode1', name: 'Mode 1' },
      { id: 'mode2', name: 'Mode 2' }
    ];
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: { modes4: testModes } })
    });

    const result = await previewModes('/path/to/db');

    expect(result).toEqual(testModes);
  });

  it('should return empty array if no settings found', async () => {
    mockGet.mockReturnValue(undefined);

    const result = await previewModes('/path/to/db');

    expect(result).toEqual([]);
  });

  it('should return empty array if modes4 is missing', async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: {} })
    });

    const result = await previewModes('/path/to/db');

    expect(result).toEqual([]);
  });

  it('should return empty array if modes4 is not an array', async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: { modes4: 'not an array' } })
    });

    const result = await previewModes('/path/to/db');

    expect(result).toEqual([]);
  });

  it('should open database in readonly mode', async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: { modes4: [] } })
    });

    const DatabaseConstructor = await import('better-sqlite3');
    const mockDatabaseConstructor = vi.mocked(DatabaseConstructor.default);

    await previewModes('/custom/path/to/db');

    expect(mockDatabaseConstructor).toHaveBeenCalledWith('/custom/path/to/db', { readonly: true });
  });

  it('should always close database connection', async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: { modes4: [] } })
    });

    await previewModes('/path/to/db');

    expect(mockClose).toHaveBeenCalled();
  });

  it('should close database even if operation fails', async () => {
    mockGet.mockImplementation(() => {
      throw new Error('Database error');
    });

    await expect(previewModes('/path/to/db')).rejects.toThrow('Database error');

    expect(mockClose).toHaveBeenCalled();
  });

  it('should query database with correct SQL and key', async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ composerState: { modes4: [] } })
    });

    await previewModes('/path/to/db');

    expect(mockPrepare).toHaveBeenCalledWith(`
      SELECT value
      FROM ItemTable
      WHERE key = ?
    `);
    expect(mockGet).toHaveBeenCalledWith(CURSOR_SETTINGS_KEY);
  });
});