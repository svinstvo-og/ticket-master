import { eq, and, or, desc, sql, isNull, not } from "drizzle-orm";
import { db, pool } from "./enhanced-db";
import * as schema from "@shared/enhanced-schema";
import connectPg from "connect-pg-simple";
import session from "express-session";

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IEnhancedStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  updateUser(id: number, user: Partial<schema.UpdateUser>): Promise<schema.User | undefined>;
  getAllUsers(): Promise<schema.User[]>;
  updatePassword(id: number, newPassword: string): Promise<boolean>;
  deactivateUser(id: number): Promise<boolean>;
  
  // Department methods
  getDepartments(): Promise<schema.Department[]>;
  getDepartment(id: number): Promise<schema.Department | undefined>;
  createDepartment(dept: schema.InsertDepartment): Promise<schema.Department>;
  
  // Building methods
  getBuildings(): Promise<schema.Building[]>;
  getBuilding(id: number): Promise<schema.Building | undefined>;
  
  // Floor methods
  getFloors(buildingId?: number): Promise<schema.Floor[]>;
  getFloor(id: number): Promise<schema.Floor | undefined>;
  
  // Room methods
  getRooms(floorId?: number): Promise<schema.Room[]>;
  getRoom(id: number): Promise<schema.Room | undefined>;
  
  // Area methods
  getAreas(roomId?: number): Promise<schema.Area[]>;
  getArea(id: number): Promise<schema.Area | undefined>;
  
  // Element methods
  getElements(areaId?: number): Promise<schema.Element[]>;
  getElement(id: number): Promise<schema.Element | undefined>;
  
  // Ticket methods
  getTickets(options?: {
    userId?: number;
    departmentId?: number;
    assignedToId?: number;
    status?: string;
    category?: string;
    buildingId?: number;
  }): Promise<schema.Ticket[]>;
  getTicket(id: number): Promise<schema.Ticket | undefined>;
  createTicket(ticket: schema.InsertTicket): Promise<schema.Ticket>;
  updateTicket(id: number, ticket: Partial<schema.InsertTicket>): Promise<schema.Ticket | undefined>;
  deleteTicket(id: number): Promise<boolean>;
  
  // Ticket comments
  addComment(comment: schema.InsertTicketComment): Promise<schema.TicketComment>;
  getTicketComments(ticketId: number): Promise<schema.TicketComment[]>;
  
  // Ticket attachments
  addAttachment(attachment: schema.InsertTicketAttachment): Promise<schema.TicketAttachment>;
  getTicketAttachments(ticketId: number): Promise<schema.TicketAttachment[]>;
  
  // Ticket history
  recordHistory(ticketId: number, userId: number | null, field: string, oldValue: string, newValue: string): Promise<void>;
  getTicketHistory(ticketId: number): Promise<schema.TicketHistory[]>;
  
  // Dashboard data
  getTicketStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byBuilding: Record<string, number>;
    byDepartment: Record<string, number>;
  }>;
}

