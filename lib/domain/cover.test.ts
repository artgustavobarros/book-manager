import { describe, expect, it } from "vitest";

import { COVERS, coverColors, coverImage, hash } from "./cover";

describe("cover", () => {
  it("usa o mesmo hash do standalone (h*31 + charCode, uint32)", () => {
    expect(hash("")).toBe(0);
    expect(hash("a")).toBe(97);
    expect(hash("ab")).toBe(97 * 31 + 98);
  });
  it("escolhe a cor por título + autor", () => {
    expect(coverColors("1984", "George Orwell")).toEqual({
      coverBg: COVERS[1][0],
      coverInk: COVERS[1][1],
    });
    expect(coverColors("Sem autor", null)).toEqual(
      coverColors("Sem autor", "")
    );
  });
  it("gera background-image", () => {
    expect(coverImage("https://x/y.jpg")).toBe('url("https://x/y.jpg")');
    expect(coverImage(null)).toBe("none");
  });
  it('escapa a URL para não sair do url("…")', () => {
    expect(coverImage('https://x/a.jpg");position:fixed;x:("')).toBe(
      'url("https://x/a.jpg\\22 );position:fixed;x:(\\22 ")'
    );
    expect(coverImage("https://x/a\\b\n.jpg")).toBe(
      'url("https://x/a\\5c b\\a .jpg")'
    );
  });
});
