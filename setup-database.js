import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Read the SQL file
    const sqlFilePath = path.resolve(__dirname, 'database-schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Executing database setup script...');
    
    // Execute the SQL statements
    await client.query(sql);
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the database setup
setupDatabase();