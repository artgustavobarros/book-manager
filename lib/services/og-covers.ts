/**
 * Capas remotas para a imagem OG: baixadas no servidor com prazo e tamanho máximos e
 * entregues ao Satori como data URL. Qualquer falha devolve `null` (o card usa a
 * lombada colorida), para que uma capa lenta não derrube o preview.
 *
 * A URL da capa vem de quem cadastrou o livro, e o OG de uma estante publicada é
 * público — então quem quiser escolhe para onde este servidor vai buscar. Daí o
 * cuidado com endereço interno, aqui e em cada salto de redirecionamento.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TIMEOUT_MS = 2000;
const MAX_BYTES = 1_500_000;
const TYPES = /^image\/(jpeg|png|gif)$/;
const MAX_REDIRECTS = 4;

/** Resolve um nome nos endereços dele. Injetável para o teste rodar sem rede. */
export type HostResolver = (host: string) => Promise<string[]>;

const resolveHost: HostResolver = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

export interface CoverDeps {
  fetcher?: typeof fetch;
  resolve?: HostResolver;
}

function blockedIPv4(address: string): boolean {
  const [a, b, c] = address.split(".").map(Number);
  return (
    a === 0 || // "este host"
    a === 10 || // privada
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local: metadata de nuvem mora aqui
    (a === 172 && b >= 16 && b <= 31) || // privada
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // protocolo e TEST-NET-1
    (a === 192 && b === 168) || // privada
    (a === 198 && b >= 18 && b <= 19) || // benchmark
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reservado e broadcast
  );
}

function blockedIPv6(address: string): boolean {
  const h = address.toLowerCase();
  // Alguns formatos embutem um IPv4 no fim: `::ffff:10.0.0.1`, `64:ff9b::10.0.0.1`.
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(h)?.[1];
  if (v4 && isIP(v4) === 4 && blockedIPv4(v4)) {
    return true;
  }
  return (
    h === "::" ||
    h === "::1" ||
    /^f[cd]/.test(h) || // ULA
    /^fe[89ab]/.test(h) || // link-local
    h.startsWith("::ffff:") || // IPv4 mapeado
    h.startsWith("64:ff9b:") || // NAT64
    h.startsWith("2002:") // 6to4
  );
}

function blockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return blockedIPv4(address);
  }
  if (version === 6) {
    return blockedIPv6(address);
  }
  // Não é endereço: não há o que julgar, então recusa.
  return true;
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Forma da URL e, quando o host é um endereço literal, a faixa dele.
 *
 * Não decide nada sobre **nome** de host: para isso existe `coverHostIsPublic`,
 * que resolve o nome. As duas checagens andam juntas.
 */
export function isFetchableCover(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  const host = hostOf(raw);
  if (!host) {
    return false;
  }
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (isIP(host)) {
    return !blockedAddress(host);
  }
  return true;
}

/**
 * Resolve o nome e recusa se **qualquer** endereço cair em faixa interna.
 *
 * Sem isto, a proteção só enxergava IP literal: um nome comum com registro A
 * apontando para `169.254.169.254` ou `10.0.0.x` atravessava a peneira inteira,
 * e o servidor ia buscar lá.
 *
 * Resta uma janela: entre esta checagem e a conexão, o DNS pode responder outra
 * coisa (rebinding). Fechar isso exige fixar o endereço na hora de conectar, o
 * que a API de `fetch` não oferece — fica registrado em vez de disfarçado.
 */
export async function coverHostIsPublic(
  raw: string,
  resolve: HostResolver = resolveHost
): Promise<boolean> {
  const host = hostOf(raw);
  if (!host) {
    return false;
  }
  if (isIP(host)) {
    return !blockedAddress(host);
  }
  const addresses = await resolve(host).catch(() => []);
  return addresses.length > 0 && addresses.every((a) => !blockedAddress(a));
}

async function reachable(raw: string, resolve: HostResolver): Promise<boolean> {
  return isFetchableCover(raw) && (await coverHostIsPublic(raw, resolve));
}

/** Lê o corpo cortando no teto, em vez de carregar tudo e medir depois. */
async function readBounded(res: Response): Promise<Buffer | null> {
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return null;
  }
  if (!res.body) {
    const whole = Buffer.from(await res.arrayBuffer());
    return whole.byteLength > MAX_BYTES ? null : whole;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let seen = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    seen += value.byteLength;
    if (seen > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
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
    if (!(await reachable(url, resolve))) {
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
  if (!(src && (await reachable(src, resolve)))) {
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
    const buf = await readBounded(res);
    if (!buf) {
      return null;
    }
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
