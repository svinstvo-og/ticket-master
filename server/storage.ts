import { tickets, type Ticket, type InsertTicket, users, type User, type InsertUser, type UpdateUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Pool } from 'pg';
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  
  // Location hierarchy methods
  getBuildings(): Promise<any[]>;
  getFloors(buildingId?: number): Promise<any[]>;
  getRooms(floorId?: number): Promise<any[]>;
  getAreas(roomId?: number): Promise<any[]>;
  getElements(areaId?: number): Promise<any[]>;
  
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
    console.log("MemStorage creating ticket with data:", insertTicket);
    const id = this.ticketCurrentId++;
    const createdAt = new Date();
    
    // Set default values for optional fields
    const status = insertTicket.status || 'Otevřený';
    const assignedTo = insertTicket.assignedTo || null;
    const approvedBy = insertTicket.approvedBy || null;
    
    // Ensure attachments is always an array, even if included
    const attachments = insertTicket.attachments || [];
    
    const ticket: Ticket = { 
      ...insertTicket, 
      id, 
      createdAt,
      status,
      assignedTo,
      approvedBy,
      // Additional fields that might be needed by the database schema
      updatedAt: null,
      closedAt: null,
      resolvedAt: null,
      // We'll keep attachments in memory, but it's not in the official schema
      attachments
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

  // Location hierarchy methods - MemStorage just returns empty arrays
  async getBuildings(): Promise<any[]> {
    return [];
  }

  async getFloors(buildingId?: number): Promise<any[]> {
    return [];
  }

  async getRooms(floorId?: number): Promise<any[]> {
    return [];
  }

  async getAreas(roomId?: number): Promise<any[]> {
    return [];
  }

  async getElements(areaId?: number): Promise<any[]> {
    return [];
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const query = `
        INSERT INTO users (
          username, password, full_name, email, phone, avatar_url, 
          role, department_id, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        insertUser.username,
        insertUser.password,
        insertUser.fullName || '',
        insertUser.email || '',
        insertUser.phone || null,
        insertUser.avatarUrl || null,
        insertUser.role || 'user',
        insertUser.departmentId || null,
        insertUser.isActive !== undefined ? insertUser.isActive : true
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userUpdate: Partial<UpdateUser>): Promise<User | undefined> {
    try {
      // Build dynamic query based on which fields are provided
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      if (userUpdate.fullName !== undefined) {
        setFields.push(`full_name = $${paramIndex++}`);
        values.push(userUpdate.fullName);
      }

      if (userUpdate.email !== undefined) {
        setFields.push(`email = $${paramIndex++}`);
        values.push(userUpdate.email);
      }

      if (userUpdate.role !== undefined) {
        setFields.push(`role = $${paramIndex++}`);
        values.push(userUpdate.role);
      }

      if (userUpdate.departmentId !== undefined) {
        setFields.push(`department_id = $${paramIndex++}`);
        values.push(userUpdate.departmentId);
      }

      if (userUpdate.phone !== undefined) {
        setFields.push(`phone = $${paramIndex++}`);
        values.push(userUpdate.phone);
      }

      if (userUpdate.avatarUrl !== undefined) {
        setFields.push(`avatar_url = $${paramIndex++}`);
        values.push(userUpdate.avatarUrl);
      }

      if (userUpdate.isActive !== undefined) {
        setFields.push(`is_active = $${paramIndex++}`);
        values.push(userUpdate.isActive);
      }

      if (setFields.length === 0) {
        return this.getUser(id); // Nothing to update
      }

      values.push(id); // Add id as the last parameter

      const query = `
        UPDATE users
        SET ${setFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await pool.query('SELECT * FROM users');
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updatePassword(id: number, newPassword: string): Promise<boolean> {
    try {
      const query = 'UPDATE users SET password = $1 WHERE id = $2';
      const result = await pool.query(query, [newPassword, id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  async deactivateUser(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE users SET is_active = false WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  // Ticket methods
  async getTickets(): Promise<Ticket[]> {
    try {
      const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting tickets:', error);
      return [];
    }
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    try {
      const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting ticket:', error);
      return undefined;
    }
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    try {
      // Handle mapping from form values to DB IDs if needed
      let buildingId = insertTicket.buildingId;
      let floorId = insertTicket.floorId;
      let roomId = insertTicket.roomId;
      let areaId = insertTicket.areaId;
      let elementId = insertTicket.elementId;
      
      // If we have string values but not IDs, look up the IDs
      if (!buildingId && insertTicket.building) {
        // For now, just use default values for testing
        buildingId = 1;
      }
      
      if (!floorId && insertTicket.floor) {
        floorId = 1;
      }
      
      if (!roomId && insertTicket.room) {
        roomId = 1;
      }
      
      if (!areaId && insertTicket.area) {
        areaId = 1;
      }
      
      if (!elementId && insertTicket.element) {
        elementId = 1;
      }
      
      const query = `
        INSERT INTO tickets (
          title, description, category, building_id, floor_id, room_id, area_id, element_id, 
          priority, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      // Make sure created_by is set, as it's required in the database
      if (!insertTicket.createdBy) {
        console.warn('Warning: createdBy field is required but not provided');
      }
      
      const values = [
        insertTicket.title,
        insertTicket.description,
        insertTicket.category,
        buildingId,
        floorId,
        roomId,
        areaId,
        elementId,
        insertTicket.priority,
        insertTicket.status || 'Otevřený',
        // Use 5 (admin) as a fallback if createdBy is not set
        insertTicket.createdBy || 5
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: number, ticketUpdate: Partial<InsertTicket>): Promise<Ticket | undefined> {
    try {
      // Build dynamic query based on which fields are provided
      const setFields = [];
      const values = [];
      let paramIndex = 1;

      if (ticketUpdate.title !== undefined) {
        setFields.push(`title = $${paramIndex++}`);
        values.push(ticketUpdate.title);
      }

      if (ticketUpdate.description !== undefined) {
        setFields.push(`description = $${paramIndex++}`);
        values.push(ticketUpdate.description);
      }

      if (ticketUpdate.category !== undefined) {
        setFields.push(`category = $${paramIndex++}`);
        values.push(ticketUpdate.category);
      }

      if (ticketUpdate.buildingId !== undefined) {
        setFields.push(`building_id = $${paramIndex++}`);
        values.push(ticketUpdate.buildingId);
      }

      if (ticketUpdate.floorId !== undefined) {
        setFields.push(`floor_id = $${paramIndex++}`);
        values.push(ticketUpdate.floorId);
      }

      if (ticketUpdate.roomId !== undefined) {
        setFields.push(`room_id = $${paramIndex++}`);
        values.push(ticketUpdate.roomId);
      }

      if (ticketUpdate.areaId !== undefined) {
        setFields.push(`area_id = $${paramIndex++}`);
        values.push(ticketUpdate.areaId);
      }

      if (ticketUpdate.elementId !== undefined) {
        setFields.push(`element_id = $${paramIndex++}`);
        values.push(ticketUpdate.elementId);
      }

      if (ticketUpdate.priority !== undefined) {
        setFields.push(`priority = $${paramIndex++}`);
        values.push(ticketUpdate.priority);
      }

      if (ticketUpdate.assignedTo !== undefined) {
        setFields.push(`assigned_to = $${paramIndex++}`);
        values.push(ticketUpdate.assignedTo);
      }

      if (ticketUpdate.approvedBy !== undefined) {
        setFields.push(`approved_by = $${paramIndex++}`);
        values.push(ticketUpdate.approvedBy);
      }

      if (ticketUpdate.status !== undefined) {
        setFields.push(`status = $${paramIndex++}`);
        values.push(ticketUpdate.status);
      }

      if (ticketUpdate.dueDate !== undefined) {
        setFields.push(`due_date = $${paramIndex++}`);
        values.push(ticketUpdate.dueDate);
      }

      if (setFields.length === 0) {
        return this.getTicket(id); // Nothing to update
      }

      values.push(id); // Add id as the last parameter

      const query = `
        UPDATE tickets
        SET ${setFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return undefined;
    }
  }

  async deleteTicket(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM tickets WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
  }

  // Location hierarchy methods
  async getBuildings(): Promise<any[]> {
    try {
      const result = await pool.query('SELECT * FROM buildings ORDER BY name');
      return result.rows;
    } catch (error) {
      console.error('Error getting buildings:', error);
      return [];
    }
  }

  async getFloors(buildingId?: number): Promise<any[]> {
    try {
      let query = 'SELECT * FROM floors';
      let params: any[] = [];

      if (buildingId) {
        query += ' WHERE building_id = $1';
        params.push(buildingId);
      }

      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting floors:', error);
      return [];
    }
  }

  async getRooms(floorId?: number): Promise<any[]> {
    try {
      let query = 'SELECT * FROM rooms';
      let params: any[] = [];

      if (floorId) {
        query += ' WHERE floor_id = $1';
        params.push(floorId);
      }

      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting rooms:', error);
      return [];
    }
  }

  async getAreas(roomId?: number): Promise<any[]> {
    try {
      let query = 'SELECT * FROM areas';
      let params: any[] = [];

      if (roomId) {
        query += ' WHERE room_id = $1';
        params.push(roomId);
      }

      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting areas:', error);
      return [];
    }
  }

  async getElements(areaId?: number): Promise<any[]> {
    try {
      let query = 'SELECT * FROM elements';
      let params: any[] = [];

      if (areaId) {
        query += ' WHERE area_id = $1';
        params.push(areaId);
      }

      query += ' ORDER BY name';
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting elements:', error);
      return [];
    }
  }
}

// Try to use database storage, but fall back to memory storage if there are issues
let storage: IStorage;

try {
  // Test database connection
  pool.query('SELECT NOW()').then(() => {
    console.log('Connected to the database successfully');
    storage = new DatabaseStorage();
  }).catch(err => {
    console.error('Database connection failed:', err);
    console.log('Falling back to memory storage');
    storage = new MemStorage();
  });
  
  // Initialize with memory storage until the database check completes
  storage = new MemStorage();
} catch (error) {
  console.error('Error initializing database:', error);
  storage = new MemStorage();
}

export { storage };
