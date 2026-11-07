/**
 * Capas remotas para a imagem OG: baixadas no servidor com prazo e tamanho máximos e
 * entregues ao Satori como data URL. Qualquer falha devolve `null` (o card usa a
 * lombada colorida), para que uma capa lenta não derrube o preview.
 *
 * A URL da capa vem de quem cadastrou o livro, e o OG de uma estante publicada é
 * público — então quem quiser escolhe para onde este servidor vai buscar. As
 * defesas de endereço e de tamanho ficam em `lib/outbound-fetch`, junto com as
 * do sync da planilha, que tem o mesmo par de problemas.
 */
import {
  type HostResolver,
  hostIsPublic,
  readBoundedBody,
  resolveHost,
} from "@/lib/outbound-fetch";

const TIMEOUT_MS = 2000;
const MAX_BYTES = 1_500_000;
const TYPES = /^image\/(jpeg|png|gif)$/;
const MAX_REDIRECTS = 4;

export interface CoverDeps {
  fetcher?: typeof fetch;
  resolve?: HostResolver;
}

/**
 * Único portão da busca de capa: forma da URL **e** endereço de destino.
 *
 * As duas checagens eram exportadas em separado, com um comentário pedindo
 * que andassem juntas — contrato que só o código interno cumpria. Agora existe
 * uma porta só, e não há como usar metade dela.
 */
export async function canFetchCover(
  raw: string,
  resolve: HostResolver = resolveHost
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  return hostIsPublic(raw, resolve);
}

/**
 * Segue redirecionamentos à mão (a Open Library manda as capas para o archive.org),
 * revalidando cada destino para um redirect não levar à rede interna.
 */
async function fetchFollowingSafeRedirects(
  src: string,
  fetcher: typeof fetch,
  resolve: HostResolver
): Promise<Response | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = src;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetcher(url, { redirect: "manual", signal });
    const location = res.headers.get("location");
    if (!(res.status >= 300 && res.status < 400 && location)) {
      return res;
    }
    url = new URL(location, url).href;
    if (!(await canFetchCover(url, resolve))) {
      return null;
    }
  }
  return null;
}

export async function fetchCoverDataUrl(
  raw: string | null,
  { fetcher = fetch, resolve = resolveHost }: CoverDeps = {}
): Promise<string | null> {
  // Capas do Google Books costumam vir em http; o mesmo endereço responde em https.
  const src = raw?.replace(/^http:\/\//i, "https://") ?? null;
  if (!(src && (await canFetchCover(src, resolve)))) {
    return null;
  }
  try {
    const res = await fetchFollowingSafeRedirects(src, fetcher, resolve);
    if (!res) {
      return null;
    }
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!(res.ok && TYPES.test(type))) {
      return null;
    }
    const body = await readBoundedBody(res, MAX_BYTES);
    if (!body) {
      return null;
    }
    return `data:${type};base64,${Buffer.from(body).toString("base64")}`;
  } catch {
    return null;
  }
}
