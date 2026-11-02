# CampusHub

CampusHub (Campus Event Hub) is a MERN web app for college events. Students can browse events, register, comment and track their registrations. Admins manage events and review registrations.

**Live demo:** https://campushub-demo-ak.onrender.com/

The demo runs on free hosting. After 15 minutes idle it sleeps, so the first load can take about a minute. Create your own student account with "Sign Up" to try it. Read-only demo admin and student accounts also exist, but their credentials are private to the repo owner.

## What is in the demo

- Email and password sign-up and login (JWT). Public sign-up always creates a student.
- Event list and event details, event registration, "My Registrations", notifications and event comments.
- Student dashboard and admin dashboard, plus admin pages for registrations and participants.
- Three sample events are seeded. The demo database is shared, so do not enter real personal data.

Not active in the demo: Google and GitHub sign-in (the buttons are hidden unless REACT_APP_ENABLE_OAUTH is set to true at build time), email (welcome mail, OTP, reminders) and persistent uploads. Uploaded images are stored on the host's temporary disk and disappear on restart. The demo admin account is read-only. Testimonials and the sample events on the landing page are illustrative content from the original project, not real users or live statistics.

## Tech stack

- Frontend: React 19 (react-scripts), React Router
- Backend: Node.js, Express 5, Mongoose
- Database: MongoDB (the demo uses a free MongoDB Atlas cluster)
- Auth: JSON Web Tokens, bcrypt. Optional Google OAuth (passport).
- Optional: nodemailer and node-cron for email and reminders

## Run locally

Requirements: Node.js 18+ and a MongoDB connection string.

```bash
git clone https://github.com/23R01A05K4/CampusHub.git
cd CampusHub

# backend
cd backend
cp .env.example .env     # then fill in the values
npm install
node seed.js             # optional: demo accounts and sample events
node server.js           # http://localhost:5000

# frontend (second terminal)
cd frontend
npm install --legacy-peer-deps
npm start                # http://localhost:3000
```

Configuration is in `backend/.env.example`. In production the backend also serves the built frontend (`frontend/build`), so one service is enough: build the frontend with `REACT_APP_API` set to the service URL, then start `backend/server.js`.

## Security notes

- `create_sa.js` creates a super admin only from the `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` environment variables (plus `MONGO_URI`).
- Accounts flagged `demoReadOnly` can read but every write request returns 403.
- Uploads accept images only, up to 2 MB. The API has rate limits and basic security headers.
- In production the server refuses to start without a `JWT_SECRET` of at least 32 characters.

## Deployment (Render, free plan)

- Build command: `cd frontend && npm install --legacy-peer-deps && npm run build && cd ../backend && npm install`
- Start command: `cd backend && node seed.js && node server.js`
- Environment: see `backend/.env.example` (plus `REACT_APP_API` set to the service URL for the build).
- Allow the service's outbound IP ranges in the MongoDB Atlas IP Access List.

## License

See `LICENSE`.
