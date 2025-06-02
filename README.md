# modeload

As of June 2025, Cursor IDE does not expose a means to programatically configure custom modes, commit mode configs to VCS, etc. This tool small CLI tool allows saving and loading Cursor custom modes as JSON files, and will be maintained until Cursor supports this natively.

Cursor also limits the user to 5 custom modes. This tool allows bypassing this limit.

## Installation

```bash
npm install -g modeload
```

## Usage

### Save your current modes to a file
```bash
modeload save modes.json
```

**👀 NOTE:** Cursor must be completely closed when loading modes, or it _most likely_ will not pick up any changes made by this tool.


### Load modes from a file
```bash
modeload load modes.json
```

## How does this work?
Cursor persists its settings to an SQLite database. This tool reads and writes to this database to save and load modes. Cursor / VSCode appear to only read from this database when the app is opened, so this tool must be run before opening Cursor to ensure the modes are loaded.


## ⚠️ Important Disclaimers

### Use at Your Own Risk
**This tool does not validate your modes files.** If you load a malformed or incompatible modes file that breaks Cursor, that's on you. We recommend:

- **Edit modes in the Cursor Modes UI** - use the built-in interface for creating and modifying modes
- **Use this tool primarily for backup** - save your working modes before making changes to them, should you choose to edit them manually

### No Validation by Design
This tool intentionally does **no validation** of modes files to keep it maximally decoupled from changes to Cursor's internal format. This means:

- The tool will load any JSON array, regardless of content
- Mode compatibility is entirely dependent on your Cursor version
- Future Cursor updates may change the modes format


## Future

We hope this tool becomes unnecessary when Cursor officially adopts a `modes.json` configuration file format, making mode management a native feature.
