import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main } from './main.js';
import * as readline from 'readline';

// Mock all the imported modules
vi.mock('./database.js', () => ({
  findCursorDatabase: vi.fn(),
  validateCursorDatabase: vi.fn()
}));

vi.mock('./arg-parser.js', () => ({
  parseArgs: vi.fn(),
  showHelp: vi.fn(),
  showVersion: vi.fn()
}));

vi.mock('./save.js', () => ({
  saveModesToFile: vi.fn()
}));

vi.mock('./load.js', () => ({
  loadModesFromFile: vi.fn()
}));

vi.mock('readline', () => ({
  createInterface: vi.fn()
}));

// Import the mocked functions for type safety
import { findCursorDatabase, validateCursorDatabase } from './database.js';
import { parseArgs, showHelp, showVersion } from './arg-parser.js';
import { saveModesToFile } from './save.js';
import { loadModesFromFile } from './load.js';

const mockFindCursorDatabase = vi.mocked(findCursorDatabase);
const mockValidateCursorDatabase = vi.mocked(validateCursorDatabase);
const mockParseArgs = vi.mocked(parseArgs);
const mockShowHelp = vi.mocked(showHelp);
const mockShowVersion = vi.mocked(showVersion);
const mockSaveModesToFile = vi.mocked(saveModesToFile);
const mockLoadModesFromFile = vi.mocked(loadModesFromFile);
const mockCreateInterface = vi.mocked(readline.createInterface);

