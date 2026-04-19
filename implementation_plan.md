# Smart Attendance System Implementation Plan

This document outlines the architecture and implementation plan for the Smart Attendance System for Maharaja Ranjit Singh Punjab Technical University. This system addresses manual attendance inefficiencies by using geolocation and photo verification.

## User Review Required

> [!IMPORTANT]
> **Firebase Setup Required**: This project relies heavily on Firebase for authentication, database, and storage. You will need to create a Firebase Project and provide the configuration credentials for both the Frontend SDK and the Backend Admin SDK before we can fully test the application.
> 
> **AI Face Verification**: The requirements mention "manual verification" by the teacher currently, with "Face recognition AI" as a future scope. Is it correct to proceed with the teacher manually verifying the uploaded photos in this v1, or do you expect automated facial recognition to be included right away?
> 
> **Map / Geolocation Threshold**: What is the acceptable distance radius (e.g., 50 meters, 100 meters) between the student's location and the classroom coordinate for the system to automatically mark them as present?

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (with Chart.js for graphical reports)
- **Backend**: Node.js with Express.js
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Role-based: Admin, Department, Teacher, Student)
- **Storage**: Firebase Storage (for storing student photo uploads)

## Proposed Project Structure

We will structure the project as a monorepo containing both the static frontend assets and the Node.js backend server.

```text
c:/Users/rupin/Desktop/projet/Smart_attendance/
├── public/                 # Frontend Web Application
│   ├── index.html          # Landing/Login page
│   ├── css/                # Styling (modern, premium design system)
│   │   └── style.css
│   ├── js/                 # Client-side javascript
│   │   ├── firebase-config.js
│   │   ├── auth.js         # Unified login & routing logic
│   │   ├── geo.js          # Geolocation helper
│   │   ├── app.js          # Main app logic
│   │   └── charts.js       # Chart.js initialization for reports
│   ├── portals/            # Role-specific dashboards
│   │   ├── admin.html
│   │   ├── department.html
│   │   ├── teacher.html
│   │   └── student.html
│   └── assets/             # Icons, images
├── server/                 # Node.js / Express Backend
│   ├── index.js            # Main entry point
│   ├── config/
│   │   └── firebase-admin.js # Firebase Admin SDK setup
│   ├── routes/             # Express routes (api/classes, api/attendance...)
│   ├── controllers/        # Business logic for routes
│   └── middleware/         # Auth verification middleware
├── package.json
└── README.md
```

## Key Feature Implementation

### 1. Role-Based Login System
- Users will log in via Firebase Authentication (Email/Password).
- A Firestore collection `users` will store additional metadata, including the user's `role` (Admin, Department, Teacher, Student).
- Upon login, the frontend will check the user's role and redirect them to their respective portal (`/portals/admin.html`, etc.).

### 2. Teacher Class Creation & Link Sharing
- Teachers can create a "Class Session" record in Firestore, which stores the current geo-coordinates of the teacher/classroom and generates a unique Session ID.
- The teacher portal will generate a shareable link containing the Session ID (`/portals/student.html?session=XYZ`).

### 3. Student Registration (Geolocation & Photo)
- When a student opens the link, the browser's `navigator.geolocation` API captures their coordinates.
- The UI will prompt the student to upload a selfie (stored in Firebase Storage).
- If the student's coordinates match the teacher's session coordinates (within an established threshold), their attendance record is created as "Pending Verification".

### 4. Verification & Auto-Marking
- The Teacher portal displays a list of students who have submitted attendance for the active session.
- The teacher views the uploaded face photo and the geolocation validation checkmark.
- The system defaults the student to "Present" if the geo-check passes, but gives the teacher final override capability before committing the attendance.

### 5. Dashboards & Graphical Reports
- The Student portal uses `Chart.js` to render pie charts (Present vs Absent) and bar charts displaying attendance over time.
- The Admin & Department portals have aggregated views of attendance stats across all teachers and classes.

## Implementation Phases

1. **Phase 1: Foundation Setup**
   - Initialize Node.js project.
   - Setup folder structure, install Express and Firebase Admin SDK.
   - Create Firebase project, configure credentials.

2. **Phase 2: Authentication & Roles**
   - Build Landing/Login page UI.
   - Integrate Firebase Auth.
   - Implement role-based routing.

3. **Phase 3: Core Attendance Workflow (Teacher & Student)**
   - Teacher Dashboard: Create session, get GPS coords, generate link.
   - Student Dashboard: Read session ID, request GPS permissions, upload photo.
   - Save attendance record to Firestore.

4. **Phase 4: Teacher Verification & Admin/Dept Dashboards**
   - Teacher Dashboard: View session submissions, view photos, confirm attendance.
   - Build Admin and Department views for managing users and classes.

5. **Phase 5: Analytics and Polish**
   - Integrate Chart.js on Student and Admin dashboards.
   - Enhance UI/UX with modern, dynamic, premium CSS styling (glassmorphism, vibrant colors, subtle animations).

## Open Questions

- Do you allow me to create an initial Firebase test project for you to get started quickly, or do you have one ready?
- Should the frontend be served *by* the Node.js Express server to avoid CORS issues? (I will set it up this way by default for simplicity).
- What is the acceptable distance radius (e.g., 50 meters, 100 meters) between the student's location and the classroom coordinate to mark them present automatically?
