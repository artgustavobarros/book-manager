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

import { user } from "./auth-schema";

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

export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;
export type BookStatus = (typeof bookStatus.enumValues)[number];
export type AuthorGender = (typeof authorGender.enumValues)[number];
