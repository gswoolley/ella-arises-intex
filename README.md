# Ella Rises INTEX Project

A Node.js/Express web application for managing participants, events, surveys, milestones, and donations for the Ella Rises nonprofit. Built with EJS, PostgreSQL, and deployed on AWS.

## Features

- **User Authentication**: Manager and common user roles
- **CRUD Management**: Participants, Events, Surveys, Milestones, Donations
- **Role-Based Access**: Managers maintain data; common users view only
- **Responsive UI**: Built with EJS templates and modern CSS
- **Secure Sessions**: Express sessions with flash messages

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templating, HTML, CSS
- **Database**: PostgreSQL (via Knex.js ORM)
- **Security**: bcrypt, helmet, express-session
- **Deployment**: AWS (Elastic Beanstalk + RDS)

## Local Setup

### Prerequisites

- Node.js (v14+)
- npm
- PostgreSQL (local or AWS RDS)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/gswoolley/ella-arises-intex.git
cd ella-arises-intex
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

4. Update `.env` with your database credentials (leave blank for now if using mock auth):

```
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=ella_rises_dev
```

### Running Locally

```bash
npm start
```

Visit `http://localhost:3000` in your browser.

### Demo Credentials

For testing (works without a database):

**Manager Account:**

- Email: `manager@ellarises.org`
- Password: `manager123`

**Common User Account:**

- Email: `user@ellarises.org`
- Password: `user123`

## Project Structure

```
ella-arises-intex/
├── app.js                    # Express app entry point
├── knexfile.js              # Knex database configuration
├── .env.example             # Environment template
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── home.js              # Landing page
│   └── ... (others)
├── src/
│   ├── routes/              # CRUD routes (participants, events, etc.)
│   ├── controllers/         # Route handlers
│   ├── models/              # Database models (Knex)
│   ├── middleware/          # Auth, validation middleware
│   └── validation/          # Request schemas
├── views/
│   ├── layout.ejs           # Main layout
│   ├── index.ejs            # Landing page
│   ├── partials/            # Header, footer, etc.
│   └── (participants, events, surveys, etc.)
├── public/
│   ├── css/                 # Stylesheets
│   └── js/                  # Client-side scripts
└── db/
    ├── migrations/          # Knex migrations (when DB ready)
    └── seeds/               # Seed data (when DB ready)
```

## Development Workflow

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make changes and commit:

```bash
git add .
git commit -m "feat: your message here"
git push origin feature/your-feature-name
```

3. Open a pull request to `main` for review.

## Database Setup (When Ready)

Once your team provisions an AWS RDS PostgreSQL instance:

1. Update `.env` with RDS connection details
2. Run Knex migrations:

```bash
npx knex migrate:latest
```

3. Seed sample data:

```bash
npx knex seed:run
```

## Deployment (AWS)

### Deploy to Elastic Beanstalk

```bash
# Install EB CLI
brew install awsebcli

# Initialize EB app (one time)
eb init -p node.js-18 ella-arises-intex

# Create environment
eb create ella-rises-prod

# Deploy
eb deploy
```

### Configure Custom Domain & HTTPS

1. Register domain or use `is404.net` subdomain
2. Create Route53 DNS record pointing to your EB environment
3. Request ACM certificate for your domain
4. Attach certificate to load balancer in EB console

## Testing

```bash
npm test
```

(Tests coming soon)

## Documentation

- **Rubric**: See course-specific requirements
- **Normalization Spreadsheet**: Maintained by database team
- **ERD**: Database ER diagram (link in team docs)
- **Analytics Dashboard**: Embedded in app (pending analytics team)

## Team Roles

- **Backend/App** (you): Routes, controllers, views, auth
- **Database** (team): Normalization, AWS RDS setup, migrations
- **AWS/DevOps** (team): Elastic Beanstalk, RDS, Route53, ACM
- **Analytics** (team): Python EDA, Tableau dashboard

## Common Commands

```bash
# Run locally
npm start

# Run Knex migrations
npx knex migrate:latest

# Create new migration
npx knex migrate:make migration_name

# Seed database
npm run seed
```

## Notes

- Auth currently uses in-memory storage for demo. Replace with DB queries once PostgreSQL is ready.
- Flash messages show errors and success messages.
- Sessions expire after 24 hours of inactivity.
- All manager-only routes will be protected with middleware once DB is integrated.

---

## Routes & Views — Detailed Reference

### Public Routes (No Login Required)

#### `GET /` - Landing Page

