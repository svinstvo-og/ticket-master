import { tickets, type Ticket, type InsertTicket, users, type User, type InsertUser, type UpdateUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpdateUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updatePassword(id: number, newPassword: string): Promise<boolean>;
  deactivateUser(id: number): Promise<boolean>;
  
  // Ticket methods
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, ticket: Partial<InsertTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private userCurrentId: number;
  private ticketCurrentId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.userCurrentId = 1;
    this.ticketCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt,
      fullName: insertUser.fullName || '',
      email: insertUser.email || '',
      role: insertUser.role || 'user',
      department: insertUser.department || '',
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<UpdateUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    user.password = newPassword;
    this.users.set(id, user);
    return true;
  }
  
  async deactivateUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    user.isActive = false;
    this.users.set(id, user);
    return true;
  }

  // Ticket methods
  async getTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.ticketCurrentId++;
    const createdAt = new Date();
    
    // Set default values for optional fields
    const status = insertTicket.status || 'Otevřený';
    const employeeAssigned = insertTicket.employeeAssigned || '';
    const manager = insertTicket.manager || '';
    
    // Ensure attachments is always an array, even if undefined
    const attachments = insertTicket.attachments || [];
    
    const ticket: Ticket = { 
      ...insertTicket, 
      id, 
      createdAt,
      attachments,
      status,
      employeeAssigned,
      manager
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: number, ticketUpdate: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    const updatedTicket: Ticket = { ...ticket, ...ticketUpdate };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteTicket(id: number): Promise<boolean> {
    return this.tickets.delete(id);
  }
}

export const storage = new MemStorage();
