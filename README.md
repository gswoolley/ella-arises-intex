# Ella Rises - Web Application

A comprehensive web application for managing participants, events, donations, and surveys for the Ella Rises organization.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Application Features](#application-features)
- [Website Sections & Routes](#website-sections--routes)
- [Demo Survey Feature](#demo-survey-feature)
- [CSV Upload & ETL Pipeline](#csv-upload--etl-pipeline)
- [User Roles & Permissions](#user-roles--permissions)
- [Deployment](#deployment)

---

## Architecture Overview

The application follows a **Model-View-Controller (MVC)** architecture with an **ETL pipeline** for data processing.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │ Controllers  │  │    Views     │      │
│  │ (adminRoutes)│─▶│ (CRUD logic) │─▶│  (EJS pages) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                                │
│         ▼                  ▼                                │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Middleware   │  │  Repositories│                        │
│  │ (auth/perms) │  │ (DB queries) │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Main Tables  │  │Staging Tables│  │ Archive      │       │
│  │ (normalized) │  │ (recent data)│  │ (history)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
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

#### Participant & Event Data
- `personinfo` - Participant information
- `eventtypes` - Event templates
- `eventinstances` - Specific event occurrences
- `participantattendanceinstances` - Event attendance records
- `surveyinstances` - Survey responses
- `participantmilestones` - Participant achievements
- `donations` - Donation records

#### Authentication & User Management
- `loginpermissions` - User accounts with hashed passwords and permission levels
  - Fields: `id`, `email`, `password_hash`, `first_name`, `last_name`, `permission` ('manager' or 'user'), `created_at`, `updated_at`
  - Passwords are hashed using bcrypt (12 rounds) in Node.js before storage
  - Never stores plaintext passwords
  
- `account_requests` - Pending access requests from new users
  - Fields: `id`, `email`, `first_name`, `last_name`, `organization`, `message`, `password_hash`, `status`, `created_at`, `reviewed_at`, `reviewed_by`
  - Status values: 'pending', 'approved', 'rejected'
  - Only managers can view and approve requests
  - Approved requests are converted into `loginpermissions` records
  - Provides audit trail of who approved/rejected requests and when

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

### Accessing the Application

The Ella Rises web application is deployed and accessible at: https://team3-01.is404.net/

Manager login: 
Email: manager@ellaarises.com
Password: manager

User login: 
Email: user@ellaarises.com
Password: user

**Production URL**: 

### Application Sections

1. **Landing Page** - https://team3-01.is404.net/
   - Public marketing and informational site
   - No login required

2. **Public Dashboard** - https://team3-01.is404.net/dashboard
   - Read-only data visualizations
   - No login required

3. **Admin Panel** - https://team3-01.is404.net/admin
   - Requires authentication
   - Login page: https://team3-01.is404.net/admin/login
   - Request access: https://team3-01.is404.net/admin/create

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

## Website Sections & Routes

### Public Pages (No Authentication Required)

#### **1. Landing Page** - `/` or `/ella-rises-landingpage/`
- Marketing and informational homepage
- Ella Rises branding with logo and navigation
- Header navigation includes:
  - About, Programs, Events, Get Involved, Press, Contact Us (→ Demo Placeholder)
  - "See the impact" (→ Dashboard)
  - "Admin Portal" (→ Admin Login)
  - 🫖 Teapot Easter egg (→ HTTP 418 page)
  - Donate button (external link to GiveButter)
- Background bubbles and animations
- Mobile-responsive design

#### **2. Public Dashboard** - `/dashboard`
- Read-only data visualizations
- Interactive charts and metrics
- No login required

#### **3. Demo Placeholder** - `/demo-placeholder`
- Shown when users click unfinished features (About, Programs, Events, etc.)
- Explains these sections are part of the full build
- Provides navigation back to home or dashboard
- Matches Ella Rises branding and styling

#### **4. 404 Error Page** - Any non-existent route
- Custom branded 404 page
- Returns HTTP 404 status code
- Large "404" error code with gradient styling
- Helpful navigation buttons to return home or view dashboard
- Background bubbles matching site theme

#### **5. HTTP 418 "I'm a Teapot"** - `/teapot`
- Easter egg page (accessible via 🫖 emoji in header)
- Returns HTTP 418 status code
- Fun reference to RFC 2324 (Hyper Text Coffee Pot Control Protocol)
- Includes educational "Fun Fact" about the status code
- Animated teapot emoji with steam effect

### Admin Pages (Authentication Required)

#### **Admin Login** - `/admin/login`
- Secure login form with email and password
- Session-based authentication
- Redirects to admin home after successful login

#### **Account Request** - `/admin/create`
- New users can request access
- Form includes: email, name, organization, message, password
- Requests are reviewed by managers in Manager Corner
- Passwords are hashed with bcrypt before storage

#### **Admin Home** - `/admin`
- Dashboard with quick links to all admin features
- Shows user's name and permission level
- Navigation to: Participants, Events, Donations, Surveys, Data Analysis
- Manager-only links: Manager Corner, CSV Upload

#### **Participants Management** - `/admin/participants`
- View, search, and filter all participants
- Detailed participant profiles with attendance, surveys, milestones, donations
- Add, edit, delete participants (managers only)

#### **Events Management** - `/admin/events`
- View upcoming, past, or all events
- Create event templates and instances
- View participant lists for each event
- Edit and delete events (managers only)

#### **Donations Management** - `/admin/donations`
- View all donations with search and sorting
- Monthly and overall donation totals
- Add, edit, delete donations (managers only)

#### **Surveys Management** - `/admin/surveys`
- View all survey responses
- Filter by participant or event
- Edit and delete surveys (managers only)

#### **Data Analysis** - `/admin/data-analysis`
- Embedded Tableau dashboard
- Interactive data visualizations

#### **Manager Corner** - `/admin/manager-corner` (Managers Only)
- Approve/reject account requests
- Manage user accounts and permissions
- Elevate users to manager status
- View pending requests count

#### **CSV Upload** - `/admin/csv-upload` (Managers Only)
- Upload CSV files with participant, event, and survey data
- Automatic ETL pipeline processing
- View upload results showing what was added
- Download CSV button (enabled when target reached)
- Reset demo button to clear all data

---

## Demo Survey Feature

The demo survey feature allows users to submit survey responses via QR code or direct link.

### **QR Code Display** - `/qrcode`
- Displays QR code linking to demo survey form
- **Live Progress Tracking**:
  - Real-time progress bar (updates every 2 seconds)
  - Editable target submission count (1-100)
  - Shows current count vs. target
  - Progress percentage display
- **Auto-Download**: CSV automatically downloads when target is reached
- **Download Button**: Manual CSV download (enabled at 100% progress)
- **Reset Button**: Clears all demo survey submissions
- Mobile-responsive with background bubbles

### **Demo Survey Form** - `/demo-survey`
- **Multi-step conversational survey** (12 steps total)
- **Apple-like UX**: Premium, clean design with smooth transitions
- **Max 4 questions per step** for better user experience
- **Mobile-optimized**: Numeric keyboards, date dropdowns, responsive layout
- **Progress indicator**: Shows "Step X of 12" at top
- **Auto-advancing cards**: Role, field of interest, event, and NPS selections
- **Background bubbles**: Animated decorative elements matching brand

#### Survey Steps:
1. **Basic Info**: First name, last name, date of birth, school/employer
2. **Role Selection**: Participant or Admin (clickable cards, auto-advance)
3. **Field of Interest**: STEM, Arts, or Both (clickable cards, auto-advance)
4. **Location**: City, state, ZIP code
5. **Contact**: Email and phone number
6. **Event Selection**: Choose from 4 hardcoded events (auto-advance)
   - Girls in STEAM Mentoring
   - Monthly Coding Club
   - Intro to Painting Class
   - Monthly Art Studio Workshop
7. **Event Survey**: 4 ratings out of 5 (satisfaction, usefulness, instructor, recommendation)
8. **Overall Rating**: Overall event score out of 5
9. **NPS Bucket**: Promoter or Passive (clickable cards, auto-advance)
10. **Comments**: Open text feedback (textarea)
11. **Milestones**: Dynamic milestone entry with add button, submit survey here
12. **Thank You**: Confirmation message (no submit button)

#### Data Format:
- All data matches CSV upload format exactly
- Date format: `YYYY-MM-DD HH:MM:SS`
- Boolean flags: `TRUE` or `FALSE`
- Milestones: Semicolon-separated (`;`) titles and dates
- Scores: Decimal values allowed (e.g., `4.5`)
- Event data: Hardcoded for each event option

#### Technical Features:
- **Enter key prevention**: Prevents accidental form submission
- **Navigation**: Compact back/next buttons in bottom right
- **Selection clearing**: Back button clears previous selections
- **Hidden fields**: Captures all backend-required data
- **Form validation**: Ensures data completeness before submission
- **Responsive design**: Works seamlessly on mobile and desktop

### Demo Survey Database
- **Table**: `demo_survey`
- **Purpose**: Stores all demo survey submissions
- **Fields**: 37+ fields matching CSV format (participant info, event data, survey responses, milestones, donations)
- **Reset functionality**: Can be cleared via "Reset Demo" button on QR page

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

## How to Use the Website

### For New Users

1. **Request Access**
   - Go to `https://[your-domain]/admin/create`
   - Fill out the account request form with your email, name, and organization
   - Create a password
   - Submit your request

2. **Wait for Approval**
   - A manager will review your request
   - You'll receive notification once approved

3. **Login**
   - Go to `https://[your-domain]/admin/login`
   - Enter your email and password
   - Click "Login"

### For Regular Users (After Login)

1. **View Participants**
   - Navigate to "Participants" from the admin home
   - Search and filter participants
   - Click on any participant to view detailed information

2. **View Events**
   - Navigate to "Events"
   - Filter by upcoming, past, or all events
   - View participant lists for each event

3. **View Donations**
   - Navigate to "Donations"
   - Search and sort donation records
   - View monthly and overall totals

4. **View Data Analysis**
   - Navigate to "Data Analysis"
   - Interact with Tableau dashboard visualizations

### For Managers (Additional Features)

1. **Approve Account Requests**
   - Navigate to "Manager Corner"
   - Review pending account requests
   - Approve or reject requests
   - Edit user permissions

2. **Upload CSV Data**
   - Navigate to "CSV Upload"
   - Click "Choose File" and select your CSV
   - Click "Upload"
   - View results showing what was added to the database

3. **Create/Edit/Delete Records**
   - Managers have full CRUD access to all entities
   - Use the "Add New" buttons on any page
   - Click "Edit" or "Delete" on existing records

4. **Manage Users**
   - Elevate users to manager status
   - Demote managers to regular users
   - Delete user accounts

---

## Support

For questions or issues, contact the development team.

---

## License

Proprietary - Ella Rises Organization
