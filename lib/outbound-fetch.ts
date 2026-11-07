/**
 * Cuidados comuns a toda busca que o servidor faz num endereço escolhido por
 * quem usa o app: a planilha do sync e a capa da imagem OG.
 *
 * As duas nasceram com o mesmo par de problemas — teto de tamanho conferido
 * tarde demais, e peneira de endereço interno que só enxergava IP literal — e
 * foram corrigidas separadamente, cada uma com a sua cópia da solução. Aqui
 * fica a versão única.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Resolve um nome nos endereços dele. Injetável para o teste rodar sem rede. */
export type HostResolver = (host: string) => Promise<string[]>;

export const resolveHost: HostResolver = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

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

/** Endereço que o servidor não deve alcançar. Entrada que não é endereço recusa. */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return blockedIPv4(address);
  }
  if (version === 6) {
    return blockedIPv6(address);
  }
  return true;
}

/**
 * O host da URL aponta para fora da rede interna?
 *
 * Para endereço literal basta a faixa. Para **nome** é preciso resolver: uma
 * peneira que só olha IP literal deixa passar qualquer domínio com registro A
 * apontando para dentro, que foi exatamente a falha corrigida nas capas da OG.
 *
 * Resta uma janela: entre esta checagem e a conexão, o DNS pode responder
 * outra coisa (rebinding). Fechar exige fixar o endereço ao conectar, o que a
 * API de `fetch` não oferece — fica registrado em vez de disfarçado.
 */
export async function hostIsPublic(
  raw: string,
  resolve: HostResolver = resolveHost
): Promise<boolean> {
  let host: string;
  try {
    host = new URL(raw).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
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
    return !isBlockedAddress(host);
  }
  const addresses = await resolve(host).catch(() => []);
  return addresses.length > 0 && addresses.every((a) => !isBlockedAddress(a));
}

/**
 * Lê o corpo cortando no teto **durante** o download.
 *
 * Medir depois de carregar tudo não é limite: quando a conta fecha, a memória
 * já foi gasta. Devolve `null` ao estourar, em vez de lançar — cada chamador
 * tem o seu próprio erro de domínio para levantar.
 */
export async function readBoundedBody(
  res: Response,
  maxBytes: number
): Promise<Uint8Array | null> {
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) {
    return null;
  }
  if (!res.body) {
    const whole = new Uint8Array(await res.arrayBuffer());
    return whole.byteLength > maxBytes ? null : whole;
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
    if (seen > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(seen);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}
