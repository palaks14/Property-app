# Property Management Application

A full-stack property management system for landlords and tenants, built with React, Vite, Express, MongoDB, and Firebase.

## Features

### For Landlords
- Property listing management
- Tenant management
- Maintenance request tracking
- Payment tracking via Razorpay
- Public profile pages

### For Tenants
- Browse and search properties
- Book property viewings
- Maintenance requests
- Payment history
- User profile management

### Admin
- User management
- Platform analytics
- Maintenance oversight
- Support query management

## Tech Stack

### Client
- React 19 + Vite
- React Router v7
- Tailwind CSS v4
- Firebase Authentication
- Framer Motion
- Recharts

### Server
- Express.js
- MongoDB + Mongoose
- Firebase Functions
- JWT Authentication
- Razorpay Integration
- Google OAuth

## Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Firebase CLI (for deployment)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd property-app
```

### 2. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 3. Environment Setup

**Server (.env)** - Create in `/server`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ofuqekr.mongodb.net/<dbname>
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET=your-razorpay-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAIL=admin@example.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Client (.env)** - Create in `/client`:
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Run the Application

**Development mode:**

Terminal 1 - Server:
```bash
cd server
npm run serve
```

Terminal 2 - Client:
```bash
cd client
npm run dev
```

**Production build:**
```bash
cd client
npm run build
```

The built files will be in `client/dist/`.

## Project Structure

```
property-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utilities
│   ├── public/            # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Express backend
│   ├── middleware/        # Auth middleware
│   ├── models/            # Mongoose models
│   ├── netlify/           # Netlify functions
│   ├── scripts/          # Utility scripts
│   ├── uploads/           # File uploads
│   ├── index.js           # Firebase function handler
│   └── server.js          # Main server file
│
├── firebase.json          # Firebase config
├── firestore.rules        # Firestore security rules
├── netlify.toml           # Netlify deployment config
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property details

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my` - Get user bookings

### Maintenance
- `POST /api/maintenance` - Create request
- `GET /api/maintenance` - List requests
- `PATCH /api/maintenance/:id` - Update status

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

## Deployment

### Firebase Functions
```bash
cd server
npm run deploy
```

### Netlify
Push to connected GitHub repo - automatic deployment via `netlify.toml`.

## License

ISC
