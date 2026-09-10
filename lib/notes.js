"use strict";

const storage = require("./storage");

function getSortedNotes() {
  const notes = storage.readNotes();
  return notes
    .map((note, originalIndex) => ({ note, originalIndex }))
    .sort((a, b) => {
      const diff = new Date(b.note.createdAt).getTime() - new Date(a.note.createdAt).getTime();
      if (diff !== 0) return diff;
      return b.originalIndex - a.originalIndex; // later added note comes first
    })
    .map(item => item.note);
}

function addNote(title) {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) {
    throw new Error("Cannot add an empty note.");
  }

  const now = new Date().toISOString();
  const note = {
    title: cleanTitle,
    createdAt: now,
    updatedAt: null
  };

  const notes = storage.readNotes();
  notes.push(note);
  storage.writeNotes(notes);
  return note;
}

function listNotes({ limit } = {}) {
  const notes = getSortedNotes();
  if (limit && Number.isInteger(limit) && limit > 0) {
    return notes.slice(0, limit);
  }
  return notes;
}

function findNotes(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    throw new Error("Please provide a search query.");
  }

  const sortedNotes = getSortedNotes();
  const results = [];

  sortedNotes.forEach((note, idx) => {
    if (note.title.toLowerCase().includes(q)) {
      results.push({
        note,
        globalIndex: idx + 1
      });
    }
  });

  return results;
}

function resolveByIndex(indexArg, sortedNotes) {
  const idx = Number(indexArg);
  if (!Number.isInteger(idx) || idx < 1 || idx > sortedNotes.length) {
    return null;
  }
  return {
    note: sortedNotes[idx - 1],
    indexInSorted: idx - 1
  };
}

function editNote(indexArg, newTitle) {
  const cleanTitle = (newTitle || "").trim();
  if (!cleanTitle) {
    throw new Error("Please provide a new note title.");
  }

  const sortedNotes = getSortedNotes();
  const resolved = resolveByIndex(indexArg, sortedNotes);
  if (!resolved) {
    throw new Error(`Note #${indexArg} not found.`);
  }

  const { note } = resolved;
  note.title = cleanTitle;
  note.updatedAt = new Date().toISOString();

  storage.writeNotes(sortedNotes);
  return note;
}

function deleteNote(indexArg) {
  const sortedNotes = getSortedNotes();
  const resolved = resolveByIndex(indexArg, sortedNotes);
  if (!resolved) {
    throw new Error(`Note #${indexArg} not found.`);
  }

  const { note, indexInSorted } = resolved;
  sortedNotes.splice(indexInSorted, 1);
  storage.writeNotes(sortedNotes);
  return note;
}

function clearNotes() {
  storage.writeNotes([]);
}

module.exports = {
  getSortedNotes,
  addNote,
  listNotes,
  findNotes,
  editNote,
  deleteNote,
  clearNotes
};

