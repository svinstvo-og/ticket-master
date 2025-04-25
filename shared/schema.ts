import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  building: text("building").notNull(),
  facility: text("facility").notNull(),
  floor: text("floor").notNull(),
  roomNumber: text("room_number").notNull(),
  roomName: text("room_name").notNull(),
  priority: text("priority").notNull(),
  employeeAssigned: text("employee_assigned").notNull(),
  manager: text("manager").notNull(),
  status: text("status").notNull(),
  attachments: json("attachments").default('[]'),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
