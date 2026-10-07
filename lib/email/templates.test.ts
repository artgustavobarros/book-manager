import { describe, expect, it } from "vitest";

import {
  resetPasswordEmail,
  verificationEmail,
  verificationMessage,
} from "./templates";

const jwt = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

describe("templates de e-mail", () => {
  it("incluem o link no HTML (escapado) e no texto", () => {
    const m = verificationEmail(
      "ana@x.com",
      "https://app/verify?token=a&b=<c>"
    );
    expect(m.html).toContain("https://app/verify?token=a&amp;b=&lt;c&gt;");
    expect(m.text).toContain("https://app/verify?token=a&b=<c>");
    expect(m.text).toContain("Não criou esta conta? Ignore este e-mail");
    expect(m.html).toContain("Você recebeu este e-mail porque");
    expect(resetPasswordEmail("a@b.c", "u").subject).toBe(
      "Redefinir senha · Bodega Literária"
    );
  });

  it("cumprimentam pelo nome e citam a conta na redefinição", () => {
    expect(verificationEmail("a@x.com", "u", " Ana <Lima> ").html).toContain(
      "Olá, Ana &lt;Lima&gt;. Confirme seu e-mail"
    );
    expect(verificationEmail("a@x.com", "u").html).toContain(
      ">Confirme seu e-mail</h1>"
    );
    expect(resetPasswordEmail("ana@x.com", "u").text).toContain(
      "para a conta ana@x.com."
    );
  });

  it("usam o texto da troca quando o token traz o novo endereço", () => {
    const m = verificationMessage({
      user: { email: "nova@x.com" },
      url: "https://app/verify",
      token: jwt({ email: "velha@x.com", updateTo: "nova@x.com" }),
    });
    expect(m.to).toBe("nova@x.com");
    expect(m.subject).toBe("Confirme o novo e-mail · Bodega Literária");
    expect(m.text).toContain("nova@x.com");
    expect(m.text).not.toContain("Falta só um passo");
  });

  it("usam o texto do cadastro sem novo endereço ou com token ilegível", () => {
    for (const token of [jwt({ email: "ana@x.com" }), "invalido", ""]) {
      expect(
        verificationMessage({ user: { email: "ana@x.com" }, url: "u", token })
          .subject
      ).toBe("Confirme seu e-mail · Bodega Literária");
    }
  });
});
