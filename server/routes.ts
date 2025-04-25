import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTicketSchema, updateUserSchema, passwordChangeSchema } from "@shared/schema";
import multer from "multer";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Role-based middleware
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

// Middleware to check if user is manager (department head)
function isManager(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Department Head access required" });
  }
  
  next();
}

// Middleware to check if user is technician
function isTechnician(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== 'technician' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Technician access required" });
  }
  
  next();
}

// Middleware to check if user can view tickets (all roles except regular user can view all tickets)
function canViewAllTickets(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role === 'user') {
    // Regular users can only see their own tickets
    // We'll filter tickets in the route handler
    req.query.filterByUser = 'true';
  }
  
  next();
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // API endpoints for location hierarchy
  app.get("/api/buildings", async (req: Request, res: Response) => {
    try {
      const buildings = await storage.getBuildings();
      res.status(200).json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ message: "Error fetching buildings" });
    }
  });

  app.get("/api/floors", async (req: Request, res: Response) => {
    try {
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
      const floors = await storage.getFloors(buildingId);
      res.status(200).json(floors);
    } catch (error) {
      console.error("Error fetching floors:", error);
      res.status(500).json({ message: "Error fetching floors" });
    }
  });

  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const floorId = req.query.floorId ? parseInt(req.query.floorId as string) : undefined;
      const rooms = await storage.getRooms(floorId);
      res.status(200).json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Error fetching rooms" });
    }
  });

  app.get("/api/areas", async (req: Request, res: Response) => {
    try {
      const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
      const areas = await storage.getAreas(roomId);
      res.status(200).json(areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ message: "Error fetching areas" });
    }
  });

  app.get("/api/elements", async (req: Request, res: Response) => {
    try {
      const areaId = req.query.areaId ? parseInt(req.query.areaId as string) : undefined;
      const elements = await storage.getElements(areaId);
      res.status(200).json(elements);
    } catch (error) {
      console.error("Error fetching elements:", error);
      res.status(500).json({ message: "Error fetching elements" });
    }
  });

  // API endpoint to fetch the complete location hierarchy at once
  app.get("/api/location-hierarchy", async (req: Request, res: Response) => {
    try {
      const buildings = await storage.getBuildings();
      
      // Build the complete hierarchy
      const result = await Promise.all(buildings.map(async building => {
        const floors = await storage.getFloors(building.id);
        
        const floorsWithRooms = await Promise.all(floors.map(async floor => {
          const rooms = await storage.getRooms(floor.id);
          
          const roomsWithAreas = await Promise.all(rooms.map(async room => {
            const areas = await storage.getAreas(room.id);
            
            const areasWithElements = await Promise.all(areas.map(async area => {
              const elements = await storage.getElements(area.id);
              return {
                ...area,
                elements
              };
            }));
            
            return {
              ...room,
              areas: areasWithElements
            };
          }));
          
          return {
            ...floor,
            rooms: roomsWithAreas
          };
        }));
        
        return {
          ...building,
          floors: floorsWithRooms
        };
      }));
      
      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching location hierarchy:", error);
      res.status(500).json({ message: "Error fetching location hierarchy" });
    }
  });

  // Get all tickets (filtered by role)
  app.get("/api/tickets", canViewAllTickets, async (req: Request, res: Response) => {
    try {
      const tickets = await storage.getTickets();
      
      // Filter tickets based on user role
      if (req.query.filterByUser === 'true' && req.user) {
        // Regular users can only see tickets they created
        const filteredTickets = tickets.filter(ticket => {
          // If we had a 'createdBy' field in the ticket, we would use that
          // For now, we're returning all tickets for all users
          return true;
        });
        return res.json(filteredTickets);
      } else if (req.user?.role === 'manager') {
        // Department heads can see tickets from their department
        const filteredTickets = tickets.filter(ticket => {
          // Filter by department if we had a department field in the ticket
          // For now, we're returning all tickets for managers
          return true;
        });
        return res.json(filteredTickets);
      } else if (req.user?.role === 'technician') {
        // Technicians can see tickets assigned to them
        const filteredTickets = tickets.filter(ticket => {
          // Filter by tickets assigned to this technician
          return ticket.assignedTo === req.user?.id || 
                 ticket.assignedTo === null; // Include unassigned tickets
        });
        return res.json(filteredTickets);
      }
      
      // Admins can see all tickets
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tickets", error: (error as Error).message });
    }
  });

  // Get ticket by id (with role-based access)
  app.get("/api/tickets/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check role-based permissions
      if (req.user?.role === 'user') {
        // Regular users can only view tickets they created
        // Since we don't have a createdBy field yet, this is a placeholder
        // In a real implementation, we would check ticket.createdBy === req.user.id
        return res.json(ticket);
      } else if (req.user?.role === 'manager') {
        // Department heads can view tickets from their department
        // In a real implementation, we would check ticket.department === req.user.department
        return res.json(ticket);
      } else if (req.user?.role === 'technician') {
        // Technicians can view tickets assigned to them
        if (ticket.assignedTo === req.user?.id || ticket.assignedTo === null) {
          return res.json(ticket);
        } else {
          return res.status(403).json({ message: "Forbidden: You can only view tickets assigned to you" });
        }
      }

      // Admins can view all tickets
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Error fetching ticket", error: (error as Error).message });
    }
  });

  // Create a new ticket (user must be authenticated)
  app.post("/api/tickets", upload.array("attachments"), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Parse the request body according to the schema
      const files = req.files as Express.Multer.File[] | undefined;
      
      // Extract the JSON data from the form data
      let ticketData;
      try {
        ticketData = JSON.parse(req.body.ticketData);
      } catch (e) {
        ticketData = req.body;
      }
      
      console.log("Raw ticket data received:", ticketData);
      
      // Process any uploaded files and add them to the request body
      const attachments = files?.map(file => ({
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        data: file.buffer.toString('base64')
      })) || [];

      // Set default status based on role
      let initialStatus = 'Otevřený'; // Default status "Open"
      
      // If current user is a manager, they can create pre-approved tickets
      if (req.user.role === 'manager') {
        initialStatus = ticketData.status || initialStatus;
      }

      // If current user is a technician, they can create tickets with special status
      if (req.user.role === 'technician') {
        initialStatus = ticketData.status || initialStatus;
      }
      
      // For backward compatibility with the old form, keep the text values
      // but ensure the IDs are present which is what really matters
      const { building, floor, room, area, element, ...restTicketData } = ticketData;
      
      // Make sure category is not empty
      if (!ticketData.category) {
        ticketData.category = "IT";
      }
      
      // Create a compatible object for validation
      const compatibleTicketData = {
        ...restTicketData,
        // Keep the text values for display purposes
        building: building || '',
        floor: floor || '',
        room: room || '',
        area: area || '',
        element: element || '',
        // Make sure we have a category and priority
        category: ticketData.category || 'IT',
        priority: ticketData.priority || 'Nízká',
        status: initialStatus,
        // Add current user as the creator
        createdBy: req.user.id,
        // Ensure buildingId and other fields are present
        buildingId: ticketData.buildingId,
        floorId: ticketData.floorId,
        roomId: ticketData.roomId,
        areaId: ticketData.areaId,
        elementId: ticketData.elementId,
        // Include attachments
        attachments: attachments.length > 0 ? attachments : ticketData.attachments
      };
      
      console.log("Processed ticket data:", compatibleTicketData);
      
      // Validate the ticket data with the current schema
      let validTicketData;
      try {
        validTicketData = insertTicketSchema.parse(compatibleTicketData);
        console.log("Valid ticket data:", validTicketData);
      } catch (error) {
        console.error("Validation error:", error);
        throw error;
      }
      
      // Create the ticket
      const createdTicket = await storage.createTicket(validTicketData);
      res.status(201).json(createdTicket);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Validation error", error: validationError.message });
      } else {
        res.status(500).json({ message: "Error creating ticket", error: (error as Error).message });
      }
    }
  });

  // Update a ticket (with role-based access)
  app.patch("/api/tickets/:id", upload.array("attachments"), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      // Get the ticket to check permissions
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Extract the JSON data from the form data
      let ticketData;
      try {
        ticketData = JSON.parse(req.body.ticketData);
      } catch (e) {
        ticketData = req.body;
      }

      // Check role-based permissions for updates
      if (req.user?.role === 'user') {
        // Regular users: limited modifications, can't change status/assignment
        if (ticketData.status || ticketData.assignedTo || ticketData.approvedBy) {
          return res.status(403).json({ 
            message: "Forbidden: Regular users cannot change ticket status or assignments" 
          });
        }
      } else if (req.user?.role === 'manager') {
        // Department Heads: can approve, escalate, assign
      } else if (req.user?.role === 'technician') {
        // Technicians: can only update their assigned tickets
        if (ticket.assignedTo !== req.user?.id && ticket.assignedTo !== null) {
          return res.status(403).json({ 
            message: "Forbidden: Technicians can only update tickets assigned to them" 
          });
        }
      }
      // Admins have full access
      
      // Process any uploaded files and add them to the request body
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        const attachments = files.map(file => ({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64')
        }));
        
        ticketData.attachments = attachments;
      }
      
      // Validate partial update against schema
      const validTicketData = insertTicketSchema.partial().parse(ticketData);
      
      // Update the ticket
      const updatedTicket = await storage.updateTicket(id, validTicketData);
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(updatedTicket);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Validation error", error: validationError.message });
      } else {
        res.status(500).json({ message: "Error updating ticket", error: (error as Error).message });
      }
    }
  });

  // Delete a ticket (admin only)
  app.delete("/api/tickets/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const deleted = await storage.deleteTicket(id);
      if (!deleted) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting ticket", error: (error as Error).message });
    }
  });

  // === User Management API Endpoints ===

  // Get all users (admin only)
  app.get("/api/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send password hashes to the client
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error: (error as Error).message });
    }
  });

  // Get user by ID (admin or own user)
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Only admins can see other users' details
      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only view your own user details" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password hash to client
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user", error: (error as Error).message });
    }
  });

  // Update user profile (admin or own user)
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Regular users can only update their own profile and cannot change role
      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }

      // Only admins can update roles
      if (req.body.role && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Only admins can change roles" });
      }

      // Validate user update
      const validUserData = updateUserSchema.partial().parse(req.body);
      
      // Update user
      const updatedUser = await storage.updateUser(id, validUserData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password hash to client
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Validation error", error: validationError.message });
      } else {
        res.status(500).json({ message: "Error updating user", error: (error as Error).message });
      }
    }
  });

  // Change password (own user only)
  app.post("/api/users/:id/change-password", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only change their own password
      if (req.user.id !== id) {
        return res.status(403).json({ message: "Forbidden: You can only change your own password" });
      }

      // Validate password change data
      const validPasswordData = passwordChangeSchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify old password
      const isPasswordCorrect = await comparePasswords(validPasswordData.oldPassword, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(validPasswordData.newPassword);
      
      // Update the password
      const success = await storage.updatePassword(id, hashedPassword);
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: "Validation error", error: validationError.message });
      } else {
        res.status(500).json({ message: "Error changing password", error: (error as Error).message });
      }
    }
  });

  // Reset user password (admin only)
  app.post("/api/users/:id/reset-password", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Generate a random temporary password
      const tempPassword = randomBytes(4).toString('hex');
      
      // Hash the temporary password
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update the password
      const success = await storage.updatePassword(id, hashedPassword);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return the temporary password to the admin
      res.status(200).json({ 
        message: "Password reset successfully", 
        temporaryPassword: tempPassword 
      });
    } catch (error) {
      res.status(500).json({ message: "Error resetting password", error: (error as Error).message });
    }
  });

  // Deactivate/reactivate user (admin only)
  app.post("/api/users/:id/set-active", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (typeof req.body.isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      // Update the user's active status
      const updatedUser = await storage.updateUser(id, { isActive: req.body.isActive });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password hash to client
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user status", error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
