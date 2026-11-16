import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PHOTO_DATA_URL } from "@/tests/fixtures/book-photo";

const photoPolicy = vi.hoisted(() => ({ value: "deny" }));

import { MAX_PHOTO_BODY_BYTES, PHOTO_MODELS } from "../domain/book-photo";
import { readPhotoBody, recognizeBookPhoto, validatePhoto } from "./book-photo";

vi.mock("@/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/env")>();
  return {
    env: {
      ...original.env,
      OPENROUTER_API_KEY: "test-key-not-a-secret",
      get OPENROUTER_PHOTO_DATA_COLLECTION() {
        return photoPolicy.value;
      },
    },
  };
});

const fetcher = vi.fn<typeof fetch>();
beforeEach(() => {
  photoPolicy.value = "deny";
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());

function completion(content: string, finishReason = "stop") {
  return Response.json({
    id: "test-completion",
    model: PHOTO_MODELS[0].value,
    object: "chat.completion",
    created: 1,
    system_fingerprint: null,
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        message: { role: "assistant", content },
      },
    ],
  });
}

describe("transporte da foto", () => {
  it("aceita imagem inline e recusa URL remota, MIME falso e base64 inválido", () => {
    expect(() => validatePhoto(PHOTO_DATA_URL)).not.toThrow();
    for (const invalid of [
      "https://example.com/photo.png",
      PHOTO_DATA_URL.replace("image/png", "image/jpeg"),
      "data:image/png;base64,aaaa",
      "data:image/svg+xml;base64,PHN2Zz4=",
    ]) {
      expect(() => validatePhoto(invalid)).toThrow();
    }
  });

  it("lê JSON e recusa corpo inválido ou formato incompatível", async () => {
    const request = (body: string, contentType = "application/json") =>
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "content-type": contentType },
        body,
      });
    await expect(readPhotoBody(request('{"image":"ok"}'))).resolves.toEqual({
      image: "ok",
    });
    await expect(readPhotoBody(request("invalid"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      readPhotoBody(request("{}", "text/plain"))
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readPhotoBody(request("x".repeat(MAX_PHOTO_BODY_BYTES + 1)))
    ).rejects.toMatchObject({ status: 413 });
  });
});

describe("SDK oficial do OpenRouter", () => {
  it("envia imagem pelo SDK e retorna só as pistas e os dados de comparação", async () => {
    fetcher.mockResolvedValue(
      completion(
        JSON.stringify({
          title: "Torto arado",
          author: "Itamar Vieira Junior",
          isbn: "9788535902779",
        })
      )
    );
    const result = await recognizeBookPhoto(
      PHOTO_DATA_URL,
      PHOTO_MODELS[0].value
    );
    expect(result).toMatchObject({
      reading: {
        title: "Torto arado",
        author: "Itamar Vieira Junior",
        isbn: null,
      },
      model: PHOTO_MODELS[0].value,
    });
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(fetcher).toHaveBeenCalledOnce();
    const [request] = fetcher.mock.calls[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) {
      throw new Error("SDK não enviou um Request.");
    }
    expect(request.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.headers.get("authorization")).toBe(
      "Bearer test-key-not-a-secret"
    );
    const body = await request.json();
    expect(body.model).toBe(PHOTO_MODELS[0].value);
    expect(body.provider.data_collection).toBe("deny");
    expect(body.provider.max_price).toEqual({
      prompt: "0",
      completion: "0",
      image: "0",
      request: "0",
    });
    expect(body.messages[1].content[1]).toEqual({
      type: "image_url",
      image_url: { url: PHOTO_DATA_URL, detail: "high" },
    });
  });

  it("permite coleta só com opt-in explícito do servidor, mantendo preço zero", async () => {
    photoPolicy.value = "allow";
    fetcher.mockResolvedValue(
      completion('{"title":"Livro","author":null,"isbn":null}')
    );
    await recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value);
    const [request] = fetcher.mock.calls[0];
    if (!(request instanceof Request)) {
      throw new Error("SDK não enviou um Request.");
    }
    const body = await request.json();
    expect(body.provider.data_collection).toBe("allow");
    expect(body.provider.max_price).toEqual({
      prompt: "0",
      completion: "0",
      image: "0",
      request: "0",
    });
  });

  it.each(["não é json", '{"title":12}', ""])(
    "recusa resposta inválida: %s",
    async (content) => {
      fetcher.mockResolvedValue(completion(content));
      await expect(
        recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value)
      ).rejects.toMatchObject({ status: 502 });
    }
  );

  it("aceita null para uma foto sem texto legível", async () => {
    fetcher.mockResolvedValue(
      completion('{"title":null,"author":null,"isbn":null}')
    );
    await expect(
      recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value)
    ).resolves.toMatchObject({
      reading: { title: null, author: null, isbn: null },
    });
  });

  it("recusa leitura truncada sem tentar recuperar ou inventar dados", async () => {
    fetcher.mockResolvedValue(
      completion('{"title":"X","author":null,"isbn":null}', "length")
    );
    await expect(
      recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value)
    ).rejects.toMatchObject({ status: 502 });
  });

  it.each([
    [429, 429],
    [401, 503],
    [402, 503],
    [503, 503],
  ])(
    "traduz erro %i sem expor resposta do provedor ou repetir chamada",
    async (status, expected) => {
      fetcher.mockResolvedValue(
        Response.json(
          { error: { message: "sensitive-provider-content", code: status } },
          { status }
        )
      );
      await expect(
        recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value)
      ).rejects.toMatchObject({
        status: expected,
        message: expect.not.stringContaining("sensitive-provider-content"),
      });
      expect(fetcher).toHaveBeenCalledOnce();
    }
  );

  it("trata falha de rede sem expor o erro bruto", async () => {
    fetcher.mockRejectedValue(new Error("sensitive-network-content"));
    await expect(
      recognizeBookPhoto(PHOTO_DATA_URL, PHOTO_MODELS[0].value)
    ).rejects.toMatchObject({
      status: 504,
      message: expect.not.stringContaining("sensitive-network-content"),
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
