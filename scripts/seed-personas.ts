/**
 * Cria (ou recria) as personas de teste do Bodega Literária para desenvolvimento,
 * testes manuais e testes E2E de estresse/carga:
 *
 * 1. Arthur Whale (arthur.whale@exemplo.com): 600 livros (estresse de carga)
 * 2. Mariana Empréstimos (mariana.emprestimos@exemplo.com): 45 livros, 15 emprestados
 * 3. Lucas Metas (lucas.metas@exemplo.com): 80 livros, meta batida em 2026
 * 4. Zero Novato (zero.novato@exemplo.com): 0 livros (empty state/onboarding)
 *
 * Senha padrão de todos: "senha-forte-123"
 * Uso: pnpm db:seed:personas
 */
import { loadEnvConfig } from "@next/env";

import type { RestoredBook } from "../lib/domain/backup";
import type { BookFields, Reading, Situation } from "../lib/domain/types";

loadEnvConfig(process.cwd());

const AUTHORS = [
  { country: "brasileira", gender: "Homem" as const, name: "Machado de Assis" },
  {
    country: "brasileira",
    gender: "Mulher" as const,
    name: "Clarice Lispector",
  },
  { country: "brasileira", gender: "Homem" as const, name: "Jorge Amado" },
  {
    country: "brasileira",
    gender: "Mulher" as const,
    name: "Conceição Evaristo",
  },
  {
    country: "brasileira",
    gender: "Mulher" as const,
    name: "Lygia Fagundes Telles",
  },
  { country: "brasileira", gender: "Homem" as const, name: "Guimarães Rosa" },
  { country: "britânica", gender: "Mulher" as const, name: "Virginia Woolf" },
  { country: "britânica", gender: "Mulher" as const, name: "Jane Austen" },
  { country: "britânica", gender: "Homem" as const, name: "George Orwell" },
  {
    country: "norte-americana",
    gender: "Mulher" as const,
    name: "Ursula K. Le Guin",
  },
  {
    country: "norte-americana",
    gender: "Mulher" as const,
    name: "Toni Morrison",
  },
  {
    country: "norte-americana",
    gender: "Homem" as const,
    name: "Philip K. Dick",
  },
  {
    country: "nigeriana",
    gender: "Mulher" as const,
    name: "Chimamanda Ngozi Adichie",
  },
  {
    country: "colombiana",
    gender: "Homem" as const,
    name: "Gabriel García Márquez",
  },
  { country: "japonesa", gender: "Homem" as const, name: "Haruki Murakami" },
  { country: "tcheca", gender: "Homem" as const, name: "Franz Kafka" },
  { country: "russa", gender: "Homem" as const, name: "Fiódor Dostoiévski" },
  {
    country: "francesa",
    gender: "Mulher" as const,
    name: "Simone de Beauvoir",
  },
  { country: "portuguesa", gender: "Homem" as const, name: "José Saramago" },
  { country: "argentina", gender: "Homem" as const, name: "Jorge Luis Borges" },
];

const GENRES = [
  "Romance",
  "Ficção científica",
  "Distopia",
  "Fantasia",
  "Contos e crônicas",
  "Ensaio e filosofia",
  "Poesia",
  "Biografia e memórias",
  "História e sociedade",
  "Terror e suspense",
];

const PUBLISHERS = [
  "Companhia das Letras",
  "Editora 34",
  "Todavia",
  "Aleph",
  "Antófaga",
  "Record",
  "Zahar",
  "Rocco",
  "DarkSide Books",
  "Cosac Naify",
];

const BORROWERS = [
  "Mariana Costa",
  "Camila Rocha",
  "Lucas Silveira",
  "Thiago Martins",
  "Dona Lúcia",
  "Carlos Eduardo",
  "Fernanda Lima",
  "Pedro Henrique",
  "Beatriz Ramos",
  "Juliana Souza",
];

function generateWhaleBooks(count = 600) {
  const books: BookFields[] = [];
  for (let i = 1; i <= count; i++) {
    const author = AUTHORS[(i - 1) % AUTHORS.length];
    const genre = GENRES[(i - 1) % GENRES.length];
    const publisher = PUBLISHERS[(i - 1) % PUBLISHERS.length];
    const yearPublished = 1880 + ((i * 7) % 145);
    const pages = 120 + ((i * 37) % 850);
    const month = String(1 + ((i * 3) % 12)).padStart(2, "0");
    const day = String(1 + ((i * 5) % 28)).padStart(2, "0");
    const acquiredOn = `${2016 + (i % 11)}-${month}-${day}`;

    // Leitura: ~6% lendo, ~18% não lidos, o resto lido; ~6% emprestados (já lidos).
    let reading: Reading = "lido";
    let situation: Situation = "em-casa";
    let borrower: string | null = null;
    let yearRead: number | null = 2018 + (i % 9); // 2018 a 2026

    if (i % 16 === 0) {
      situation = "emprestado";
      borrower = BORROWERS[(i - 1) % BORROWERS.length];
    } else if (i % 16 === 1) {
      reading = "lendo";
      yearRead = null;
    } else if (i % 5 === 0) {
      reading = "nao-lido";
      yearRead = null;
    }

    books.push({
      acquiredOn,
      author: author.name,
      authorEthnicity: null,
      authorGender: author.gender,
      borrower,
      coverCheckedAt: null,
      coverUrl: null,
      favorite: i % 13 === 0,
      genre,
      nationality: author.country,
      notes:
        i % 7 === 0
          ? `Livro nº ${i} na coleção de Arthur. Leitura memorável.`
          : null,
      orderNo: i,
      pages,
      publisher,
      reading,
      situation,
      title: `Volume ${i}: Odisseia Literária ${author.name.split(" ")[0]}`,
      yearPublished,
      yearRead,
    });
  }
  return books;
}

