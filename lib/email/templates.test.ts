import { describe, expect, it } from "vitest";

import { resetPasswordEmail, verificationEmail } from "./templates";

describe("templates de e-mail", () => {
  it("incluem o link no HTML (escapado) e no texto", () => {
    const m = verificationEmail("ana@x.com", "https://app/verify?token=a&b=<c>");
    expect(m.html).toContain("https://app/verify?token=a&amp;b=&lt;c&gt;");
    expect(m.text).toContain("https://app/verify?token=a&b=<c>");
    expect(m.text).toContain("Se não foi você, ignore este e-mail.");
    expect(resetPasswordEmail("a@b.c", "u").subject).toBe("Redefinir senha · Bodega Literária");
  });
});
