"use strict";

const readline = require("readline");
const path = require("path");
const notes = require("./notes");
const format = require("./format");
const pkg = require("../package.json");

const COMMANDS = new Set([
  "add",
  "list",
  "find",
  "search",
  "edit",
  "rm",
  "del",
  "delete",
  "clear",
  "help",
  "--help",
  "-h",
  "--version",
  "-v",
  "--"
]);

function showHelp() {
  console.log(
    `note - a tiny notes CLI (v${pkg.version})\n\n` +
    "Usage:\n" +
    "  note <title...>             Add a note (shortcut)\n" +
    "  note add <title...>         Add a note (explicit, avoids keyword collisions)\n" +
    "  note                        List all notes (newest first)\n" +
    "  note list [-n <limit>]      List notes with optional limit\n" +
    "  note find|search <query>    Search notes by substring\n" +
    "  note edit <index> <title>   Edit a note by index\n" +
    "  note rm|del <index> [-y]    Delete a note\n" +
    "  note clear [--yes]          Delete all notes\n" +
    "  note -v, --version          Show version\n" +
    "  note -h, --help             Show this help message\n\n" +
    "Tips:\n" +
    "  - In search results, [#index] shows the note number to use with 'note rm <index>' or 'note edit <index>'.\n" +
    "  - Set NOTE_DIR or NOTES_FILE env variable to customize storage location.\n"
  );
}

function promptConfirmation(question, onConfirm, onAbort) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(question, (answer) => {
    rl.close();
    const clean = (answer || "").trim().toLowerCase();
    if (clean === "y" || clean === "yes") {
      onConfirm();
    } else {
      if (onAbort) onAbort();
      else console.log("Aborted.");
    }
  });
}

function parseLimit(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" || args[i] === "--limit") {
      const val = Number(args[i + 1]);
      if (Number.isInteger(val) && val > 0) {
        return val;
      }
    }
  }
  return undefined;
}

function run(args = []) {
  if (args.length === 0) {
    const list = notes.listNotes();
    if (!list.length) {
      console.log("No notes.");
      return;
    }
    list.forEach((n, idx) => {
      console.log(format.formatNote(n, idx + 1, false));
    });
    return;
  }

  const cmd = args[0];

  // Version
  if (cmd === "-v" || cmd === "--version" || args.includes("--version")) {
    console.log(pkg.version);
    return;
  }

  // Help
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    showHelp();
    return;
  }

  // List
  if (cmd === "list") {
    const limit = parseLimit(args.slice(1));
    const list = notes.listNotes({ limit });
    if (!list.length) {
      console.log("No notes.");
      return;
    }
    list.forEach((n, idx) => {
      console.log(format.formatNote(n, idx + 1, false));
    });
    return;
  }

  // Explicit Add (or escaped with --)
  if (cmd === "add" || cmd === "--") {
    const title = args.slice(1).join(" ").trim();
    if (!title) {
      console.error("Please provide a note title: note add <title...>");
      process.exitCode = 1;
      return;
    }
    try {
      const added = notes.addNote(title);
      console.log("Added:", added.title);
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
    return;
  }

  // Find / Search
  if (cmd === "find" || cmd === "search") {
    const q = args.slice(1).join(" ").trim();
    if (!q) {
      console.error("Please provide a search query.");
      process.exitCode = 1;
      return;
    }
    try {
      const results = notes.findNotes(q);
      if (!results.length) {
        console.log(`No notes found matching "${q}".`);
        return;
      }
      results.forEach(({ note, globalIndex }) => {
        console.log(format.formatNote(note, globalIndex, true));
      });
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
    return;
  }

  // Edit
  if (cmd === "edit") {
    const remaining = args.slice(1);
    const indexArg = remaining[0];
    const newTitle = remaining.slice(1).join(" ").trim();

    if (!indexArg || !newTitle) {
      console.error("Usage: note edit <index> <new title...>");
      process.exitCode = 1;
      return;
    }

    try {
      const updated = notes.editNote(indexArg, newTitle);
      console.log("Updated:", updated.title);
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
    return;
  }

  // Delete / Remove
  if (cmd === "rm" || cmd === "del" || cmd === "delete") {
    const flags = new Set(["-y", "--yes"]);
    const nonFlags = [];
    let confirmed = false;

    for (const arg of args.slice(1)) {
      if (flags.has(arg)) {
        confirmed = true;
      } else {
        nonFlags.push(arg);
      }
    }

    const indexArg = nonFlags[0];
    if (!indexArg) {
      console.error("Usage: note rm <index> [--yes]");
      process.exitCode = 1;
      return;
    }

    const sorted = notes.getSortedNotes();
    const idx = Number(indexArg);
    if (!Number.isInteger(idx) || idx < 1 || idx > sorted.length) {
      console.error("Note not found.");
      process.exitCode = 1;
      return;
    }

    const target = sorted[idx - 1];

    if (confirmed) {
      notes.deleteNote(indexArg);
      console.log("Deleted:", target.title);
      return;
    }

    promptConfirmation(
      `Delete "${target.title}"? (y/N) `,
      () => {
        notes.deleteNote(indexArg);
        console.log("Deleted:", target.title);
      },
      () => {
        console.log("Aborted.");
      }
    );
    return;
  }

  // Clear
  if (cmd === "clear") {
    const confirmed = args.includes("--yes") || args.includes("-y");
    if (!confirmed) {
      console.log("This will delete all notes. Run again with --yes flag to confirm.");
      process.exitCode = 1;
      return;
    }
    notes.clearNotes();
    console.log("All notes cleared.");
    return;
  }

  // Default shortcut: treat arguments as a note title
  if (!COMMANDS.has(cmd)) {
    const title = args.join(" ").trim();
    if (!title) {
      console.error("Cannot add empty note.");
      process.exitCode = 1;
      return;
    }
    try {
      const added = notes.addNote(title);
      console.log("Added:", added.title);
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
    return;
  }

  showHelp();
}

module.exports = {
  run,
  showHelp,
  COMMANDS
};

