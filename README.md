# CareFlow — Smart Health Resource Management System

A student PBL project for **Operating Systems (OS)** and **Database Management Systems (DBMS)**. It uses Vite + vanilla JavaScript for the interface and Supabase (PostgreSQL + Auth + Row Level Security) for data storage.

> **Important:** This is an educational demonstration, not a production healthcare system. Use fictional data only. It does not provide clinical advice and has not been certified for handling real patient information.

## Features

- Email/password sign-up and sign-in using Supabase Auth
- Overview dashboard with patient, doctor, appointment and bed counts
- Patient and doctor directory CRUD
- Appointment management with database-enforced unique doctor/time slots
- Bed management, medicine inventory and equipment tracking
- Resource request queue with priority values (1 = highest priority)
- Audit logging through PostgreSQL triggers
- OS CPU scheduling lab: FCFS, non-preemptive SJF, non-preemptive Priority, Round Robin
- Gantt chart, completion time, turnaround time, waiting time and averages
- Responsive layout for laptop and mobile screens

## 1. Create the Supabase backend

1. Open [Supabase](https://supabase.com/) and create a project.
2. Open **SQL Editor** in your project.
3. Paste the full contents of `supabase/schema.sql` and run it.
4. Optional: run `supabase/seed.sql` for fictional demo records. These are not tied to an account, so only run if you want shared sample data.
5. Go to **Project Settings → API** (or the Connect dialog) and copy the Project URL and the publishable/anon key. Never use the `service_role` key in browser code.
6. Under **Authentication → Providers → Email**, keep email/password enabled. For easy classroom demo, you may disable email confirmation in Auth settings; otherwise users must confirm the signup email before signing in.

## 2. Run locally on Windows

Install Node.js LTS from [nodejs.org](https://nodejs.org/).

Open the extracted project folder in VS Code, then open Terminal and run:

```powershell
Copy-Item .env.example .env
```

Edit `.env` so it contains your actual values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## 3. Push to GitHub

Create a new empty repository on GitHub, for example `careflow-health-resource-management`. In the project folder:

```powershell
git init
git add .
git commit -m "Initial CareFlow project"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/careflow-health-resource-management.git
git push -u origin main
```

Before pushing, make sure `.env` is not tracked. The included `.gitignore` excludes it. Check with `git status`. Never commit a service-role key or other secret.

## 4. Deploy online

For the easiest student demo, deploy the frontend on [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/):
- Import the GitHub repository.
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider's project settings.
- Redeploy.

The Supabase URL and anon/publishable key are expected to be visible to browser clients; security relies on correctly configured Row Level Security. Never expose the service-role key.

## Database files

- `supabase/schema.sql` — all table, constraint, index, RLS policy and audit-trigger SQL.
- `supabase/seed.sql` — optional fictional sample data.

## Important database design notes

- Primary keys use UUIDs.
- Foreign keys connect appointments to patients and doctors, and beds to patients.
- Check constraints validate ages, statuses, stock values and priority values.
- A unique constraint prevents duplicate appointments for the same doctor at the exact same timestamp.
- Row Level Security requires authentication for access to application tables.
- Audit triggers record insert, update and delete operations.

The app currently prevents duplicate exact doctor/time slots. It does not implement appointment-duration overlap detection. The bed schema enforces that occupied beds have a patient, but a user should update the bed status and patient together.

## OS scheduler notes

The CPU scheduling simulator is implemented in the frontend for demonstration and does not change the real operating-system process scheduler. SJF and Priority are non-preemptive; Round Robin uses the selected time quantum.

## Suggested viva flow

1. Sign up and sign in.
2. Add a patient and doctor.
3. Book an appointment and try creating the same doctor's same time slot again.
4. Add a bed, medicine and equipment record.
5. Open Resource Queue and compare priorities.
6. Run each OS scheduling algorithm with the same process set.
7. Explain the PostgreSQL tables, foreign keys, constraints, indexes, RLS and audit trigger.

## Team

- Saransh
- Dakshit
- Sharad