- **File**: `routes/home.js` → `views/index.ejs`
- **Description**: Welcome page explaining Ella Rises mission. Shows different content based on login status.
  - **Not Logged In**: Shows login/register links and donation CTA
  - **Logged In (User)**: Shows view-only navigation to participants, events, surveys
  - **Logged In (Manager)**: Shows maintenance links to manage all resources

#### `GET /ping` - Ping Test

- **File**: `routes/ping.js`
- **Description**: Simple health check route. Returns JSON `{ "message": "pong" }`

#### `GET /teapot` - HTTP 418 Test

- **File**: `routes/teapot.js`
- **Description**: Returns HTTP 418 status with "I'm a teapot ☕" message. Required by IS 404 rubric.

---

### Authentication Routes

#### `GET /auth/login` - Login Form

- **File**: `routes/auth.js` → `views/auth/login.ejs`
- **Description**: Displays login form. Allows user to enter email and password.
- **Demo**: Use `manager@ellarises.org / manager123` or `user@ellarises.org / user123`

#### `POST /auth/login` - Process Login

- **File**: `routes/auth.js`
- **Description**: Validates email/password against in-memory user list (TODO: replace with DB).
  - On success: Creates session and redirects to home
  - On failure: Flashes error message and redirects back to login

#### `GET /auth/register` - Register Form

- **File**: `routes/auth.js` → `views/auth/register.ejs`
- **Description**: Displays registration form. User enters name, email, password.

#### `POST /auth/register` - Process Registration

- **File**: `routes/auth.js`
- **Description**: Creates new user account with bcrypt-hashed password.
  - On success: Creates session and redirects to home
  - On failure: Flashes error (missing fields, password mismatch, email exists) and redirects back

#### `GET /auth/logout` - Logout

- **File**: `routes/auth.js`
- **Description**: Destroys session and redirects to home with logout message.

---

### Participant Management Routes

#### `GET /participants` - List Participants

- **File**: `src/routes/participants.js` → `views/participants/list.ejs`
- **Requires Auth**: Yes (ensureAuthenticated middleware - coming soon)
- **Description**: Displays all participants with search/filter (TODO: implement DB queries).
- **Permissions**:
  - Common user: View only
  - Manager: See edit/delete buttons

#### `GET /participants/new` - New Participant Form

- **File**: `src/routes/participants.js` → `views/participants/new.ejs`
- **Requires Auth**: Yes + Manager role (TODO: wire middleware)
- **Description**: Form to create new participant. Fields: first_name, last_name, email, etc.

#### `POST /participants` - Create Participant

- **File**: `src/routes/participants.js`
- **Controller**: `src/controllers/participantsController.js`
- **Requires Auth**: Yes + Manager role
- **Description**: Inserts new participant into database (TODO: wire controller).

#### `GET /participants/:id` - View Participant

- **File**: `src/routes/participants.js` → `views/participants/show.ejs`
- **Requires Auth**: Yes
- **Description**: Displays detailed view of single participant.

#### `GET /participants/:id/edit` - Edit Participant Form

- **Requires Auth**: Yes + Manager role (TODO: add route)
- **Description**: Pre-populated form to edit participant details.

#### `POST /participants/:id` - Update Participant

- **Requires Auth**: Yes + Manager role (TODO: add route)
- **Description**: Updates participant record in database.

#### `DELETE /participants/:id` - Delete Participant

- **Requires Auth**: Yes + Manager role (TODO: add route)
- **Description**: Removes participant from database.

---

### Events Management Routes

#### `GET /events` - List Events

- **File**: `src/routes/events.js` → `views/events/list.ejs`
- **Requires Auth**: Yes
- **Description**: Displays all events/workshops. (TODO: implement full CRUD)

#### `GET /events/new` - New Event Form

- **Requires Auth**: Yes + Manager role (TODO: add route)

#### `POST /events` - Create Event

- **Requires Auth**: Yes + Manager role (TODO: add route)

---

### Surveys Management Routes

#### `GET /surveys` - List Surveys

- **File**: `src/routes/surveys.js` → `views/surveys/list.ejs`
- **Requires Auth**: Yes
- **Description**: Displays post-event surveys. (TODO: implement full CRUD)

#### `GET /surveys/new` - New Survey Form

- **Requires Auth**: Yes + Manager role (TODO: add route)

#### `POST /surveys` - Create Survey

- **Requires Auth**: Yes + Manager role (TODO: add route)

---

### Milestones Management Routes

#### `GET /milestones` - List Milestones

