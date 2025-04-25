import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Delete existing users first to start fresh
    await pool.query("DELETE FROM users");
    
    // Create a new admin user with a properly hashed password
    const hashedPassword = await hashPassword("password123");
    
    const result = await pool.query(
      `INSERT INTO users (username, password, full_name, email, role, department_id, is_active, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, role`,
      ["admin", hashedPassword, "Administrator", "admin@example.com", "admin", 1, true, "+420123456789"]
    );
    
    console.log("Admin user created:", result.rows[0]);
    
    // Create other test users
    const managerPassword = await hashPassword("password123");
    await pool.query(
      `INSERT INTO users (username, password, full_name, email, role, department_id, is_active, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ["manager", managerPassword, "Department Manager", "manager@example.com", "manager", 2, true, "+420987654321"]
    );
    
    const technicianPassword = await hashPassword("password123");
    await pool.query(
      `INSERT INTO users (username, password, full_name, email, role, department_id, is_active, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ["technician", technicianPassword, "Tech Support", "tech@example.com", "technician", 1, true, "+420111222333"]
    );
    
    const userPassword = await hashPassword("password123");
    await pool.query(
      `INSERT INTO users (username, password, full_name, email, role, department_id, is_active, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ["user", userPassword, "Regular User", "user@example.com", "user", 3, true, "+420444555666"]
    );

    console.log("All test users created successfully");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await pool.end();
  }
}

createAdmin().catch(console.error);