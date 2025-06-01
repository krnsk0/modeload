# modeload

A simple CLI tool to save and load Cursor custom modes as JSON files.

## Installation

```bash
npm install -g modeload
```

## Usage

### Save your current modes to a file
```bash
modeload save modes.json
```

### Load modes from a file
```bash
modeload load modes.json
```

**⚠️ IMPORTANT:** Cursor must be completely closed when loading modes, or it will _probably_ not work.


## ⚠️ Important Disclaimers

### Use at Your Own Risk
**This tool does not validate your modes files.** If you load a malformed or incompatible modes file that breaks Cursor, that's on you. We recommend:

1. **Edit modes in the Cursor Modes UI** - use the built-in interface for creating and modifying modes
2. **Use this tool primarily for backup** - save your working modes before making changes
3. **Test carefully** - always backup your working modes before loading new ones

### No Validation by Design
This tool intentionally does **no validation** of modes files to keep it maximally decoupled from changes to Cursor's internal format. This means:

- The tool will load any JSON array, regardless of content
- Mode compatibility is entirely dependent on your Cursor version
- Future Cursor updates may change the modes format


## Future

We hope this tool becomes unnecessary when Cursor officially adopts a `modes.json` configuration file format, making mode management a native feature.
