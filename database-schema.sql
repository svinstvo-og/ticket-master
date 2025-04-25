-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician', 'user');
CREATE TYPE ticket_status AS ENUM ('Otevřený', 'Přiřazeno', 'Probíhá', 'Pozastaveno', 'Vyřešeno', 'Uzavřeno', 'Schváleno', 'Zamítnuto');
CREATE TYPE ticket_priority AS ENUM ('Nízká', 'Střední', 'Vysoká', 'Kritická');
CREATE TYPE ticket_category AS ENUM ('IT', 'Údržba', 'Výroba', 'Bezpečnost', 'Administrativa');

-- Create tables
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE floors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, name)
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  floor_id INTEGER NOT NULL REFERENCES floors(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(floor_id, name)
);

CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, name)
);

CREATE TABLE elements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  area_id INTEGER NOT NULL REFERENCES areas(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(area_id, name)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user',
  department_id INTEGER REFERENCES departments(id),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL,
  priority ticket_priority NOT NULL,
  status ticket_status DEFAULT 'Otevřený',
  
  -- Location info
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  floor_id INTEGER NOT NULL REFERENCES floors(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  element_id INTEGER NOT NULL REFERENCES elements(id),
  
  -- User assignments
  created_by INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  
  -- Department assignment
  department_id INTEGER REFERENCES departments(id),
  
  -- Dates
  due_date TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data TEXT NOT NULL, -- Base64 encoded data
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_history (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_department ON tickets(department_id);
CREATE INDEX idx_tickets_building ON tickets(building_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id);

-- Sample data for departments
INSERT INTO departments (name, description) VALUES
('IT', 'Information Technology Department'),
('Facility Management', 'Facility and Building Management'),
('Production', 'Production and Manufacturing'),
('Administration', 'Administrative Department'),
('Security', 'Security and Safety');

-- Sample data for buildings
INSERT INTO buildings (name, description, address) VALUES
('Building A', 'Main Production Facility', 'Prague Industrial Zone 1'),
('Building B', 'Administrative Office', 'Prague Industrial Zone 1'),
('Building C', 'Research & Development', 'Prague Industrial Zone 2'),
('Building D', 'Storage and Logistics', 'Prague Industrial Zone 2');

-- Sample data for Building A floors
INSERT INTO floors (name, building_id, description) VALUES
('1st Floor', 1, '1st Floor in Building A'),
('2nd Floor', 1, '2nd Floor in Building A'),
('3rd Floor', 1, '3rd Floor in Building A');

-- Sample data for Building B floors
INSERT INTO floors (name, building_id, description) VALUES
('Ground Floor', 2, 'Ground Floor in Building B'),
('1st Floor', 2, '1st Floor in Building B'),
('2nd Floor', 2, '2nd Floor in Building B'),
('Basement', 2, 'Basement in Building B');

-- Sample data for rooms in Building A, 1st Floor
INSERT INTO rooms (name, floor_id, description) VALUES
('101 - Production A', 1, 'Production room on 1st Floor Building A'),
('102 - Office A', 1, 'Office room on 1st Floor Building A'),
('103 - Lab A', 1, 'Laboratory on 1st Floor Building A');

-- Sample data for areas in Room 101 of Building A
INSERT INTO areas (name, room_id, description) VALUES
('Výtahy', 1, 'Elevator area in Room 101'),
('Klimatizační a ventilační systémy', 1, 'HVAC systems in Room 101'),
('Elektroinstalace', 1, 'Electrical systems in Room 101');

-- Sample data for elements in the elevator area
INSERT INTO elements (name, area_id, description) VALUES
('Výtah 1', 1, 'Elevator 1 in Room 101'),
('Výtah 2', 1, 'Elevator 2 in Room 101'),
('Nákladní výtah', 1, 'Freight elevator in Room 101');

-- Sample data for elements in the HVAC area
INSERT INTO elements (name, area_id, description) VALUES
('AC jednotka', 2, 'Air conditioning unit in Room 101'),
('Ventilace', 2, 'Ventilation system in Room 101'),
('Filtrační systém', 2, 'Filtration system in Room 101');

-- Sample data for elements in the electrical area
INSERT INTO elements (name, area_id, description) VALUES
('Osvětlení', 3, 'Lighting system in Room 101'),
('Zásuvky', 3, 'Power outlets in Room 101'),
('Rozvaděč', 3, 'Electrical panel in Room 101');

-- Create an admin user (password is 'admin123')
INSERT INTO users (username, password, full_name, email, role) VALUES
('admin', '$2b$10$x5d5gf8rvV0yMZiT3w0jkeyTwtz0p1wGCG0opJlX6Pk8X8AUwT1Bu', 'System Administrator', 'admin@example.com', 'admin');

-- Create manager user (password is 'manager123')
INSERT INTO users (username, password, full_name, email, role, department_id) VALUES
('manager', '$2b$10$x5d5gf8rvV0yMZiT3w0jkeyTwtz0p1wGCG0opJlX6Pk8X8AUwT1Bu', 'Department Manager', 'manager@example.com', 'manager', 1);

-- Create technician user (password is 'tech123')
INSERT INTO users (username, password, full_name, email, role, department_id) VALUES
('technician', '$2b$10$x5d5gf8rvV0yMZiT3w0jkeyTwtz0p1wGCG0opJlX6Pk8X8AUwT1Bu', 'IT Technician', 'tech@example.com', 'technician', 1);

-- Create regular user (password is 'user123')
INSERT INTO users (username, password, full_name, email, role, department_id) VALUES
('user', '$2b$10$x5d5gf8rvV0yMZiT3w0jkeyTwtz0p1wGCG0opJlX6Pk8X8AUwT1Bu', 'Regular User', 'user@example.com', 'user', 3);