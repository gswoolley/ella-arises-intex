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
npx knex seed:run
```

## Notes

- Auth currently uses in-memory storage for demo. Replace with DB queries once PostgreSQL is ready.
- Flash messages show errors and success messages.
- Sessions expire after 24 hours of inactivity.
- All manager-only routes will be protected with middleware once DB is integrated.

---

**Last Updated**: December 1, 2025  
**Presentation**: Friday, December 5, 2025
