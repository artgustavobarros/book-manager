import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { account, user } from "./auth-schema";

export * from "./auth-schema";

export const bookStatus = pgEnum("book_status", [
  "nao-lido",
  "lendo",
  "lido",
  "emprestado",
  "abandonado",
  "doado",
]);

export const authorGender = pgEnum("author_gender", [
  "Homem",
  "Mulher",
  "Não definido",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderNo: integer("order_no"),
    title: text("title").notNull(),
    author: text("author"),
    authorGender: authorGender("author_gender"),
    authorEthnicity: text("author_ethnicity"),
    nationality: text("nationality"),
    publisher: text("publisher"),
    genre: text("genre"),
    yearPublished: integer("year_published"),
    pages: integer("pages"),
    acquiredOn: date("acquired_on", { mode: "string" }),
    status: bookStatus("status").notNull().default("nao-lido"),
    borrower: text("borrower"),
    /** Início do empréstimo atual; só o servidor grava (ver `lib/services/books.ts`). */
    lentAt: timestamp("lent_at", { withTimezone: true }),
    yearRead: integer("year_read"),
    notes: text("notes"),
    coverUrl: text("cover_url"),
    favorite: boolean("favorite").notNull().default(false),
    coverCheckedAt: timestamp("cover_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("books_user_idx").on(t.userId),
    index("books_user_order_idx").on(t.userId, t.orderNo),
    check("books_pages_positive", sql`${t.pages} is null or ${t.pages} > 0`),
  ]
);

export const readingGoals = pgTable(
  "reading_goals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    target: integer("target").notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.year] }),
    check("reading_goals_target_positive", sql`${t.target} > 0`),
  ]
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sheetUrl: text("sheet_url"),
  ...timestamps,
});

export const sheetExportStatus = pgEnum("sheet_export_status", [
  "pending",
  "enabled",
  "reconnect",
  "disabled",
]);

export const sheetExportRunStatus = pgEnum("sheet_export_run_status", [
  "processing",
  "succeeded",
  "failed",
]);

export const sheetExportConnections = pgTable("sheet_export_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => account.id, {
    onDelete: "set null",
  }),
  spreadsheetId: text("spreadsheet_id"),
  status: sheetExportStatus("status").notNull().default("pending"),
  lastSucceededAt: timestamp("last_succeeded_at", { withTimezone: true }),
  lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const sheetExportRuns = pgTable(
  "sheet_export_runs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(),
    status: sheetExportRunStatus("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.weekKey] }),
    index("sheet_export_runs_status_idx").on(t.status, t.leaseUntil),
  ]
);

export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;
export type BookStatus = (typeof bookStatus.enumValues)[number];
export type AuthorGender = (typeof authorGender.enumValues)[number];
