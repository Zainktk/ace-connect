# AceConnect - Quick Start Guide

## Running the Application

### Backend Server
```bash
cd /Users/doerz/.gemini/antigravity/scratch/ace-connect/ace-connect-server
npm run dev
```
Server will start on `http://localhost:3000`

### Mobile App

**Terminal 1 - Start Metro:**
```bash
cd /Users/doerz/.gemini/antigravity/scratch/ace-connect/ace-connect-app
npm start
```

**Terminal 2 - Run iOS:**
```bash
cd /Users/doerz/.gemini/antigravity/scratch/ace-connect/ace-connect-app
npm run ios
```

## Test User Flow

1. Open app → Login screen appears
2. Tap "Sign Up" → Fill registration form
3. Create account → Auto-login to Home screen
4. Navigate tabs → Home, Matchmaking, Events, Profile
5. Edit profile → Update bio and location
6. Logout → Return to login
7. Login again → Verify data persists

## Project Structure

```
ace-connect/
├── ace-connect-server/     # Backend API (Node.js/Express)
│   ├── db/                 # Database schema
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API endpoints
│   └── server.js           # Main server
│
└── ace-connect-app/        # Mobile App (React Native)
    ├── src/
    │   ├── context/        # Auth state management
    │   ├── navigation/     # App navigation
    │   ├── screens/        # UI screens
    │   ├── services/       # API client
    │   └── theme/          # Design system
    └── App.tsx             # Root component
```

## Features Implemented

✅ User registration with NTRP rating
✅ JWT authentication
✅ Profile management (view/edit)
✅ PostgreSQL database
✅ Premium UI design
✅ Tab navigation
✅ Persistent login

## Next Phase

Ready to build:
- Matchmaking algorithm
- Events system
- Social features
- Marketplace
