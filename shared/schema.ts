import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Use a table with simple field names for backward compatibility
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  building: text("building").notNull(),
  // facility field removed
  floor: text("floor").notNull(),
  room: text("room").notNull(), // Combined roomNumber and roomName into a single field
  area: text("area").notNull(), // Oblast (Area) field
  element: text("element").notNull(), // Prvek (Element) field
  priority: text("priority").notNull(),
  employeeAssigned: text("employee_assigned").default(''), // Optional, set by admin in dashboard
  manager: text("manager").default(''), // Optional, set by admin in dashboard
  status: text("status").default('Otevřený'), // Default status for new tickets
  attachments: json("attachments").default('[]'),
  createdAt: timestamp("created_at").defaultNow()
});

// Create a base schema from the tickets table
const baseSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true
});

// Customize it to make manager, employeeAssigned, and status optional
export const insertTicketSchema = baseSchema.extend({
  employeeAssigned: z.string().optional(),
  manager: z.string().optional(),
  status: z.string().optional()
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").default(''),
  email: text("email").default(''),
  role: text("role").default('user'), // 'user', 'admin', 'manager', 'technician'
  department: text("department").default(''),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  department: true,
  isActive: true
});

// For updating users (no password required)
export const updateUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  role: true,
  department: true,
  isActive: true
});

// For password change
export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
export type User = typeof users.$inferSelect;
