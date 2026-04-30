import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { GameTheoryModel, PaperSection, Reference } from "@/lib/types";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    rawIdea: text("raw_idea").notNull(),
    refinedIdea: text("refined_idea").notNull(),
    model: jsonb("model").$type<GameTheoryModel | null>(),
    sections: jsonb("sections").$type<PaperSection[]>().notNull(),
    references: jsonb("references").$type<Reference[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_owner_created_at_idx").on(table.ownerId, table.createdAt),
  ]
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
