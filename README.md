# Ella Rises - Web Application

A comprehensive web application for managing participants, events, donations, and surveys for the Ella Rises organization.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Application Features](#application-features)
- [CSV Upload & ETL Pipeline](#csv-upload--etl-pipeline)
- [User Roles & Permissions](#user-roles--permissions)
- [Deployment](#deployment)

---

## Architecture Overview

The application follows a **Model-View-Controller (MVC)** architecture with an **ETL pipeline** for data processing.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │ Controllers  │  │    Views     │      │
│  │ (adminRoutes)│─▶│ (CRUD logic) │─▶│  (EJS pages) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                                 │
│         ▼                  ▼                                 │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Middleware   │  │  Repositories│                        │
│  │ (auth/perms) │  │ (DB queries) │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Main Tables  │  │Staging Tables│  │ Archive      │      │
│  │ (normalized) │  │ (recent data)│  │ (history)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### **1. Routes** (`/routes`)
- `adminRoutes.js` - Admin panel routes (authentication, CRUD, CSV upload)
- `dashboardRoutes.js` - Public dashboard routes

#### **2. Controllers** (`/controller`)
- Handle business logic and request/response flow
- `admin/app/` - CRUD controllers for participants, events, donations
- `admin/auth/` - Authentication and account request controllers
- `uploadController.js` - CSV upload page controller

#### **3. Models/Repositories** (`/models`)
- Database access layer using Knex.js
- Each repository handles queries for a specific entity
- Examples: `participantRepository.js`, `eventRepository.js`, `donationRepository.js`

#### **4. Views** (`/views`)
- EJS templates for dynamic HTML rendering
- `admin/app/` - Admin panel pages
- `admin/auth/` - Login and account request pages
- `public/` - Public dashboard

#### **5. ETL Pipeline** (`/etl`)
- `mapCsvToStaging.js` - Maps CSV columns to staging table
- `normalize.js` - Transforms raw data into normalized database schema

---

## Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Query Builder**: Knex.js
- **Template Engine**: EJS
- **Session Management**: express-session
- **File Upload**: Multer
- **CSV Parsing**: csv-parser
- **Date Handling**: Luxon
- **Deployment**: AWS Elastic Beanstalk

---

## Database Schema

### Main Tables (Normalized Data)
- `personinfo` - Participant information
- `eventtypes` - Event templates
- `eventinstances` - Specific event occurrences
- `participantattendanceinstances` - Event attendance records
- `surveyinstances` - Survey responses
- `participantmilestones` - Participant achievements
- `donations` - Donation records
- `loginpermissions` - User accounts and permissions
- `account_requests` - Pending access requests

### Staging Tables (Recent Upload Data)
- `stagingrawsurvey` - Raw CSV data (unnormalized)
- `stagingarchive` - Historical archive of raw uploads
- `staging_personinfo` - Recently added participants
- `staging_eventinstances` - Recently added events
- `staging_participantattendanceinstances` - Recent attendance
- `staging_surveyinstances` - Recent surveys
- `staging_participantmilestones` - Recent milestones
- `staging_donations` - Recent donations

**Note**: Staging tables are cleared at the start of each CSV upload and show only the most recent data added.

---

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ella-arises-intex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=ella_rises
   DB_PORT=5432

   # Session Secret
   SESSION_SECRET=your-secret-key-here

   # Environment
   NODE_ENV=development
   ```

4. **Set up the database**
   
   Run the SQL schema from `/txt-instruction-files/main_tables.txt` to create all tables.

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Main site: `http://localhost:3016/`
   - Admin panel: `http://localhost:3016/admin`
   - Public dashboard: `http://localhost:3016/dashboard`

---

## Application Features

### Public Features
- **Landing Page** - Marketing/informational site
- **Public Dashboard** - Read-only data visualizations

### Admin Features (Authentication Required)

#### **Participants Management**
- View all participants with search and filtering
- Add new participants manually
- Edit participant information
- Delete participants (cascades to related data)
- View detailed participant profiles with:
  - Event attendance history
  - Survey responses
  - Milestones achieved
  - Donation history

#### **Events Management**
- View upcoming, past, or all events
- Create event templates (reusable event types)
- Create event instances from templates
- View participant lists for each event
- Edit and delete events

#### **Donations Management**
- View all donations with search and sorting
- Add new donations
- Edit donation amounts and dates
- Delete donations
- View monthly and overall donation totals

#### **Surveys Management**
- View all survey responses
- Filter by participant or event
- Edit survey data
- Delete surveys

#### **Data Analysis**
- Embedded Tableau dashboard
- Interactive data visualizations

#### **CSV Upload** (Manager Only)
- Upload CSV files with participant, event, and survey data
- Automatic data normalization and validation
- View upload results showing what was added
- Historical archive of all uploads

### Manager-Only Features
- **Manager Corner**
  - Approve/reject account requests
  - Manage user accounts
  - Elevate users to manager status
  - View pending requests count
- **All CRUD operations** (regular users have read-only access)

---

## CSV Upload & ETL Pipeline

### How It Works

1. **Upload CSV File**
   - Manager uploads CSV via `/admin/csv-upload`
   - File is temporarily stored in `/uploads` directory

2. **Clear Staging Tables**
   - All `staging_*` tables are truncated
   - Ensures only new data is shown in results

3. **Map to Raw Staging**
   - CSV columns are mapped to `stagingrawsurvey` table
   - All data stored as text for flexibility

4. **Normalization Process**
   - Raw data is transformed into normalized schema
   - Participants are created/updated in `personinfo`
   - Events are created in `eventtypes` and `eventinstances`
   - Attendance records link participants to events
   - Surveys are associated with attendance
   - Milestones and donations are parsed and inserted
   - **Dual insertion**: Data goes into both main tables AND staging tables

5. **Archive & Cleanup**
   - Raw data is archived to `stagingarchive`
   - `stagingrawsurvey` is truncated for next upload
   - Temporary CSV file is deleted

6. **Display Results**
   - Upload page shows data from `staging_*` tables
   - Users can verify what was just added

### CSV Format

The CSV must have these columns:
- Participant info: Email, FirstName, LastName, DOB, Role, Phone, City, State, Zip, etc.
- Event info: EventName, EventType, EventDateTimeStart, EventLocation, etc.
- Registration: RegistrationStatus, RegistrationAttendedFlag, etc.
- Survey: SurveySatisfactionScore, SurveyOverallScore, SurveyNPSBucket, etc.
- Milestones: MilestoneTitles (semicolon-separated), MilestoneDates (semicolon-separated)
- Donations: DonationHistory (format: `YYYY-MM-DD:$amount;YYYY-MM-DD:$amount`)

### Date Formats Supported
- `YYYY-MM-DD` (e.g., 2024-10-06)
- `M/D/YY` (e.g., 10/6/24)
- `M/D/YY H:mm` (e.g., 10/6/24 10:00)

---

## User Roles & Permissions

### Manager
- Full CRUD access to all entities
- Can upload CSV files
- Can approve/reject account requests
- Can manage user accounts and permissions

### Regular User
- Read-only access to all data
- Can view participants, events, donations, surveys
- Cannot create, edit, or delete records
- Cannot access Manager Corner or CSV upload

### Public (No Authentication)
- Access to landing page
- Access to public dashboard

---

## Deployment

### AWS Elastic Beanstalk

The application is configured for deployment on AWS Elastic Beanstalk.

**Key Configuration Files:**
- `.ebextensions/nodecommand.config` - EB configuration
- `.platform/nginx/conf.d/` - Nginx configuration
- `knexfile.js` - Database configuration (uses RDS_* environment variables)

**Environment Variables (Production):**
- `RDS_HOSTNAME` - Database host
- `RDS_USERNAME` - Database user
- `RDS_PASSWORD` - Database password
- `RDS_DB_NAME` - Database name
- `RDS_PORT` - Database port
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV=production`

**Security Features:**
- Automatic HTTPS redirect in production
- Session cookies secured in production
- Proxy trust for load balancer
- Health check endpoint for ELB

---

## Project Structure

```
ella-arises-intex/
├── controller/           # Request handlers
│   ├── admin/
│   │   ├── app/         # Admin CRUD controllers
│   │   └── auth/        # Authentication controllers
│   ├── dashboardController.js
│   └── uploadController.js
├── etl/                 # ETL pipeline
│   ├── mapCsvToStaging.js
│   └── normalize.js
├── models/              # Database repositories
│   ├── authRepository.js
│   ├── participantRepository.js
│   ├── eventRepository.js
│   └── ...
├── routes/              # Route definitions
│   ├── adminRoutes.js
│   └── dashboardRoutes.js
├── views/               # EJS templates
│   ├── admin/
│   └── public/
├── public/              # Static files
│   ├── images/
│   └── ella-rises-landingpage/
├── uploads/             # Temporary CSV uploads
├── util/                # Utilities
│   └── db              # Database connection
├── index.js            # Main application entry point
├── knexfile.js         # Database configuration
└── package.json        # Dependencies
```

---

## Development

### Running Locally
```bash
npm start
```

### Environment
- Development: Uses local PostgreSQL database
- Production: Uses AWS RDS PostgreSQL

### Adding New Features
1. Create repository functions in `/models`
2. Create controller logic in `/controller`
3. Add routes in `/routes`
4. Create EJS views in `/views`
5. Update this README if needed

---

## Support

For questions or issues, contact the development team.

---

## License

Proprietary - Ella Rises Organization
