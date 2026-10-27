import { describe, expect, it } from "vitest";
import { AudioLibrary } from "../../src/audio/AudioLibrary";

function makeFile(name: string, contents = "audio", type = "audio/wav"): File {
  return new File([contents], name, { type });
}

describe("AudioLibrary", () => {
  it("creates a distinct entry for every selection occurrence", () => {
    let nextId = 0;
    const library = new AudioLibrary(() => `track-${++nextId}`);
    const file = makeFile("same.wav");

    const first = library.importFiles([file])[0];
    const second = library.importFiles([file])[0];

    expect(first?.id).not.toBe(second?.id);
    expect(library.getEntries()).toHaveLength(2);
  });

  it("keeps distinct files with the same filename as separate entries", () => {
    const library = new AudioLibrary(() => crypto.randomUUID());

    const entries = library.importFiles([
      makeFile("same.wav", "one"),
      makeFile("same.wav", "two"),
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).not.toBe(entries[1]?.id);
    expect(entries.map(({ displayName }) => displayName)).toEqual([
      "same.wav",
      "same.wav",
    ]);
  });

  it("removes only the requested duplicate entry", () => {
    const library = new AudioLibrary(() => crypto.randomUUID());
    const entries = library.importFiles([
      makeFile("same.wav", "one"),
      makeFile("same.wav", "two"),
    ]);

    expect(library.remove(entries[0]!.id)).toBe(true);
    expect(library.getEntries()).toEqual([entries[1]]);
  });

  it("categorizes a zero-byte audio file as unreadable", () => {
    const library = new AudioLibrary(() => crypto.randomUUID());

    const [entry] = library.importFiles([makeFile("empty.wav", "")]);

    expect(entry?.state).toBe("unreadable");
    expect(entry?.objectUrl).toBeNull();
  });

  it("treats an empty selection as picker cancellation without mutation", () => {
    const library = new AudioLibrary(() => crypto.randomUUID());
    library.importFiles([makeFile("kept.wav")]);
    const before = library.getEntries();

    expect(library.importFiles([])).toEqual([]);
    expect(library.getEntries()).toEqual(before);
  });

  it("preserves valid entries when a batch contains invalid files", () => {
    const library = new AudioLibrary(() => crypto.randomUUID());

    const entries = library.importFiles([
      makeFile("valid.wav"),
      makeFile("empty.wav", ""),
      makeFile("notes.txt", "not audio", "text/plain"),
    ]);

    expect(entries.map(({ state }) => state)).toEqual([
      "ready",
      "unreadable",
      "unsupported",
    ]);
    expect(library.getEntries()).toHaveLength(3);
  });
});
