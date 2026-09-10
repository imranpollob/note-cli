# node-note-cli

[![npm version](https://img.shields.io/npm/v/node-note-cli.svg)](https://www.npmjs.com/package/node-note-cli)
[![license](https://img.shields.io/npm/l/node-note-cli.svg)](https://github.com/imranpollob/note-cli/blob/master/LICENSE)

A lightning-fast, zero-dependency CLI tool for managing personal notes directly from your terminal.

---

## Installation

Install globally via npm:

```bash
npm install -g node-note-cli
```

Or run directly without installing:

```bash
npx node-note-cli
```

---

## Usage

| Command                            | Description                                             |
| :--------------------------------- | :------------------------------------------------------ |
| `note <title...>`                  | Quickly add a note                                      |
| `note add <title...>`              | Explicitly add a note (avoids keyword collisions)       |
| `note`                             | List all notes (newest first)                           |
| `note list -n <count>`             | List the most recent `<count>` notes                    |
| `note find <query>`                | Search notes by substring (displays global `[#index]`)  |
| `note edit <index> <new title...>` | Update note title at specified index                    |
| `note rm <index> [-y]`             | Delete a note (prompts confirmation unless `-y` passed) |
| `note clear [--yes]`               | Delete all notes                                        |
| `note -v, --version`               | Display installed version                               |
| `note -h, --help`                  | Show command usage and options                          |

---

## Examples

### 1. Adding Notes

```bash
note Buy groceries
# Output: Added: Buy groceries

# To add notes starting with commands like 'clear', 'find', etc., use `add`:
note add clear the desk
# Output: Added: clear the desk
```

### 2. Listing Notes

```bash
note
```

Output:
```
#1  clear the desk  ·  just now
#2  Buy groceries  ·  5m ago
#3  Finish weekly report  ·  2d ago
```

Limit displayed notes:
```bash
note list -n 2
```

### 3. Searching Notes

Search results display the note's **global index** in brackets (`[#index]`), making it safe to edit or delete directly:

```bash
note find groceries
```

Output:
```
[#2]  Buy groceries  ·  5m ago
```

### 4. Editing a Note

```bash
note edit 2 Buy groceries and fruits
```

Output:
```
Updated: Buy groceries and fruits
```

### 5. Deleting a Note

```bash
# Interactive confirmation prompt:
note rm 1
# Output: Delete "clear the desk"? (y/N) y
# Output: Deleted: clear the desk

# Or skip prompt with -y / --yes:
note rm 1 -y
# Output: Deleted: Buy groceries and fruits
```

### 6. Clearing All Notes

```bash
note clear --yes
# Output: All notes cleared.
```

---

## Storage & Configuration

By default, notes are stored locally in standard OS data directories:
- **macOS**: `~/Library/Application Support/note/notes.json`
- **Linux**: `~/.local/share/note/notes.json` (respects `$XDG_DATA_HOME`)
- **Windows**: `%APPDATA%\note\notes.json`

### Custom Storage Location

You can customize where notes are stored using environment variables:

```bash
# Use a custom directory:
export NOTE_DIR="$HOME/Dropbox/notes"

# Or point to a specific file:
export NOTES_FILE="$HOME/.my-notes.json"
```

---

## Programmatic API

`node-note-cli` can also be required as a standard Node.js module:

```javascript
const { addNote, listNotes, findNotes, deleteNote } = require("node-note-cli");

// Add note
addNote("Review pull request");

// List notes sorted newest-first
const all = listNotes({ limit: 5 });

// Search notes
const matches = findNotes("review");
```

---

## Development & Testing

Run the automated test suite (uses Node's native test runner, zero dependencies required):

```bash
npm test
```

---

## License

[ISC](LICENSE) © Imran Pollob
