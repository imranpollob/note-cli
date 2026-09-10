"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

// Configure isolated test directory before importing modules
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "note-test-"));
process.env.NOTE_DIR = testDir;

const storage = require("../lib/storage");
const notes = require("../lib/notes");
const format = require("../lib/format");
const cli = require("../lib/cli");
const pkg = require("../package.json");

test.beforeEach(() => {
  // Clear notes before each test
  const file = storage.getStorePath();
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});

test.after(() => {
  // Clean up test directory
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch { }
});

test("storage: returns empty array if file does not exist", () => {
  const result = storage.readNotes();
  assert.deepEqual(result, []);
});

test("storage: writes and reads notes successfully", () => {
  const data = [{ title: "Test note", createdAt: new Date().toISOString(), updatedAt: null }];
  storage.writeNotes(data);
  const result = storage.readNotes();
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Test note");
});

test("storage: protects against corrupted JSON and generates backup", () => {
  const file = storage.getStorePath();
  fs.writeFileSync(file, "{ invalid json corrupt content", "utf8");

  assert.throws(
    () => storage.readNotes(),
    /is corrupted or invalid JSON/
  );

  // Check backup file exists
  const files = fs.readdirSync(testDir);
  const backup = files.find((f) => f.includes(".corrupt."));
  assert.ok(backup, "Corrupted backup file should have been created");
});

test("notes: adds note and validates input", () => {
  assert.throws(() => notes.addNote(""), /Cannot add an empty note/);
  assert.throws(() => notes.addNote("   "), /Cannot add an empty note/);

  const note = notes.addNote("Buy groceries");
  assert.equal(note.title, "Buy groceries");
  assert.ok(note.createdAt);
  assert.equal(note.updatedAt, null);

  const all = notes.listNotes();
  assert.equal(all.length, 1);
  assert.equal(all[0].title, "Buy groceries");
});

test("notes: listNotes sorts newest first and supports limit", () => {
  notes.addNote("First note");
  const note2 = {
    title: "Second note",
    createdAt: new Date(Date.now() + 1000).toISOString(),
    updatedAt: null
  };
  const current = storage.readNotes();
  current.push(note2);
  storage.writeNotes(current);

  const list = notes.listNotes();
  assert.equal(list.length, 2);
  assert.equal(list[0].title, "Second note");
  assert.equal(list[1].title, "First note");

  const limited = notes.listNotes({ limit: 1 });
  assert.equal(limited.length, 1);
  assert.equal(limited[0].title, "Second note");
});

test("notes: findNotes preserves global 1-based index", () => {
  notes.addNote("Apple");
  const olderDate = new Date(Date.now() - 5000).toISOString();
  const current = storage.readNotes();
  current.push({ title: "Banana", createdAt: olderDate, updatedAt: null });
  current.push({ title: "Pineapple", createdAt: new Date(Date.now() - 10000).toISOString(), updatedAt: null });
  storage.writeNotes(current);

  // Global sorted list:
  // #1: Apple
  // #2: Banana
  // #3: Pineapple

  const results = notes.findNotes("apple");
  assert.equal(results.length, 2);
  assert.equal(results[0].note.title, "Apple");
  assert.equal(results[0].globalIndex, 1);
  assert.equal(results[1].note.title, "Pineapple");
  assert.equal(results[1].globalIndex, 3);
});

test("notes: editNote updates title and updatedAt timestamp", () => {
  notes.addNote("Initial title");
  const updated = notes.editNote(1, "Updated title");

  assert.equal(updated.title, "Updated title");
  assert.ok(updated.updatedAt);

  const all = notes.listNotes();
  assert.equal(all[0].title, "Updated title");

  assert.throws(() => notes.editNote(99, "Nonexistent"), /Note #99 not found/);
});

test("notes: deleteNote removes correct note", () => {
  notes.addNote("Note A");
  notes.addNote("Note B");

  const deleted = notes.deleteNote(1);
  assert.equal(deleted.title, "Note B"); // newest was #1

  const remaining = notes.listNotes();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].title, "Note A");

  assert.throws(() => notes.deleteNote(5), /Note #5 not found/);
});

test("notes: clearNotes empties all notes", () => {
  notes.addNote("Note 1");
  notes.addNote("Note 2");
  assert.equal(notes.listNotes().length, 2);

  notes.clearNotes();
  assert.equal(notes.listNotes().length, 0);
});

test("format: relative time produces clean output", () => {
  const now = new Date().toISOString();
  assert.equal(format.relTime(now), "just now");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.equal(format.relTime(fiveMinAgo), "5m ago");

  const note = { title: "Hello", createdAt: fiveMinAgo, updatedAt: null };
  assert.equal(format.formatNote(note, 1, false), "#1  Hello  ·  5m ago");
  assert.equal(format.formatNote(note, 3, true), "[#3]  Hello  ·  5m ago");
});

test("cli: outputs version with -v and --version", () => {
  let output = "";
  const originalLog = console.log;
  console.log = (msg) => { output += msg; };

  try {
    cli.run(["-v"]);
    assert.equal(output.trim(), pkg.version);

    output = "";
    cli.run(["--version"]);
    assert.equal(output.trim(), pkg.version);
  } finally {
    console.log = originalLog;
  }
});

test("cli: explicit add and -- avoids keyword collisions", () => {
  cli.run(["add", "clear the table"]);
  cli.run(["--", "find my keys"]);
  const list = notes.listNotes();
  assert.equal(list.length, 2);
  assert.equal(list[0].title, "find my keys");
  assert.equal(list[1].title, "clear the table");
});

test("cli: rm with flags in any order works without prompting", () => {
  notes.addNote("Delete me");
  assert.equal(notes.listNotes().length, 1);

  cli.run(["rm", "-y", "1"]);
  assert.equal(notes.listNotes().length, 0);

  notes.addNote("Delete me too");
  cli.run(["rm", "1", "--yes"]);
  assert.equal(notes.listNotes().length, 0);
});

test("cli: lists with limit flag", () => {
  notes.addNote("Note 1");
  notes.addNote("Note 2");
  notes.addNote("Note 3");

  let lines = [];
  const originalLog = console.log;
  console.log = (msg) => { lines.push(msg); };

  try {
    cli.run(["list", "-n", "2"]);
    assert.equal(lines.length, 2);
  } finally {
    console.log = originalLog;
  }
});

