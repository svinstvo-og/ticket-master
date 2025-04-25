# Ticket Submission Platform Database Schema

## Entity Relationship Diagram (ERD)

```
+---------------+     +---------------+     +---------------+
|  departments  |     |    buildings  |     |     users     |
+---------------+     +---------------+     +---------------+
| id (PK)       |     | id (PK)       |     | id (PK)       |
| name          |     | name          |     | username      |
| description   |     | address       |     | password      |
| createdAt     |     | description   |     | fullName      |
+---------------+     | createdAt     |     | email         |
       ↑               +---------------+     | role          |
       |                      ↑              | departmentId  |----+
       |                      |              | isActive      |    |
       |                      |              | createdAt     |    |
       |                      |              | updatedAt     |    |
       |                      |              +---------------+    |
       |                      |                     ↑             |
       |                      |                     |             |
+------+--------+    +--------+------+    +---------+---------+  |
|    tickets    |    |    floors     |    | ticketAttachments |  |
+---------------+    +---------------+    +-------------------+  |
| id (PK)       |    | id (PK)       |    | id (PK)           |  |
| title         |    | name          |    | ticketId          |--↙
| description   |    | buildingId    |----+ name              |
| category      |    | description   |    | type              |
| priority      |    | createdAt     |    | size              |
| status        |    +---------------+    | data              |
| buildingId    |----        ↑            | uploadedBy        |----+
| floorId       |----        |            | createdAt         |    |
| roomId        |----        |            +-------------------+    |
| areaId        |----        |                                     |
| elementId     |----+      |             +-------------------+    |
| createdBy     |----+      |             |  ticketComments   |    |
| assignedTo    |----+      |             +-------------------+    |
| approvedBy    |----+      |             | id (PK)           |    |
| departmentId  |----+      |             | ticketId          |    |
| dueDate       |           |             | userId            |----+
| resolvedAt    |    +------+-------+     | comment           |
| closedAt      |    |     rooms     |    | isInternal        |
| createdAt     |    +---------------+    | createdAt         |
| updatedAt     |    | id (PK)       |    +-------------------+
+---------------+    | name          |
       ↑              | floorId       |----+  +---------------+
       |              | description   |    |  | ticketHistory |
       |              | createdAt     |    |  +---------------+
       |              +---------------+    |  | id (PK)       |
       |                     ↑             |  | ticketId      |
       |                     |             |  | userId        |----+
       |              +------+-------+     |  | field         |    |
       |              |     areas     |    |  | oldValue      |    |
       |              +---------------+    |  | newValue      |    |
       |              | id (PK)       |    |  | createdAt     |    |
       |              | name          |    |  +---------------+    |
       |              | roomId        |----+         ↑             |
       |              | description   |              |             |
       |              | createdAt     |              |             |
       |              +---------------+              |             |
       |                      ↑                      |             |
       |                      |                      |             |
       |               +------+-------+              |             |
       |               |   elements    |              |             |
       |               +---------------+              |             |
       +-------------->| id (PK)       |<-------------+             |
                      | name          |                            |
                      | areaId        |                            |
                      | description   |                            |
                      | createdAt     |                            |
                      +---------------+                            |
                                                                   |
                                                                   |
                                                                   |
                                                                   |
                                                                   |
                                                                   |
                       User roles:                                 |
                       - admin        (full access)                |
                       - manager      (department head)            |
                       - technician   (assigned to tickets)        |
                       - user         (regular users)              +
```

## Table Descriptions

### Users

Stores all system users with roles and permissions.

- **Role Types**: Admin, Manager, Technician, User
- **Relationships**:
  - A user belongs to one department (optional)
  - A user can create multiple tickets
  - A user can be assigned to multiple tickets
  - A user can approve multiple tickets

### Departments

Organizational units within the company.

- **Relationships**:
  - A department has many users
  - A department is responsible for many tickets

### Buildings

Physical structures where tickets are assigned.

- **Relationships**:
  - A building has many floors
  - A building has many tickets assigned to it

### Floors

Levels within buildings.

- **Relationships**:
  - A floor belongs to one building
  - A floor has many rooms
  - A floor appears in many tickets

### Rooms

Specific locations within floors.

- **Relationships**:
  - A room belongs to one floor
  - A room has many areas
  - A room appears in many tickets

### Areas

Functional zones within rooms.

- **Relationships**:
  - An area belongs to one room
  - An area has many elements
  - An area appears in many tickets

### Elements

Specific equipment or components within areas.

- **Relationships**:
  - An element belongs to one area
  - An element appears in many tickets

### Tickets

Core entity for issue tracking.

- **Status Types**: Open, Assigned, In Progress, On Hold, Resolved, Closed, Approved, Rejected
- **Priority Levels**: Low, Medium, High, Critical
- **Category Types**: IT, Maintenance, Production, Security, Administrative
- **Relationships**:
  - A ticket is created by one user
  - A ticket can be assigned to one user (optional)
  - A ticket can be approved by one user (optional)
  - A ticket belongs to one department (optional)
  - A ticket is located in one building, floor, room, area, and element
  - A ticket has many comments
  - A ticket has many attachments
  - A ticket has many history entries

### Ticket Comments

Communication and updates related to tickets.

- **Relationships**:
  - A comment belongs to one ticket
  - A comment is made by one user

### Ticket Attachments

Files attached to tickets.

- **Relationships**:
  - An attachment belongs to one ticket
  - An attachment is uploaded by one user (optional)

### Ticket History

Audit trail of ticket changes.

- **Relationships**:
  - A history entry belongs to one ticket
  - A history entry is made by one user (optional)

## Database Design Features

1. **Hierarchical Location Structure**: Building > Floor > Room > Area > Element
2. **Comprehensive Role-Based Access**: Four distinct user roles with specific permissions
3. **Complete Audit Trail**: History tracking for all ticket changes
4. **Flexible Categorization**: Multiple classification dimensions (category, priority, status)
5. **Department Organization**: Departmental ownership of tickets and users
6. **Rich Metadata**: Timestamps for creation, updates, resolution, and closure
7. **Communication Support**: Internal and external comments on tickets
8. **File Management**: Support for file attachments with metadata