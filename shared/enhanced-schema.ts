import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  json, 
  timestamp, 
  foreignKey, 
  pgEnum,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for standardized data
export const userRoleEnum = pgEnum('user_role', [
  'admin',      // Admin with full access
  'manager',    // Department Head/Facility Manager
  'technician', // IT/Maintenance Technician
  'user'        // Regular user/Production Staff
]);

export const ticketStatusEnum = pgEnum('ticket_status', [
  'Otevřený',    // Open/New
  'Přiřazeno',   // Assigned
  'Probíhá',     // In progress
  'Pozastaveno', // On hold
  'Vyřešeno',    // Resolved
  'Uzavřeno',    // Closed
  'Schváleno',   // Approved
  'Zamítnuto'    // Rejected
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'Nízká',       // Low
  'Střední',     // Medium
  'Vysoká',      // High
  'Kritická'     // Critical
]);

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'IT',                // IT issues
  'Údržba',           // Maintenance
  'Výroba',           // Production
  'Bezpečnost',       // Security
  'Administrativa'    // Administrative
]);

// Department table
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});

// Building table
export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Building A, B, C, D
  address: text('address'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});

// Floor table
export const floors = pgTable('floors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // 1st Floor, 2nd Floor, etc.
  buildingId: integer('building_id').notNull().references(() => buildings.id),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    buildingFloorUnique: uniqueIndex('building_floor_unique').on(table.buildingId, table.name)
  };
});

// Room table
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Room number + name
  floorId: integer('floor_id').notNull().references(() => floors.id),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    floorRoomUnique: uniqueIndex('floor_room_unique').on(table.floorId, table.name)
  };
});

// Area table (areas within rooms)
export const areas = pgTable('areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Výtahy, Klimatizační a ventilační systémy, etc.
  roomId: integer('room_id').notNull().references(() => rooms.id),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    roomAreaUnique: uniqueIndex('room_area_unique').on(table.roomId, table.name)
  };
});

// Element table (specific elements within areas that can have issues)
export const elements = pgTable('elements', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  areaId: integer('area_id').notNull().references(() => areas.id),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    areaElementUnique: uniqueIndex('area_element_unique').on(table.areaId, table.name)
  };
});

// Users table with enhanced fields
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').default('user'),
  departmentId: integer('department_id').references(() => departments.id),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Comments on tickets
export const ticketComments = pgTable('ticket_comments', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  comment: text('comment').notNull(),
  isInternal: boolean('is_internal').default(false), // Internal notes visible only to staff
  createdAt: timestamp('created_at').defaultNow()
});

// Attachments for tickets
export const ticketAttachments = pgTable('ticket_attachments', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  data: text('data').notNull(), // Base64 encoded data
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

// History of ticket changes for auditing
export const ticketHistory = pgTable('ticket_history', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(),
  userId: integer('user_id').references(() => users.id), // Who made the change
  field: text('field').notNull(), // Which field was changed
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow()
});

// Enhanced tickets table with proper foreign keys
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: ticketCategoryEnum('category').notNull(),
  priority: ticketPriorityEnum('priority').notNull(),
  status: ticketStatusEnum('status').default('Otevřený'),
  
  // Location info
  buildingId: integer('building_id').notNull().references(() => buildings.id),
  floorId: integer('floor_id').notNull().references(() => floors.id),
  roomId: integer('room_id').notNull().references(() => rooms.id),
  areaId: integer('area_id').notNull().references(() => areas.id),
  elementId: integer('element_id').notNull().references(() => elements.id),
  
  // User assignments
  createdBy: integer('created_by').notNull().references(() => users.id),
  assignedTo: integer('assigned_to').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  
  // Department assignment
  departmentId: integer('department_id').references(() => departments.id),
  
  // Dates
  dueDate: timestamp('due_date'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  ticketsCreated: many(tickets, { relationName: 'ticketsCreated' }),
  ticketsAssigned: many(tickets, { relationName: 'ticketsAssigned' }),
  ticketsApproved: many(tickets, { relationName: 'ticketsApproved' }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments, { relationName: 'uploadedAttachments' }),
  historyChanges: many(ticketHistory)
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  tickets: many(tickets)
}));

export const buildingsRelations = relations(buildings, ({ many }) => ({
  floors: many(floors),
  tickets: many(tickets)
}));

export const floorsRelations = relations(floors, ({ many, one }) => ({
  building: one(buildings, {
    fields: [floors.buildingId],
    references: [buildings.id],
  }),
  rooms: many(rooms),
  tickets: many(tickets)
}));

export const roomsRelations = relations(rooms, ({ many, one }) => ({
  floor: one(floors, {
    fields: [rooms.floorId],
    references: [floors.id],
  }),
  areas: many(areas),
  tickets: many(tickets)
}));

export const areasRelations = relations(areas, ({ many, one }) => ({
  room: one(rooms, {
    fields: [areas.roomId],
    references: [rooms.id],
  }),
  elements: many(elements),
  tickets: many(tickets)
}));

export const elementsRelations = relations(elements, ({ many, one }) => ({
  area: one(areas, {
    fields: [elements.areaId],
    references: [areas.id],
  }),
  tickets: many(tickets)
}));

export const ticketsRelations = relations(tickets, ({ many, one }) => ({
  creator: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
    relationName: 'ticketsCreated'
  }),
  assignee: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
    relationName: 'ticketsAssigned'
  }),
  approver: one(users, {
    fields: [tickets.approvedBy],
    references: [users.id],
    relationName: 'ticketsApproved'
  }),
  department: one(departments, {
    fields: [tickets.departmentId],
    references: [departments.id],
  }),
  building: one(buildings, {
    fields: [tickets.buildingId],
    references: [buildings.id],
  }),
  floor: one(floors, {
    fields: [tickets.floorId],
    references: [floors.id],
  }),
  room: one(rooms, {
    fields: [tickets.roomId],
    references: [rooms.id],
  }),
  area: one(areas, {
    fields: [tickets.areaId],
    references: [areas.id],
  }),
  element: one(elements, {
    fields: [tickets.elementId],
    references: [elements.id],
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  history: many(ticketHistory)
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketComments.userId],
    references: [users.id],
  })
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAttachments.ticketId],
    references: [tickets.id],
  }),
  uploader: one(users, {
    fields: [ticketAttachments.uploadedBy],
    references: [users.id],
    relationName: 'uploadedAttachments'
  })
}));

export const ticketHistoryRelations = relations(ticketHistory, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketHistory.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketHistory.userId],
    references: [users.id],
  })
}));

// Zod schemas for validation
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true
});

export const insertFloorSchema = createInsertSchema(floors).omit({
  id: true,
  createdAt: true
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true
});

export const insertAreaSchema = createInsertSchema(areas).omit({
  id: true,
  createdAt: true
});

export const insertElementSchema = createInsertSchema(elements).omit({
  id: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true
});

export const updateUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  role: true,
  departmentId: true,
  avatarUrl: true,
  phone: true,
  isActive: true
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertCommentSchema = createInsertSchema(ticketComments).omit({
  id: true,
  createdAt: true
});

export const insertAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  createdAt: true
});

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

// Type exports
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;

export type Floor = typeof floors.$inferSelect;
export type InsertFloor = z.infer<typeof insertFloorSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Area = typeof areas.$inferSelect;
export type InsertArea = z.infer<typeof insertAreaSchema>;

export type Element = typeof elements.$inferSelect;
export type InsertElement = z.infer<typeof insertElementSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = z.infer<typeof insertCommentSchema>;

export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = z.infer<typeof insertAttachmentSchema>;

export type TicketHistory = typeof ticketHistory.$inferSelect;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;