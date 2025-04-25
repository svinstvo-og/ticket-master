import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTicketSchema } from "@shared/schema";
import multer from "multer";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

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

  const httpServer = createServer(app);
  return httpServer;
}
