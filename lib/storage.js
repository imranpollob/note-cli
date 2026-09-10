"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const APP_NAME = "note";

function getDataDir() {
  if (process.env.NOTE_DIR) {
    return path.resolve(process.env.NOTE_DIR);
  }

  const home = os.homedir();
  const platform = process.platform;
  let base;

  if (platform === "win32") {
    base = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  } else if (platform === "darwin") {
    base = path.join(home, "Library", "Application Support");
  } else {
    base = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
  }

  return path.join(base, APP_NAME);
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getStorePath() {
  if (process.env.NOTES_FILE) {
    const file = path.resolve(process.env.NOTES_FILE);
    ensureDirSync(path.dirname(file));
    return file;
  }

  const dir = getDataDir();
  ensureDirSync(dir);
  return path.join(dir, "notes.json");
}

function readNotes() {
  const file = getStorePath();

  if (!fs.existsSync(file)) {
    return [];
  }

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch (err) {
    throw new Error(`Failed to read notes file at ${file}: ${err.message}`);
  }

  if (!content.trim()) {
    return [];
  }

  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("Notes file content must be a JSON array.");
    }
    return data;
  } catch (err) {
    // Preserve corrupt data by writing a backup before user accidentally overwrites it
    const backupFile = `${file}.corrupt.${Date.now()}`;
    try {
      fs.copyFileSync(file, backupFile);
    } catch {
      // Ignore copy error if backup fails
    }
    throw new Error(
      `Notes storage file (${file}) is corrupted or invalid JSON.\n` +
      `A backup was saved to: ${backupFile}\n` +
      `Original error: ${err.message}`
    );
  }
}

function writeNotes(notes) {
  if (!Array.isArray(notes)) {
    throw new TypeError("Notes to save must be an array.");
  }

  const file = getStorePath();
  const dir = path.dirname(file);
  ensureDirSync(dir);

  const tmp = path.join(dir, `.notes-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(notes, null, 2), "utf8");

  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // Fallback for Windows or cross-device lock issues
    try {
      fs.copyFileSync(tmp, file);
      fs.unlinkSync(tmp);
    } catch (fallbackErr) {
      if (fs.existsSync(tmp)) {
        try { fs.unlinkSync(tmp); } catch { }
      }
      throw new Error(`Failed to save notes to ${file}: ${err.message}`);
    }
  }
}

module.exports = {
  APP_NAME,
  getDataDir,
  getStorePath,
  readNotes,
  writeNotes
};

