/**
 * PNGs da imagem OG já gerados nesta instância, pela chave do estado renderizado (dono,
 * recorte e versão do acervo). Pedidos repetidos ou simultâneos do mesmo estado
 * compartilham uma renderização; a checagem de estante publicada fica fora daqui.
 */
const MAX_ENTRIES = 24;

const rendered = new Map<string, Promise<ArrayBuffer>>();

export function memoOgImage(
  key: string,
  render: () => Promise<ArrayBuffer>
): Promise<ArrayBuffer> {
  const hit = rendered.get(key);
  if (hit) {
    // Reinsere para o Map servir de LRU (a ordem de inserção define quem sai primeiro).
    rendered.delete(key);
    rendered.set(key, hit);
    return hit;
  }
  const png = render();
  rendered.set(key, png);
  png.catch(() => {
    if (rendered.get(key) === png) {
      rendered.delete(key);
    }
  });
  if (rendered.size > MAX_ENTRIES) {
    const oldest = rendered.keys().next().value;
    if (oldest !== undefined) {
      rendered.delete(oldest);
    }
  }
  return png;
}
