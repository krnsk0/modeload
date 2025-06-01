import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findCursorDatabase, validateCursorDatabase } from './database.js';
import * as fs from 'fs';
import * as os from 'os';

// Mock fs functions
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  };
});

// Mock os.homedir
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn()
  };
});

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockHomedir = vi.mocked(os.homedir);

describe('findCursorDatabase', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock console.log to avoid noise in tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default home directory
    mockHomedir.mockReturnValue('/home/user');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Custom path scenarios', () => {
    it('should return custom path when it exists', () => {
      const customPath = '/custom/path/to/state.vscdb';
      mockExistsSync.mockReturnValue(true);

      const result = findCursorDatabase(customPath);

      expect(result).toBe(customPath);
      expect(mockExistsSync).toHaveBeenCalledWith(customPath);
    });

    it('should throw error when custom path does not exist', () => {
      const customPath = '/nonexistent/path/to/state.vscdb';
      mockExistsSync.mockReturnValue(false);

      expect(() => findCursorDatabase(customPath)).toThrow(
        `Custom database path not found: ${customPath}`
      );
      expect(mockExistsSync).toHaveBeenCalledWith(customPath);
    });
  });

  describe('Standard path discovery', () => {
    it('should find database at macOS location', () => {
      mockHomedir.mockReturnValue('/Users/testuser');

      // Mock existsSync to return true only for macOS path
      mockExistsSync.mockImplementation((path) =>
        path === '/Users/testuser/Library/Application Support/Cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/Users/testuser/Library/Application Support/Cursor/User/globalStorage/state.vscdb');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Searching for Cursor database...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Found Cursor database at: /Users/testuser/Library/Application Support/Cursor/User/globalStorage/state.vscdb');
    });

    it('should find database at Windows location', () => {
      mockHomedir.mockReturnValue('C:\\Users\\testuser');

      let capturedPath = '';
      // Mock existsSync to capture what path actually gets generated and return true for Windows path
      mockExistsSync.mockImplementation((path) => {
        capturedPath = path as string;
        const pathStr = String(path);
        // Return true for any path containing AppData/Roaming/Cursor
        return pathStr.includes('AppData/Roaming/Cursor') || pathStr.includes('AppData\\Roaming\\Cursor');
      });

      const result = findCursorDatabase();

      // The result should contain the Windows-specific AppData path
      expect(result).toContain('AppData');
      expect(result).toContain('Roaming');
      expect(result).toContain('Cursor');
      expect(result).toContain('C:\\Users\\testuser');
    });

    it('should find database at Linux standard location', () => {
      mockHomedir.mockReturnValue('/home/testuser');

      // Mock existsSync to return true only for Linux standard path
      mockExistsSync.mockImplementation((path) =>
        path === '/home/testuser/.config/Cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/home/testuser/.config/Cursor/User/globalStorage/state.vscdb');
    });

    it('should find database at Linux alternative location', () => {
      mockHomedir.mockReturnValue('/home/testuser');

      // Mock existsSync to return true only for Linux alternative path
      mockExistsSync.mockImplementation((path) =>
        path === '/home/testuser/.cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/home/testuser/.cursor/User/globalStorage/state.vscdb');
    });

    it('should find database at snap location', () => {
      mockHomedir.mockReturnValue('/home/testuser');

      // Mock existsSync to return true only for snap path
      mockExistsSync.mockImplementation((path) =>
        path === '/home/testuser/snap/cursor/current/.config/Cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/home/testuser/snap/cursor/current/.config/Cursor/User/globalStorage/state.vscdb');
    });

    it('should find database at local share location', () => {
      mockHomedir.mockReturnValue('/home/testuser');

      // Mock existsSync to return true only for local share path
      mockExistsSync.mockImplementation((path) =>
        path === '/home/testuser/.local/share/Cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/home/testuser/.local/share/Cursor/User/globalStorage/state.vscdb');
    });

    it('should return first found path when multiple exist', () => {
      mockHomedir.mockReturnValue('/home/testuser');

      // Mock existsSync to return true for both macOS and Windows paths
      // Should return the first one found (macOS in the order)
      mockExistsSync.mockImplementation((path) =>
        path === '/home/testuser/Library/Application Support/Cursor/User/globalStorage/state.vscdb' ||
        path === '/home/testuser/AppData/Roaming/Cursor/User/globalStorage/state.vscdb'
      );

      const result = findCursorDatabase();

      expect(result).toBe('/home/testuser/Library/Application Support/Cursor/User/globalStorage/state.vscdb');
    });
  });

  describe('Database not found scenarios', () => {
    it('should throw detailed error when no database found', () => {
      mockHomedir.mockReturnValue('/home/testuser');
      mockExistsSync.mockReturnValue(false);

      expect(() => findCursorDatabase()).toThrow();

      // Check that the error contains helpful information
      try {
        findCursorDatabase();
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Cursor database not found');
        expect(errorMessage).toContain('Library/Application Support/Cursor');
        expect(errorMessage).toContain('AppData/Roaming/Cursor');
        expect(errorMessage).toContain('.config/Cursor');
        expect(errorMessage).toContain('--db-path');
        expect(errorMessage).toContain('modeload save modes.json');
      }
    });

    it('should log search progress when database not found', () => {
      mockHomedir.mockReturnValue('/home/testuser');
      mockExistsSync.mockReturnValue(false);

      expect(() => findCursorDatabase()).toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('🔍 Searching for Cursor database...');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Checking:'));
    });
  });

  describe('Console logging', () => {
    it('should log all checked paths', () => {
      mockHomedir.mockReturnValue('/home/testuser');
      mockExistsSync.mockReturnValue(false);

      expect(() => findCursorDatabase()).toThrow();

      // Should log each path being checked
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/home/testuser/Library/Application Support/Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/home/testuser/AppData/Roaming/Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/home/testuser/.config/Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/home/testuser/.cursor/User'));
    });
  });
});

