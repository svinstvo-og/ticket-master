import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/enhanced-schema";
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// Configure Neon database connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create and export the database connection
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Define sample data for initial setup
const sampleData = {
  departments: [
    { name: 'IT', description: 'Information Technology Department' },
    { name: 'Facility Management', description: 'Facility and Building Management' },
    { name: 'Production', description: 'Production and Manufacturing' },
    { name: 'Administration', description: 'Administrative Department' },
    { name: 'Security', description: 'Security and Safety' }
  ],
  buildings: [
    { name: 'Building A', description: 'Main Production Facility', address: 'Prague Industrial Zone 1' },
    { name: 'Building B', description: 'Administrative Office', address: 'Prague Industrial Zone 1' },
    { name: 'Building C', description: 'Research & Development', address: 'Prague Industrial Zone 2' },
    { name: 'Building D', description: 'Storage and Logistics', address: 'Prague Industrial Zone 2' }
  ],
  roles: ['admin', 'manager', 'technician', 'user'] as const,
  statuses: ['Otevřený', 'Přiřazeno', 'Probíhá', 'Pozastaveno', 'Vyřešeno', 'Uzavřeno', 'Schváleno', 'Zamítnuto'] as const,
  priorities: ['Nízká', 'Střední', 'Vysoká', 'Kritická'] as const,
  categories: ['IT', 'Údržba', 'Výroba', 'Bezpečnost', 'Administrativa'] as const
};

// Define floors for each building
const buildingFloors = {
  'Building A': ['1st Floor', '2nd Floor', '3rd Floor'],
  'Building B': ['Ground Floor', '1st Floor', '2nd Floor', 'Basement'],
  'Building C': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor'],
  'Building D': ['Ground Floor', '1st Floor', 'Warehouse Area']
};

// Define areas and elements
const areaElements = {
  'Výtahy': ['Výtah 1', 'Výtah 2', 'Nákladní výtah', 'Výtahová šachta'],
  'Klimatizační a ventilační systémy': ['AC jednotka', 'Ventilace', 'Filtrační systém', 'Tepelná regulace'],
  'Elektroinstalace': ['Osvětlení', 'Zásuvky', 'Rozvaděč', 'Nouzové osvětlení'],
  'Vodoinstalace': ['Vodovodní baterie', 'Toalety', 'Odpad', 'Sprchy']
};

// Init function for database setup and data seeding
async function initializeDatabase() {
  try {
    console.log("Starting database initialization...");
    
    // Insert departments
    console.log("Adding departments...");
    const departmentMap = new Map();
    for (const dept of sampleData.departments) {
      const [inserted] = await db.insert(schema.departments).values(dept).returning();
      departmentMap.set(dept.name, inserted.id);
    }
    
    // Insert buildings
    console.log("Adding buildings...");
    const buildingMap = new Map();
    for (const building of sampleData.buildings) {
      const [inserted] = await db.insert(schema.buildings).values(building).returning();
      buildingMap.set(building.name, inserted.id);
    }
    
    // Insert floors for each building
    console.log("Adding floors...");
    const floorMap = new Map();
    for (const [buildingName, floors] of Object.entries(buildingFloors)) {
      const buildingId = buildingMap.get(buildingName);
      for (const floorName of floors) {
        const [inserted] = await db.insert(schema.floors).values({
          name: floorName,
          buildingId: buildingId,
          description: `${floorName} in ${buildingName}`
        }).returning();
        floorMap.set(`${buildingName}-${floorName}`, inserted.id);
      }
    }
    
    // Insert rooms for each floor
    console.log("Adding rooms...");
    const roomMap = new Map();
    for (const [buildingName, floors] of Object.entries(buildingFloors)) {
      for (const floorName of floors) {
        const floorId = floorMap.get(`${buildingName}-${floorName}`);
        
        // Create some rooms for each floor
        const roomCount = Math.floor(Math.random() * 5) + 3; // 3-7 rooms per floor
        for (let i = 1; i <= roomCount; i++) {
          let roomType = '';
          if (buildingName === 'Building A') roomType = 'Production';
          else if (buildingName === 'Building B') roomType = 'Office';
          else if (buildingName === 'Building C') roomType = 'Lab';
          else roomType = 'Storage';
          
          const roomName = `${i < 10 ? '0' : ''}${i} - ${roomType} ${floorName.replace(' Floor', '')}`;
          const [inserted] = await db.insert(schema.rooms).values({
            name: roomName,
            floorId: floorId,
            description: `${roomType} room on ${floorName}`
          }).returning();
          roomMap.set(`${buildingName}-${floorName}-${roomName}`, inserted.id);
        }
      }
    }
    
    // Insert areas for each room
    console.log("Adding areas and elements...");
    const areaMap = new Map();
    const elementMap = new Map();
    
    // For each room, add 1-3 random areas
    for (const [roomKey, roomId] of roomMap.entries()) {
      const areaTypes = Object.keys(areaElements);
      const areaCount = Math.floor(Math.random() * 3) + 1; // 1-3 areas per room
      
      for (let i = 0; i < areaCount; i++) {
        const areaType = areaTypes[Math.floor(Math.random() * areaTypes.length)];
        const [insertedArea] = await db.insert(schema.areas).values({
          name: areaType,
          roomId: roomId,
          description: `${areaType} in ${roomKey}`
        }).returning();
        
        const areaId = insertedArea.id;
        areaMap.set(`${roomKey}-${areaType}`, areaId);
        
        // Add elements for this area
        const elements = areaElements[areaType as keyof typeof areaElements];
        for (const element of elements) {
          const [insertedElement] = await db.insert(schema.elements).values({
            name: element,
            areaId: areaId,
            description: `${element} in ${areaType}`
          }).returning();
          elementMap.set(`${roomKey}-${areaType}-${element}`, insertedElement.id);
        }
      }
    }
    
    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the script immediately (for ESM modules)
initializeDatabase().then(() => {
  console.log("Setup completed!");
  process.exit(0);
}).catch(err => {
  console.error("Setup failed:", err);
  process.exit(1);
});