export class EnhancedDatabaseStorage implements IEnhancedStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize PostgreSQL session store with current pool
    this.sessionStore = new PostgresSessionStore({
      pool: pool, // Use the pool directly from db module
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }
  
  async createUser(insertUser: schema.InsertUser): Promise<schema.User> {
    const [user] = await db
      .insert(schema.users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<schema.UpdateUser>): Promise<schema.User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        ...userUpdate,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }
  
  async getAllUsers(): Promise<schema.User[]> {
    return await db.select().from(schema.users);
  }
  
  async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const [result] = await db
      .update(schema.users)
      .set({
        password: newPassword,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    return !!result;
  }
  
  async deactivateUser(id: number): Promise<boolean> {
    const [result] = await db
      .update(schema.users)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    return !!result;
  }
  
  // Department methods
  async getDepartments(): Promise<schema.Department[]> {
    return await db.select().from(schema.departments);
  }
  
  async getDepartment(id: number): Promise<schema.Department | undefined> {
    const [department] = await db.select().from(schema.departments).where(eq(schema.departments.id, id));
    return department;
  }
  
  async createDepartment(dept: schema.InsertDepartment): Promise<schema.Department> {
    const [department] = await db.insert(schema.departments).values(dept).returning();
    return department;
  }
  
  // Building methods
  async getBuildings(): Promise<schema.Building[]> {
    return await db.select().from(schema.buildings);
  }
  
  async getBuilding(id: number): Promise<schema.Building | undefined> {
    const [building] = await db.select().from(schema.buildings).where(eq(schema.buildings.id, id));
    return building;
  }
  
  // Floor methods
  async getFloors(buildingId?: number): Promise<schema.Floor[]> {
    if (buildingId) {
      return await db
        .select()
        .from(schema.floors)
        .where(eq(schema.floors.buildingId, buildingId));
    }
    return await db.select().from(schema.floors);
  }
  
  async getFloor(id: number): Promise<schema.Floor | undefined> {
    const [floor] = await db.select().from(schema.floors).where(eq(schema.floors.id, id));
    return floor;
  }
  
  // Room methods
  async getRooms(floorId?: number): Promise<schema.Room[]> {
    if (floorId) {
      return await db
        .select()
        .from(schema.rooms)
        .where(eq(schema.rooms.floorId, floorId));
    }
    return await db.select().from(schema.rooms);
  }
  
  async getRoom(id: number): Promise<schema.Room | undefined> {
    const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, id));
    return room;
  }
  
  // Area methods
  async getAreas(roomId?: number): Promise<schema.Area[]> {
    if (roomId) {
      return await db
        .select()
        .from(schema.areas)
        .where(eq(schema.areas.roomId, roomId));
    }
    return await db.select().from(schema.areas);
  }
  
  async getArea(id: number): Promise<schema.Area | undefined> {
    const [area] = await db.select().from(schema.areas).where(eq(schema.areas.id, id));
    return area;
  }
  
  // Element methods
  async getElements(areaId?: number): Promise<schema.Element[]> {
    if (areaId) {
      return await db
        .select()
        .from(schema.elements)
        .where(eq(schema.elements.areaId, areaId));
    }
    return await db.select().from(schema.elements);
  }
  
  async getElement(id: number): Promise<schema.Element | undefined> {
    const [element] = await db.select().from(schema.elements).where(eq(schema.elements.id, id));
    return element;
  }
  
  // Ticket methods
  async getTickets(options?: {
    userId?: number;
    departmentId?: number;
    assignedToId?: number;
    status?: string;
    category?: string;
    buildingId?: number;
  }): Promise<schema.Ticket[]> {
    let query = db.select().from(schema.tickets);
    
    if (options) {
      const conditions = [];
      
      if (options.userId) {
        conditions.push(eq(schema.tickets.createdBy, options.userId));
      }
      
      if (options.departmentId) {
        conditions.push(eq(schema.tickets.departmentId, options.departmentId));
      }
      
      if (options.assignedToId) {
        conditions.push(eq(schema.tickets.assignedTo, options.assignedToId));
      }
      
      if (options.status) {
        conditions.push(eq(schema.tickets.status, options.status));
      }
      
      if (options.category) {
        conditions.push(eq(schema.tickets.category, options.category));
      }
      
      if (options.buildingId) {
        conditions.push(eq(schema.tickets.buildingId, options.buildingId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(schema.tickets.createdAt));
  }
  
  async getTicket(id: number): Promise<schema.Ticket | undefined> {
    const [ticket] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id));
    return ticket;
  }
  
  async createTicket(ticket: schema.InsertTicket): Promise<schema.Ticket> {
    const [createdTicket] = await db
      .insert(schema.tickets)
      .values(ticket)
      .returning();
    return createdTicket;
  }
  
  async updateTicket(id: number, ticketUpdate: Partial<schema.InsertTicket>): Promise<schema.Ticket | undefined> {
    // Get current ticket to compare with updates
    const [currentTicket] = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.id, id));
    
    if (!currentTicket) return undefined;
    
    // Special handling for status changes
    if (ticketUpdate.status) {
      // If status is changed to resolved, set resolvedAt
      if (ticketUpdate.status === 'Vyřešeno' && currentTicket.status !== 'Vyřešeno') {
        ticketUpdate = { ...ticketUpdate, resolvedAt: new Date() };
      }
      
      // If status is changed to closed, set closedAt
      if (ticketUpdate.status === 'Uzavřeno' && currentTicket.status !== 'Uzavřeno') {
        ticketUpdate = { ...ticketUpdate, closedAt: new Date() };
      }
    }
    
    const [updatedTicket] = await db
      .update(schema.tickets)
      .set({
        ...ticketUpdate,
        updatedAt: new Date()
      })
      .where(eq(schema.tickets.id, id))
      .returning();
    
    return updatedTicket;
  }
  
  async deleteTicket(id: number): Promise<boolean> {
    // First delete all related records
    await db.delete(schema.ticketComments).where(eq(schema.ticketComments.ticketId, id));
    await db.delete(schema.ticketAttachments).where(eq(schema.ticketAttachments.ticketId, id));
    await db.delete(schema.ticketHistory).where(eq(schema.ticketHistory.ticketId, id));
    
    // Then delete the ticket
    const result = await db.delete(schema.tickets).where(eq(schema.tickets.id, id)).returning({ id: schema.tickets.id });
    return result.length > 0;
  }
  
  // Ticket comments
  async addComment(comment: schema.InsertTicketComment): Promise<schema.TicketComment> {
    const [createdComment] = await db
      .insert(schema.ticketComments)
      .values(comment)
      .returning();
    return createdComment;
  }
  
  async getTicketComments(ticketId: number): Promise<schema.TicketComment[]> {
    return await db
      .select()
      .from(schema.ticketComments)
      .where(eq(schema.ticketComments.ticketId, ticketId))
      .orderBy(schema.ticketComments.createdAt);
  }
  
  // Ticket attachments
  async addAttachment(attachment: schema.InsertTicketAttachment): Promise<schema.TicketAttachment> {
    const [createdAttachment] = await db
      .insert(schema.ticketAttachments)
      .values(attachment)
      .returning();
    return createdAttachment;
  }
  
  async getTicketAttachments(ticketId: number): Promise<schema.TicketAttachment[]> {
    return await db
      .select()
      .from(schema.ticketAttachments)
      .where(eq(schema.ticketAttachments.ticketId, ticketId));
  }
  
  // Ticket history
  async recordHistory(ticketId: number, userId: number | null, field: string, oldValue: string, newValue: string): Promise<void> {
    await db.insert(schema.ticketHistory).values({
      ticketId,
      userId,
      field,
      oldValue,
      newValue
    });
  }
  
  async getTicketHistory(ticketId: number): Promise<schema.TicketHistory[]> {
    return await db
      .select()
      .from(schema.ticketHistory)
      .where(eq(schema.ticketHistory.ticketId, ticketId))
      .orderBy(schema.ticketHistory.createdAt);
  }
  
  // Dashboard data
  async getTicketStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byBuilding: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    // Get total tickets
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tickets);
    
    // Get open tickets (not resolved or closed)
    const [openResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tickets)
      .where(
        and(
          not(eq(schema.tickets.status, 'Vyřešeno')),
          not(eq(schema.tickets.status, 'Uzavřeno'))
        )
      );
    
    // Get resolved tickets
    const [resolvedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tickets)
      .where(
        or(
          eq(schema.tickets.status, 'Vyřešeno'),
          eq(schema.tickets.status, 'Uzavřeno')
        )
      );
    
    // Get tickets by priority
    const priorityResults = await db
      .select({
        priority: schema.tickets.priority,
        count: sql<number>`count(*)`
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.priority);
    
    // Get tickets by category
    const categoryResults = await db
      .select({
        category: schema.tickets.category,
        count: sql<number>`count(*)`
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.category);
    
    // Get tickets by building
    const buildingResults = await db
      .select({
        buildingId: schema.tickets.buildingId,
        count: sql<number>`count(*)`
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.buildingId);
    
    // Get building names
    const buildings = await this.getBuildings();
    const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
    
    // Get tickets by department
    const departmentResults = await db
      .select({
        departmentId: schema.tickets.departmentId,
        count: sql<number>`count(*)`
      })
      .from(schema.tickets)
      .where(not(isNull(schema.tickets.departmentId)))
      .groupBy(schema.tickets.departmentId);
    
    // Get department names
    const departments = await this.getDepartments();
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));
    
    // Format the results
    const byPriority: Record<string, number> = {};
    priorityResults.forEach(r => {
      byPriority[r.priority] = Number(r.count);
    });
    
    const byCategory: Record<string, number> = {};
    categoryResults.forEach(r => {
      byCategory[r.category] = Number(r.count);
    });
    
    const byBuilding: Record<string, number> = {};
    buildingResults.forEach(r => {
      const buildingName = buildingMap.get(r.buildingId) || 'Unknown';
      byBuilding[buildingName] = Number(r.count);
    });
    
    const byDepartment: Record<string, number> = {};
    departmentResults.forEach(r => {
      const departmentName = r.departmentId !== null ? (departmentMap.get(r.departmentId) || 'Unknown') : 'Unassigned';
      byDepartment[departmentName] = Number(r.count);
    });
    
    return {
      totalTickets: Number(totalResult.count),
      openTickets: Number(openResult.count),
      resolvedTickets: Number(resolvedResult.count),
      byPriority,
      byCategory,
      byBuilding,
      byDepartment
    };
  }
}

// Export singleton instance
export const enhancedStorage = new EnhancedDatabaseStorage();