function generateLendingBooks(count = 45) {
  const books: RestoredBook[] = [];
  for (let i = 1; i <= count; i++) {
    const author = AUTHORS[(i - 1) % AUTHORS.length];
    const genre = GENRES[(i - 1) % GENRES.length];
    const publisher = PUBLISHERS[(i - 1) % PUBLISHERS.length];
    const yearPublished = 1950 + ((i * 3) % 75);
    const pages = 180 + ((i * 23) % 500);

    // 15 emprestados (1/3 da estante), metade já lida
    const isLent = i <= 15;
    const reading: Reading = i % 2 === 0 ? "lido" : "nao-lido";
    const borrower = isLent ? BORROWERS[(i - 1) % BORROWERS.length] : null;
    // Empréstimos de 1 a 90 dias atrás, para a contagem variar entre "dias" e "meses".
    const lentDaysAgo = 1 + ((i * 37) % 90);

    books.push({
      acquiredOn: `2024-0${1 + (i % 9)}-15`,
      author: author.name,
      authorEthnicity: null,
      authorGender: author.gender,
      borrower,
      coverCheckedAt: null,
      coverUrl: null,
      favorite: i <= 5,
      genre,
      ...(isLent
        ? {
            lentAt: new Date(
              Date.now() - lentDaysAgo * 86_400_000
            ).toISOString(),
          }
        : {}),
      nationality: author.country,
      notes: isLent ? `Emprestado para ${borrower}. Lembrar de cobrar!` : null,
      orderNo: i,
      pages,
      publisher,
      reading,
      situation: isLent ? "emprestado" : "em-casa",
      title: `Acervo de Empréstimo ${i}: ${author.name}`,
      yearPublished,
      yearRead: reading === "lido" ? 2025 : null,
    });
  }
  return books;
}

function generateGoalBooks(count = 80) {
  const books: BookFields[] = [];
  for (let i = 1; i <= count; i++) {
    const author = AUTHORS[(i - 1) % AUTHORS.length];
    const genre = GENRES[(i - 1) % GENRES.length];
    const publisher = PUBLISHERS[(i - 1) % PUBLISHERS.length];

    // 35 lidos em 2026 (batendo meta de 30)
    let reading: Reading = "nao-lido";
    let yearRead: number | null = null;

    if (i <= 35) {
      reading = "lido";
      yearRead = 2026;
    } else if (i <= 45) {
      reading = "lendo";
    }

    books.push({
      acquiredOn: `2025-11-${String(1 + (i % 25)).padStart(2, "0")}`,
      author: author.name,
      authorEthnicity: null,
      authorGender: author.gender,
      borrower: null,
      coverCheckedAt: null,
      coverUrl: null,
      favorite: i % 8 === 0,
      genre,
      nationality: author.country,
      notes: reading === "lido" ? `Meta 2026: Livro ${i}/35 finalizado!` : null,
      orderNo: i,
      pages: 200 + ((i * 19) % 400),
      publisher,
      reading,
      situation: "em-casa",
      title: `Maratona Literária ${i}: ${genre}`,
      yearPublished: 1990 + (i % 35),
      yearRead,
    });
  }
  return books;
}

async function main() {
  const password = "senha-forte-123";
  const { eq } = await import("drizzle-orm");
  const { auth } = await import("../lib/auth");
  const { getDb } = await import("../lib/db");
  const { user } = await import("../lib/db/schema");
  const { replaceBooks } = await import("../lib/services/books");
  const { setGoal } = await import("../lib/services/goals");

  const db = getDb();

  const personas = [
    {
      books: generateWhaleBooks(600),
      email: "arthur.whale@exemplo.com",
      goal: 50,
      name: "Arthur Whale",
      role: "Grande Colecionador (600 livros, estresse de carga)",
    },
    {
      books: generateLendingBooks(45),
      email: "mariana.emprestimos@exemplo.com",
      goal: 20,
      name: "Mariana Empréstimos",
      role: "Gerenciamento de Empréstimos (15 livros emprestados)",
    },
    {
      books: generateGoalBooks(80),
      email: "lucas.metas@exemplo.com",
      goal: 30,
      name: "Lucas Metas",
      role: "Hiperfoco em Metas (35 lidos em 2026, meta de 30 batida)",
    },
    {
      books: [],
      email: "zero.novato@exemplo.com",
      goal: 12,
      name: "Zero Novato",
      role: "Novo Usuário (0 livros, empty states e onboarding)",
    },
  ];

  console.log("🌱 Populando banco de dados com personas de teste...\n");

  for (const p of personas) {
    // Idempotência: remove usuário anterior se existir
    await db.delete(user).where(eq(user.email, p.email));

    const { user: created } = await auth.api.signUpEmail({
      body: { name: p.name, email: p.email, password },
    });

    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, created.id));

    if (p.books.length > 0) {
      await replaceBooks(db, created.id, p.books);
    }
    await setGoal(db, created.id, 2026, p.goal);

    console.log(
      `✓ ${p.name.padEnd(22)} (${p.email}) · ${p.books.length} livros · Meta: ${p.goal}`
    );
  }

  console.log(
    `\n🎉 Todas as 4 personas foram criadas com a senha: "${password}"`
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  const e = err as { cause?: { message?: string } | string; name?: string };
  console.error("Erro ao popular personas:");
  console.error("NAME:", e?.name);
  console.error(
    "CAUSE:",
    typeof e?.cause === "object" ? e.cause?.message : e?.cause
  );
  process.exit(1);
});
