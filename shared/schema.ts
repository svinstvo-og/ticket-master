import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Match the actual database schema
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // This should be an enum in the DB
  priority: text("priority").notNull(), // This should be an enum in the DB
  status: text("status").default('Otevřený'), // This should be an enum in the DB
  
  // References to other tables
  buildingId: integer("building_id").notNull(),
  floorId: integer("floor_id").notNull(),
  roomId: integer("room_id").notNull(),
  areaId: integer("area_id").notNull(),
  elementId: integer("element_id").notNull(),
  departmentId: integer("department_id"),
  
  // User references
  createdBy: integer("created_by"),
  assignedTo: integer("assigned_to"),
  approvedBy: integer("approved_by"),
  
  // Date fields
  dueDate: timestamp("due_date"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Create a base schema from the tickets table
const baseSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true
});

// Create a simplified schema for basic ticket creation that works with the form
export const insertTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string(),
  priority: z.string(),
  
  // These will be mapped to IDs
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  area: z.string().optional(),
  element: z.string().optional(),
  
  // Optional fields
  buildingId: z.number().optional(),
  floorId: z.number().optional(),
  roomId: z.number().optional(),
  areaId: z.number().optional(),
  elementId: z.number().optional(),
  departmentId: z.number().optional(),
  
  // User assignment fields
  status: z.string().optional(),
  createdBy: z.number().optional(), // Current user ID (will be added on the server)
  assignedTo: z.number().optional(),
  approvedBy: z.number().optional(),
  
  // Additional fields
  dueDate: z.date().optional(),
  attachments: z.any().optional()
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").default(''),
  email: text("email").default(''),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  role: text("role").default('user'), // 'user', 'admin', 'manager', 'technician'
  departmentId: integer("department_id"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  departmentId: true,
  isActive: true
}).omit({
  lastLogin: true,
  createdAt: true,
  updatedAt: true
});

// For updating users (no password required)
export const updateUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  departmentId: true,
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
