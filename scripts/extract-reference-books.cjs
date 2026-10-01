// Gera tests/fixtures/reference-books.json executando o SEED e o load() do standalone
// (design/handoff/source/Acervo.dc.html) com o ano de referência fixo 2026.
// Uso: node scripts/extract-reference-books.cjs
const fs = require("fs");
const src = fs.readFileSync("design/handoff/source/Acervo.dc.html", "utf8");
const start = src.indexOf(">", src.indexOf("data-dc-script")) + 1;
const end = src.indexOf("class Component extends DCLogic");
const code = src.slice(start, end);
// Ano de referência fixo dos testes visuais.
const Y_REF = 2026;
const fn = new Function(code.replace("const Y = new Date().getFullYear();", "const Y = " + Y_REF + ";") + "\nreturn { SEED, SEED_BY_ID, withOrders, Y };");
const { SEED, SEED_BY_ID, withOrders, Y } = fn();
// Reproduz Component.load() sem localStorage (primeira visita).
let v = SEED.map((b) => ({ ...b }));
v = v.map((b) => {
  if (b.status !== "nao-lido") return b;
  if (b.id === "s4" || b.id === "s7") return { ...b, status: "lendo" };
  if (["s9", "s12", "s28"].includes(b.id)) return { ...b, status: "lido", yearRead: String(Y) };
  return b;
});
v = v.map((b) => {
  const s = SEED_BY_ID[b.id], x = { ...b };
  if (s && x.pages === undefined) Object.assign(x, { pages: s.pages, genre: s.genre, yearRead: s.yearRead });
  if (x.authorGender === undefined) x.authorGender = s ? s.authorGender : "";
  if (x.borrower === undefined) x.borrower = s && x.status === "emprestado" ? s.borrower : "";
  if (s && !x.order) x.order = s.order;
  return x;
});
v = withOrders(v);
fs.mkdirSync("tests/fixtures", { recursive: true });
fs.writeFileSync("tests/fixtures/reference-books.json", JSON.stringify(v, null, 2) + "\n");
console.log(v.length, "livros;", v.filter((b) => b.status === "lendo").length, "lendo;", v.filter((b) => b.status === "lido").length, "lidos");
