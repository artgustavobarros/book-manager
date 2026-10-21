import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isPublicPath, proxy } from "@/proxy";

const run = (path: string, cookie?: string) =>
  proxy(
    new NextRequest(new URL(path, "http://localhost:3000"), {
      headers: cookie ? { cookie } : {},
    })
  );

describe("proxy", () => {
  it("libera só a estante pública com slug", () => {
    expect(isPublicPath("/estante/ana-lima")).toBe(true);
    expect(isPublicPath("/estante/ana-lima/")).toBe(true);
    expect(isPublicPath("/estante")).toBe(false);
    expect(isPublicPath("/estante/")).toBe(false);
    expect(isPublicPath("/estante/ana/outra")).toBe(false);
  });

  it("deixa visitantes abrirem /estante/{slug} e manda /estante para a entrada", () => {
    expect(
      run("/estante/ana-lima?genero=romance").headers.get("location")
    ).toBeNull();
    expect(run("/estante").headers.get("location")).toBe(
      "http://localhost:3000/entrar?voltar=%2Festante"
    );
    expect(run("/estante/ana/outra").status).toBe(307);
  });
});
