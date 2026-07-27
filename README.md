Project Description – Process Safety Management (PSM) Web Platform

The Process Safety Management (PSM) Web Platform will be a centralized digital solution designed to help organizations manage, monitor, document, and improve process safety activities. The platform will digitize all 14 core elements of Process Safety Management and provide a structured system for maintaining safety records, assigning responsibilities, tracking compliance, managing approvals, and reducing operational risks.

The system will replace scattered paperwork, spreadsheets, emails, and manual follow-ups with a secure and organized web-based platform. Employees, safety teams, contractors, department heads, auditors, and management will be able to access relevant PSM modules according to their assigned roles and permissions.

The platform will include dashboards, document management, workflow approvals, task assignments, reminders, audit trails, reports, and compliance monitoring. Management will receive real-time visibility into safety performance, pending actions, identified hazards, incidents, audits, training status, and overall PSM compliance.

The objective of this project is to develop a secure, centralized, transparent, and user-friendly Process Safety Management platform that improves safety compliance, reduces manual administrative work, strengthens accountability, and enables organizations to proactively identify and control process-related risks.

By integrating all 14 PSM elements into a single platform, the organization will gain a complete view of its safety activities—from hazard identification and employee training to incident investigation, compliance audits, and continuous improvement.

Technology Stack

Frontend: React.js, Tailwind CSS, Material UI
Backend: Node.js, Express.js, REST APIs
Database: MongoDB, MongoDB Atlas, Mongoose
Authentication & Security: JWT, Role-Based Access Control (RBAC), bcrypt
Notifications: Nodemailer
Reports & Export: PDF, Excel, CSV
Charts & Dashboard: Recharts
Deployment: VPS
DevOps: Docker, GitHub Actions, CI/CD
Testing: Jest, Postman
Monitoring & Logging: PM2

## Frontend Setup

We have set up the initial frontend React application inside the `frontend` directory. It features a sidebar layout and a custom theme switcher using specific HSL values for both Dark and Light modes.

### Getting Started with the Frontend

1. Open your terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
The application will open in your default browser at `http://localhost:3000`.
