import { pgTable, text, timestamp, boolean, integer, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull().default("Guest"),
  ageVerified: boolean("age_verified").notNull().default(false),
  birthYear: integer("birth_year"),
  ageGroup: text("age_group").notNull().default("guest"), // guest | teen | adult | blocked
  safetyLevel: text("safety_level").notNull().default("strict"), // strict | balanced
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companions = pgTable("companions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  personality: jsonb("personality").$type<string[]>().notNull().default([]),
  backstory: text("backstory").notNull().default(""),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  communicationStyle: text("communication_style").notNull().default("warm and friendly"),
  avatarEmoji: text("avatar_emoji").notNull().default("✨"),
  avatarGradient: text("avatar_gradient").notNull().default("from-violet-500 to-fuchsia-500"),
  category: text("category").notNull().default("friend"), // friend, mentor, wellness, study, adventure, creative
  isPublic: boolean("is_public").notNull().default(true),
  isSeeded: boolean("is_seeded").notNull().default(false),
  creatorId: uuid("creator_id"),
  messageCount: integer("message_count").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  companionId: uuid("companion_id").notNull(),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  flagged: boolean("flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  companionId: uuid("companion_id").notNull(),
  userId: uuid("user_id").notNull(),
  fact: text("fact").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const safetyReports = pgTable("safety_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterUserId: uuid("reporter_user_id").notNull(),
  conversationId: uuid("conversation_id"),
  messageId: uuid("message_id"),
  reason: text("reason").notNull(), // inappropriate, harassment, selfharm, privacy, other
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | reviewed | resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const safetyEvents = pgTable("safety_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  conversationId: uuid("conversation_id"),
  category: text("category").notNull(), // nsfw_block, pii_warning, selfharm_support, jailbreak_block, profanity
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Companion = typeof companions.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Memory = typeof memories.$inferSelect;
