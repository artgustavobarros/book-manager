import { afterEach, describe, expect, it, vi } from "vitest";

import { findCover } from "./lookup";

afterEach(() => vi.unstubAllGlobals());

describe("capa automática", () => {
  it("aceita smallThumbnail quando Google não envia thumbnail", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      if (url.includes("itunes.apple.com")) {
        return Response.json({ results: [] });
      }
      return Response.json({
        items: [
          {
            volumeInfo: {
              title: "Torto arado",
              imageLinks: { smallThumbnail: "http://books.google.com/capa" },
            },
          },
        ],
      });
    });
    expect(await findCover({ title: "Torto arado", author: null })).toEqual({
      url: "https://books.google.com/capa",
      ok: true,
    });
    expect(urls).toHaveLength(2);
  });
});
