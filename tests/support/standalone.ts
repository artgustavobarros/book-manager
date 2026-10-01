/**
 * Oráculo: carrega a lógica do standalone (design/handoff/source/Acervo.dc.html) em Node,
 * com localStorage/sessionStorage em memória, para comparar cálculos com os nossos.
 * Use com `vi.setSystemTime()` para fixar a data antes de chamar `loadStandalone()`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import raw from "../fixtures/reference-books.json";

type Dict = Record<string, unknown>;

export interface StandaloneComponent {
  state: Dict & { books: Dict[] };
  props: Dict;
  painel(books: Dict[]): Dict;
  dados(books: Dict[]): Dict;
  estante(books: Dict[]): Dict;
  [k: string]: unknown;
}

function memoryStorage(initial: Record<string, string>) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = String(v)),
    removeItem: (k: string) => void delete data[k],
    data,
  };
}

let source: string | null = null;
function standaloneScript(): string {
  if (!source) {
    const file = readFileSync(path.join(process.cwd(), "design/handoff/source/Acervo.dc.html"), "utf8");
    const start = file.indexOf(">", file.indexOf("data-dc-script")) + 1;
    const end = file.indexOf("</script>", start);
    source = file.slice(start, end);
  }
  return source;
}

export function loadStandalone(opts: { books?: Dict[]; user?: Dict; state?: Dict } = {}): StandaloneComponent {
  const localStorage = memoryStorage({
    "acervo-livros-v1": JSON.stringify(opts.books ?? raw),
    "acervo-seed-v2": "1",
    "acervo-seed-v3": "1",
    "acervo-usuario": JSON.stringify(opts.user ?? { name: "Ana Lima", email: "ana@exemplo.com" }),
  });
  const sessionStorage = memoryStorage({ "acervo-sessao": "1" });
  class DCLogic {
    props: Dict = {};
    state: Dict = {};
    setState(p: Dict | ((s: Dict) => Dict)) {
      Object.assign(this.state, typeof p === "function" ? p(this.state) : p);
    }
    forceUpdate() {}
  }
  const React = { createRef: () => ({ current: null }) };
  const document = { documentElement: { dataset: {}, style: {} } };
  const factory = new Function(
    "DCLogic",
    "React",
    "localStorage",
    "sessionStorage",
    "document",
    "window",
    standaloneScript() + "\nreturn Component;",
  );
  const Component = factory(DCLogic, React, localStorage, sessionStorage, document, {});
  const comp = new Component() as StandaloneComponent;
  Object.assign(comp.state, opts.state ?? {});
  return comp;
}