describe('main', () => {
  let consoleSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Default mock setup
    mockFindCursorDatabase.mockReturnValue('/path/to/db');
    mockValidateCursorDatabase.mockReturnValue(true);

    // Mock save and load functions to resolve successfully by default
    mockSaveModesToFile.mockResolvedValue(undefined);
    mockLoadModesFromFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Help and version commands', () => {
    it('should show help when help argument is provided', async () => {
      mockParseArgs.mockReturnValue({
        help: true,
        version: false,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false
      });

      await main();

      expect(mockShowHelp).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith('🚀 Modeload - Cursor Custom Modes Tool\n');
    });

    it('should show version when version argument is provided', async () => {
      mockParseArgs.mockReturnValue({
        version: true,
        help: false,
        command: undefined,
        filename: undefined,
        dbPath: undefined,
        yes: false
      });

      await main();

      expect(mockShowVersion).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith('🚀 Modeload - Cursor Custom Modes Tool\n');
    });
  });

  describe('Database discovery and validation', () => {
    it('should discover and validate database for save command', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });

      await main();

      expect(mockFindCursorDatabase).toHaveBeenCalledWith(undefined);
      expect(mockValidateCursorDatabase).toHaveBeenCalledWith('/path/to/db');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Discovering Cursor database...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Found valid Cursor database\n');
    });

    it('should use custom database path when provided', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        dbPath: '/custom/path/to/db',
        version: false,
        help: false,
        yes: false
      });

      await main();

      expect(mockFindCursorDatabase).toHaveBeenCalledWith('/custom/path/to/db');
    });

    it('should throw error if database validation fails', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });
      mockValidateCursorDatabase.mockReturnValue(false);

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Database validation failed - not a valid SQLite file');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should display database and file information', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'test-output.json',
        version: false,
        help: false,
        yes: false
      });

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('📍 Database: /path/to/db');
      expect(consoleSpy).toHaveBeenCalledWith('📄 File: test-output.json');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ Command: save\n');
    });
  });

  describe('Save command handling', () => {
    it('should execute save command successfully', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('💾 Exporting custom modes to output.json...\n');
      expect(mockSaveModesToFile).toHaveBeenCalledWith('/path/to/db', 'output.json');
    });

    it('should handle save command errors', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });
      mockSaveModesToFile.mockRejectedValue(new Error('Save failed'));

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Save failed: Save failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error save failures', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });
      mockSaveModesToFile.mockRejectedValue('String error');

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Save failed: String error');
    });
  });

  describe('Load command handling', () => {
    it('should execute load command with confirmation', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'input.json',
        version: false,
        help: false,
        yes: false
      });

      // Mock readline for confirmation
      const mockQuestion = vi.fn((prompt, callback) => {
        callback('y');
      });
      const mockClose = vi.fn();
      mockCreateInterface.mockReturnValue({
        question: mockQuestion,
        close: mockClose
      } as any);

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('📥 Importing custom modes from input.json...\n');
      expect(consoleSpy).toHaveBeenCalledWith('🚨 IMPORTANT WARNING:');
      expect(consoleSpy).toHaveBeenCalledWith('   Cursor MUST be completely closed before running this command!');
      expect(mockQuestion).toHaveBeenCalledWith(
        'Are you sure Cursor is closed and you want to proceed? (y/N): ',
        expect.any(Function)
      );
      expect(mockLoadModesFromFile).toHaveBeenCalledWith('/path/to/db', 'input.json');
    });

    it('should skip confirmation with --yes flag', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'input.json',
        yes: true,
        version: false,
        help: false
      });

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('⚡ Skipping confirmation (auto-confirm enabled)\n');
      expect(mockCreateInterface).not.toHaveBeenCalled();
      expect(mockLoadModesFromFile).toHaveBeenCalledWith('/path/to/db', 'input.json');
    });

    it('should cancel load command when user says no', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'input.json',
        version: false,
        help: false,
        yes: false
      });

      // Mock readline for rejection
      const mockQuestion = vi.fn((prompt, callback) => {
        callback('n');
      });
      const mockClose = vi.fn();
      mockCreateInterface.mockReturnValue({
        question: mockQuestion,
        close: mockClose
      } as any);

      await main();

      expect(consoleSpy).toHaveBeenCalledWith('❌ Operation cancelled by user');
      expect(mockLoadModesFromFile).not.toHaveBeenCalled();
    });

    it('should handle various confirmation responses', async () => {
      const testCases = [
        { input: 'yes', shouldProceed: true },
        { input: 'Y', shouldProceed: true },
        { input: 'YES', shouldProceed: true },
        { input: 'no', shouldProceed: false },
        { input: 'N', shouldProceed: false },
        { input: '', shouldProceed: false },
        { input: 'maybe', shouldProceed: false }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        mockParseArgs.mockReturnValue({
          command: 'load',
          filename: 'input.json',
          version: false,
          help: false,
          yes: false
        });

        const mockQuestion = vi.fn((prompt, callback) => {
          callback(testCase.input);
        });
        const mockClose = vi.fn();
        mockCreateInterface.mockReturnValue({
          question: mockQuestion,
          close: mockClose
        } as any);

        await main();

        if (testCase.shouldProceed) {
          expect(mockLoadModesFromFile).toHaveBeenCalled();
        } else {
          expect(consoleSpy).toHaveBeenCalledWith('❌ Operation cancelled by user');
          expect(mockLoadModesFromFile).not.toHaveBeenCalled();
        }
      }
    });

    it('should handle load command errors', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'input.json',
        yes: true,
        version: false,
        help: false
      });
      mockLoadModesFromFile.mockRejectedValue(new Error('Load failed'));

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Load failed: Load failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error load failures', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'input.json',
        yes: true,
        version: false,
        help: false
      });
      mockLoadModesFromFile.mockRejectedValue('String error');

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Load failed: String error');
    });
  });

  describe('Error handling', () => {
    it('should handle unknown commands', async () => {
      mockParseArgs.mockReturnValue({
        command: 'unknown' as any,
        filename: 'test.json',
        version: false,
        help: false,
        yes: false
      });

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Unknown command: unknown');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle parsing errors', async () => {
      mockParseArgs.mockImplementation(() => {
        throw new Error('Invalid arguments');
      });

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Invalid arguments');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle database discovery errors', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'output.json',
        version: false,
        help: false,
        yes: false
      });
      mockFindCursorDatabase.mockImplementation(() => {
        throw new Error('Database not found');
      });

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Database not found');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error exceptions', async () => {
      mockParseArgs.mockImplementation(() => {
        throw 'String error';
      });

      await expect(main()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'String error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Complete workflow', () => {
    it('should execute complete save workflow', async () => {
      mockParseArgs.mockReturnValue({
        command: 'save',
        filename: 'my-modes.json',
        dbPath: '/custom/path',
        version: false,
        help: false,
        yes: false
      });

      await main();

      const logCalls = consoleSpy.mock.calls.map((call: any) => call[0]);

      expect(logCalls).toContain('🚀 Modeload - Cursor Custom Modes Tool\n');
      expect(logCalls).toContain('🔍 Discovering Cursor database...');
      expect(logCalls).toContain('✅ Found valid Cursor database\n');
      expect(logCalls).toContain('📍 Database: /path/to/db');
      expect(logCalls).toContain('📄 File: my-modes.json');
      expect(logCalls).toContain('⚡ Command: save\n');
      expect(logCalls).toContain('💾 Exporting custom modes to my-modes.json...\n');

      expect(mockFindCursorDatabase).toHaveBeenCalledWith('/custom/path');
      expect(mockSaveModesToFile).toHaveBeenCalledWith('/path/to/db', 'my-modes.json');
    });

    it('should execute complete load workflow with confirmation', async () => {
      mockParseArgs.mockReturnValue({
        command: 'load',
        filename: 'import-modes.json',
        version: false,
        help: false,
        yes: false
      });

      const mockQuestion = vi.fn((prompt, callback) => {
        callback('yes');
      });
      const mockClose = vi.fn();
      mockCreateInterface.mockReturnValue({
        question: mockQuestion,
        close: mockClose
      } as any);

      await main();

      const logCalls = consoleSpy.mock.calls.map((call: any) => call[0]);

      expect(logCalls).toContain('🚀 Modeload - Cursor Custom Modes Tool\n');
      expect(logCalls).toContain('📥 Importing custom modes from import-modes.json...\n');
      expect(logCalls).toContain('🚨 IMPORTANT WARNING:');
      expect(logCalls).toContain('   Cursor MUST be completely closed before running this command!');

      expect(mockLoadModesFromFile).toHaveBeenCalledWith('/path/to/db', 'import-modes.json');
    });
  });
});

describe('promptConfirmation', () => {
  // Since promptConfirmation is not exported, we test it through the main function
  // The specific prompt behavior is already tested in the load command tests above

  it('should handle readline interface creation and cleanup', async () => {
    mockParseArgs.mockReturnValue({
      command: 'load',
      filename: 'input.json',
      version: false,
      help: false,
      yes: false
    });

    const mockQuestion = vi.fn((prompt, callback) => {
      callback('y');
    });
    const mockClose = vi.fn();
    mockCreateInterface.mockReturnValue({
      question: mockQuestion,
      close: mockClose
    } as any);

    await main();

    expect(mockCreateInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stdout
    });
    expect(mockClose).toHaveBeenCalled();
  });
});