# Fixzit Enterprise Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. MongoDB installed and running locally (or MongoDB Atlas account)
3. Git installed

## Environment Setup

1. **Create `.env.local` file in the root directory:**

```env
# MongoDB Connection (Required)
MONGODB_URI=mongodb://localhost:27017/fixzit

# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixzit?retryWrites=true&w=majority

# NextAuth Configuration (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters

# Organization Settings
NEXT_PUBLIC_ORG_ID=1
NEXT_PUBLIC_ORG_NAME=Fixzit Enterprise

# Optional: Development Settings
USE_MOCK_DB=false
NODE_ENV=development
```

2. **Generate a secure NextAuth secret:**

```bash
openssl rand -base64 32
```

## Database Setup

1. **Start MongoDB locally:**

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

2. **Test MongoDB connection:**

```bash
npm run test:mongodb
```

3. **Seed initial admin user:**

```bash
npm run seed:admin
```

This creates:
- Admin: admin@fixzit.com / Admin@123
- Manager: manager@fixzit.com / Manager@123
- Technician: tech@fixzit.com / Tech@123
- Tenant: tenant@fixzit.com / Tenant@123

## Running the Application

1. **Install dependencies:**

```bash
npm install
```

2. **Run development server:**

```bash
npm run dev
```

3. **Access the application:**

- Frontend: http://localhost:3000
- Login with: admin@fixzit.com / Admin@123

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### MongoDB Connection Issues

1. Ensure MongoDB is running:
```bash
# Check if MongoDB is running
ps aux | grep mongod
```

2. Test connection directly:
```bash
mongosh mongodb://localhost:27017/fixzit
```

### Port Already in Use

If port 3000 is in use:
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Clear Cache

```bash
rm -rf .next
npm run dev
```

## Additional Scripts

- `npm run test:mongodb` - Test database connection
- `npm run seed:admin` - Create initial users
- `npm run seed:marketplace` - Seed marketplace data
- `npm run seed:ats` - Seed ATS job data
- `npm run lint` - Run ESLint
- `npm run build` - Build for production
- `npm test` - Run tests
