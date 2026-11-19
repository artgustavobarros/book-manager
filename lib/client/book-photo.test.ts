import { describe, expect, it } from "vitest";

import { analyzeScannerFrame, SCANNER_SAMPLE_SIZE } from "./book-photo";

function makeCheckerFrame(size = SCANNER_SAMPLE_SIZE, step = 12): Uint8Array {
  const frame = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      frame[y * size + x] = (x + y) % 4 < 2 ? 40 : 40 + step * 8;
    }
  }
  return frame;
}

describe("analyzeScannerFrame", () => {
  it("rejeita quadro uniforme ou tampa fechada mesmo parado", () => {
    const blank = new Uint8Array(SCANNER_SAMPLE_SIZE * SCANNER_SAMPLE_SIZE);
    blank.fill(120);
    const result = analyzeScannerFrame(blank, blank);
    expect(result.isSteady).toBe(true);
    expect(result.hasDetail).toBe(false);
  });

  it("rejeita quadro com detalhe quando ainda há movimento entre quadros", () => {
    const a = makeCheckerFrame();
    const b = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      b[i] = (a[i] + 45) % 255;
    }
    const result = analyzeScannerFrame(a, b);
    expect(result.hasDetail).toBe(true);
    expect(result.isSteady).toBe(false);
  });

  it("aprova quadro com detalhe e estabilidade entre quadros", () => {
    const a = makeCheckerFrame();
    const b = new Uint8Array(a);
    b[10] = Math.min(255, b[10] + 2);
    const result = analyzeScannerFrame(a, b);
    expect(result.hasDetail).toBe(true);
    expect(result.isSteady).toBe(true);
  });
});
