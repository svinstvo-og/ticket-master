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

// Middleware to check if user is admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
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
  // Get all tickets
  app.get("/api/tickets", async (req: Request, res: Response) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tickets", error: (error as Error).message });
    }
  });

  // Get ticket by id
  app.get("/api/tickets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Error fetching ticket", error: (error as Error).message });
    }
  });

  // Create a new ticket
  app.post("/api/tickets", upload.array("attachments"), async (req: Request, res: Response) => {
    try {
      // Parse the request body according to the schema
      const files = req.files as Express.Multer.File[] | undefined;
      
      // Extract the JSON data from the form data
      let ticketData;
      try {
        ticketData = JSON.parse(req.body.ticketData);
      } catch (e) {
        ticketData = req.body;
      }
      
      // Process any uploaded files and add them to the request body
      const attachments = files?.map(file => ({
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        data: file.buffer.toString('base64')
      })) || [];
      
      // Validate the ticket data
      const validTicketData = insertTicketSchema.parse({
        ...ticketData,
        attachments: attachments.length > 0 ? attachments : ticketData.attachments
      });
      
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

  // Update a ticket
  app.patch("/api/tickets/:id", upload.array("attachments"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      // Extract the JSON data from the form data
      let ticketData;
      try {
        ticketData = JSON.parse(req.body.ticketData);
      } catch (e) {
        ticketData = req.body;
      }
      
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

  // Delete a ticket
  app.delete("/api/tickets/:id", async (req: Request, res: Response) => {
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