- **File**: `src/routes/milestones.js` → `views/milestones/list.ejs`
- **Requires Auth**: Yes
- **Description**: Displays milestones (achievements). (TODO: implement full CRUD)
- **Note**: Milestones have 1:M relationship with participants.

#### `GET /milestones/new` - New Milestone Form

- **Requires Auth**: Yes + Manager role (TODO: add route)

#### `POST /milestones` - Create Milestone

- **Requires Auth**: Yes + Manager role (TODO: add route)

---

### Donations Routes

#### `GET /donations` - Donations Page

- **File**: `src/routes/donations.js` → `views/donations/new.ejs`
- **Requires Auth**: No (public donation form)
- **Description**: Displays donation form. Allows anyone to contribute.

#### `GET /donations/new` - Donation Form

- **File**: `src/routes/donations.js` → `views/donations/new.ejs`
- **Requires Auth**: No
- **Description**: Same as `/donations`. (TODO: add POST handler for payment processing)

#### `POST /donations` - Process Donation

- **Requires Auth**: No (TODO: add route)
- **Description**: Handles payment processing and stores donation record.

---

## Views & Layouts

### Layout Structure

#### `views/layout.ejs` - Main Layout

- Wraps every page with header/footer
- Sets up HTML structure and basic styles
- Displays page `title` in browser tab

#### `views/partials/header.ejs` - Navigation Header

- Black header bar with navigation links
- Shows:
  - **Home** link
  - **Ping** link
  - **Login/Register** links (if not logged in)
  - **User name, role badge, Logout button** (if logged in)

#### `views/partials/footer.ejs` - Footer

- Displays at bottom of every page

### Page Views

#### `views/index.ejs` - Landing Page

- Welcome message about Ella Rises mission
- Conditional content based on login status
- Donation CTA for visitors
- Navigation shortcuts for logged-in users

#### `views/auth/login.ejs` - Login Form

- Email and password fields
- Styled form with error message display
- Link to register page
- Demo credentials (for testing)

#### `views/auth/register.ejs` - Register Form

- Name, email, password, confirm password fields
- Error handling for missing fields, password mismatch, duplicate email
- Link to login page

#### `views/participants/list.ejs` - Participants List

- (TODO: Implement table with participants, search, edit/delete buttons for managers)

#### `views/participants/new.ejs` - New Participant Form

- (TODO: Form to add participant)

#### `views/participants/show.ejs` - Participant Detail

- (TODO: Display single participant details, edit/delete options for managers)

#### `views/events/list.ejs` - Events List

- (TODO: Implement list of workshops/events)

#### `views/surveys/list.ejs` - Surveys List

- (TODO: Implement list of post-event surveys with response data)

#### `views/milestones/list.ejs` - Milestones List

- (TODO: Implement list of milestone achievements, link to participants)

#### `views/donations/new.ejs` - Donation Form

- Name, email, donation amount fields
- (TODO: Add payment processing integration)

---

## Middleware & Authentication

### `src/middleware/auth.js`

#### `ensureAuthenticated(req, res, next)`

- Checks if user is logged in (session exists)
- If not: Redirects to `/auth/login` with flash message
- If yes: Allows access to route
- **Usage**: `router.get('/participants', ensureAuthenticated, controller)`

#### `ensureManager(req, res, next)`

- Checks if user is logged in AND has `role === 'manager'`
- If not: Returns 403 error and redirects to home
- **Usage**: `router.post('/participants', ensureAuthenticated, ensureManager, controller)`

---

## Controllers

### `src/controllers/participantsController.js`

- Contains all participant CRUD logic
- Methods:
  - `list()` - Fetch all participants
  - `show()` - Fetch single participant
  - `newForm()` - Render new form
  - `create()` - Insert participant
  - `edit()` - Render edit form
  - `update()` - Update participant
  - `delete()` - Remove participant
- (TODO: Replace placeholder methods with real DB queries using Knex)

---

## Key Implementation Notes

### Authentication Flow

1. User visits `/auth/login` or `/auth/register`
2. Session middleware (`express-session`) creates session
3. On successful login/register: `req.session.user` is set with `{ id, email, role, name }`
4. On every request: Middleware copies `req.session.user` to `res.locals.currentUser`
5. All views can access `currentUser` to show/hide content by role
6. On logout: `req.session.user` is cleared

### Role-Based Access

- **Common User** (`role: 'user'`): Can view participants, events, surveys but not edit
- **Manager** (`role: 'manager'`): Full CRUD access to all resources
- Middleware enforces this with `ensureManager()` guard



**Last Updated**: December 1, 2025  
**Presentation**: Friday, December 5, 2025