describe('validateCursorDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File existence validation', () => {
    it('should return false when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateCursorDatabase('/nonexistent/path.db');

      expect(result).toBe(false);
      expect(mockExistsSync).toHaveBeenCalledWith('/nonexistent/path.db');
    });
  });

  describe('SQLite header validation', () => {
    it('should return true for valid SQLite file', () => {
      mockExistsSync.mockReturnValue(true);

      // Create a buffer that starts with "SQLite format 3"
      const validSQLiteHeader = Buffer.from('SQLite format 3\0additional data...');
      mockReadFileSync.mockReturnValue(validSQLiteHeader);

      const result = validateCursorDatabase('/valid/path.db');

      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/valid/path.db');
      expect(mockReadFileSync).toHaveBeenCalledWith('/valid/path.db', { encoding: null });
    });

    it('should return false for invalid SQLite file', () => {
      mockExistsSync.mockReturnValue(true);

      // Create a buffer that does not start with "SQLite format 3"
      const invalidHeader = Buffer.from('Not a SQLite file');
      mockReadFileSync.mockReturnValue(invalidHeader);

      const result = validateCursorDatabase('/invalid/path.db');

      expect(result).toBe(false);
    });

    it('should return false for empty file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.alloc(0));

      const result = validateCursorDatabase('/empty/path.db');

      expect(result).toBe(false);
    });

    it('should return false for file shorter than header', () => {
      mockExistsSync.mockReturnValue(true);

      // Create a buffer shorter than the expected header
      const shortBuffer = Buffer.from('Short');
      mockReadFileSync.mockReturnValue(shortBuffer);

      const result = validateCursorDatabase('/short/path.db');

      expect(result).toBe(false);
    });

    it('should handle file read errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = validateCursorDatabase('/error/path.db');

      expect(result).toBe(false);
    });

    it('should handle permission errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        const error = new Error('Permission denied');
        (error as any).code = 'EACCES';
        throw error;
      });

      const result = validateCursorDatabase('/permission/path.db');

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle SQLite header at exact boundary', () => {
      mockExistsSync.mockReturnValue(true);

      // Create a buffer with exactly "SQLite format 3" (15 characters)
      const exactHeader = Buffer.from('SQLite format 3');
      mockReadFileSync.mockReturnValue(exactHeader);

      const result = validateCursorDatabase('/exact/path.db');

      expect(result).toBe(true);
    });

    it('should handle case sensitivity correctly', () => {
      mockExistsSync.mockReturnValue(true);

      // Test with different case
      const wrongCaseHeader = Buffer.from('sqlite format 3');
      mockReadFileSync.mockReturnValue(wrongCaseHeader);

      const result = validateCursorDatabase('/case/path.db');

      expect(result).toBe(false);
    });

    it('should handle binary data after header', () => {
      mockExistsSync.mockReturnValue(true);

      // Create a buffer with SQLite header followed by binary data
      const headerWithBinary = Buffer.concat([
        Buffer.from('SQLite format 3'),
        Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE])
      ]);
      mockReadFileSync.mockReturnValue(headerWithBinary);

      const result = validateCursorDatabase('/binary/path.db');

      expect(result).toBe(true);
    });
  });
});