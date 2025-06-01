import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCliArgs } from './cli-schema.js';
import * as fs from 'fs';

// Mock fs.existsSync for database path testing
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn()
  };
});

const mockExistsSync = vi.mocked(fs.existsSync);

describe('validateCliArgs', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('Help schema validation', () => {
    it('should validate help command with all required fields', () => {
      const input = {
        help: true,
        version: false,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual(input);
    });

    it('should validate help command with minimal fields (using defaults)', () => {
      const input = {
        help: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        help: true,
        version: false, // default
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false // default
      });
    });

    it('should reject help command with invalid help value', () => {
      const input = {
        help: false, // should be true for help schema
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should reject help command with defined command', () => {
      const input = {
        help: true,
        command: 'save', // should be undefined for help schema
        filename: undefined,
        dbPath: undefined
      };

      expect(() => validateCliArgs(input)).toThrow();
    });
  });

  describe('Version schema validation', () => {
    it('should validate version command with all required fields', () => {
      const input = {
        version: true,
        help: false,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual(input);
    });

    it('should validate version command with minimal fields (using defaults)', () => {
      const input = {
        version: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        version: true,
        help: false, // default
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false // default
      });
    });

    it('should reject version command with invalid version value', () => {
      const input = {
        version: false, // should be true for version schema
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      expect(() => validateCliArgs(input)).toThrow();
    });
  });

  describe('CLI args schema validation (save/load commands)', () => {
    beforeEach(() => {
      // Mock existsSync to return true for valid database paths
      mockExistsSync.mockReturnValue(true);
    });

    it('should validate save command with valid filename', () => {
      const input = {
        command: 'save',
        filename: 'modes.json',
        help: false,
        version: false,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        ...input,
        dbPath: undefined // optional field
      });
    });

    it('should validate load command with valid filename', () => {
      const input = {
        command: 'load',
        filename: 'backup.json',
        help: false,
        version: false,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        ...input,
        dbPath: undefined
      });
    });

    it('should validate command with valid database path', () => {
      const input = {
        command: 'save',
        filename: 'modes.json',
        dbPath: '/path/to/database.db',
        help: false,
        version: false,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual(input);
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/database.db');
    });

    it('should validate command with yes flag', () => {
      const input = {
        command: 'load',
        filename: 'modes.json',
        help: false,
        version: false,
        yes: true
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        ...input,
        dbPath: undefined
      });
    });

    it('should reject invalid command', () => {
      const input = {
        command: 'invalid',
        filename: 'modes.json',
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should reject filename without .json extension', () => {
      const input = {
        command: 'save',
        filename: 'modes.txt',
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should reject empty filename', () => {
      const input = {
        command: 'save',
        filename: '',
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should reject filename that is not a string', () => {
      const input = {
        command: 'save',
        filename: 123,
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should reject database path that does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const input = {
        command: 'save',
        filename: 'modes.json',
        dbPath: '/nonexistent/path.db',
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
      expect(mockExistsSync).toHaveBeenCalledWith('/nonexistent/path.db');
    });

    it('should reject empty database path', () => {
      const input = {
        command: 'save',
        filename: 'modes.json',
        dbPath: '',
        help: false,
        version: false,
        yes: false
      };

      expect(() => validateCliArgs(input)).toThrow();
    });
  });

  describe('Schema union behavior', () => {
    it('should prioritize help schema when multiple schemas could match', () => {
      // This input could potentially match multiple schemas
      const input = {
        help: true,
        version: false,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false
      };

      const result = validateCliArgs(input);
      expect(result).toEqual(input);
    });

    it('should handle completely invalid input', () => {
      const input = {
        invalidField: 'invalid',
        anotherInvalid: 123
      };

      expect(() => validateCliArgs(input)).toThrow();
    });

    it('should handle null input', () => {
      expect(() => validateCliArgs(null)).toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => validateCliArgs(undefined)).toThrow();
    });

    it('should handle string input', () => {
      expect(() => validateCliArgs('invalid')).toThrow();
    });

    it('should handle array input', () => {
      expect(() => validateCliArgs(['invalid'])).toThrow();
    });
  });

  describe('Default value behavior', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it('should apply defaults for CLI args schema', () => {
      const input = {
        command: 'save',
        filename: 'modes.json'
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        command: 'save',
        filename: 'modes.json',
        dbPath: undefined,
        help: false, // default
        version: false, // default
        yes: false // default
      });
    });

    it('should apply defaults for help schema', () => {
      const input = {
        help: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        help: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        version: false, // default
        yes: false // default
      });
    });

    it('should apply defaults for version schema', () => {
      const input = {
        version: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined
      };

      const result = validateCliArgs(input);
      expect(result).toEqual({
        version: true,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        help: false, // default
        yes: false // default
      });
    });
  });
});