import pkg from 'pg';
const { Pool } = pkg;
import { exit } from 'process';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTestData() {
  try {
    console.log('Creating test buildings...');
    const buildingResult = await pool.query(`
      INSERT INTO buildings (name, address, description)
      VALUES 
        ('Building A', '123 Main St', 'Main office building'),
        ('Building B', '456 Secondary St', 'Secondary office'),
        ('Building C', '789 Third St', 'Manufacturing facility')
      RETURNING id, name;
    `);
    
    const buildings = buildingResult.rows;
    console.log('Created buildings:', buildings);
    
    for (const building of buildings) {
      console.log(`Creating floors for building ${building.name}...`);
      const floorResult = await pool.query(`
        INSERT INTO floors (building_id, name, level)
        VALUES 
          (${building.id}, 'Ground Floor', 0),
          (${building.id}, 'First Floor', 1),
          (${building.id}, 'Second Floor', 2)
        RETURNING id, name;
      `);
      
      const floors = floorResult.rows;
      console.log(`Created floors for building ${building.name}:`, floors);
      
      for (const floor of floors) {
        console.log(`Creating rooms for ${building.name} - ${floor.name}...`);
        const roomResult = await pool.query(`
          INSERT INTO rooms (floor_id, name, number)
          VALUES 
            (${floor.id}, 'Conference Room', '${floor.id}01'),
            (${floor.id}, 'Office', '${floor.id}02'),
            (${floor.id}, 'Kitchen', '${floor.id}03')
          RETURNING id, name;
        `);
        
        const rooms = roomResult.rows;
        console.log(`Created rooms for ${building.name} - ${floor.name}:`, rooms);
        
        for (const room of rooms) {
          console.log(`Creating areas for room ${room.name}...`);
          const areaResult = await pool.query(`
            INSERT INTO areas (room_id, name)
            VALUES 
              (${room.id}, 'North'),
              (${room.id}, 'South'),
              (${room.id}, 'East'),
              (${room.id}, 'West')
            RETURNING id, name;
          `);
          
          const areas = areaResult.rows;
          console.log(`Created areas for room ${room.name}:`, areas);
          
          for (const area of areas) {
            console.log(`Creating elements for area ${area.name}...`);
            const elementResult = await pool.query(`
              INSERT INTO elements (area_id, name, type)
              VALUES 
                (${area.id}, 'Computer', 'IT Equipment'),
                (${area.id}, 'Printer', 'IT Equipment'),
                (${area.id}, 'Light', 'Electrical'),
                (${area.id}, 'AC Unit', 'HVAC')
              RETURNING id, name;
            `);
            
            const elements = elementResult.rows;
            console.log(`Created elements for area ${area.name}:`, elements);
          }
        }
      }
    }
    
    console.log('All test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await pool.end();
  }
}

createTestData();