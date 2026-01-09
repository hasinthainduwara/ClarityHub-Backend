# ClarityHub Backend

A robust TypeScript Express.js backend with MongoDB for user authentication and CRUD operations.

## Features

- 🔐 User Authentication (Signup/Login)
- � Access & Refresh Tokens
- 🔑 Password Change Functionality
- 🚪 Logout Support
- �👤 User Profile Management
- 🛡️ JWT-based Authorization
- 🔒 Role-based Access Control (User/Admin)
- 📊 User CRUD Operations
- 🚀 Express.js with TypeScript
- 🍃 MongoDB with Mongoose
- ✅ Input Validation
- 🛡️ Security Middleware (Helmet, CORS, Rate Limiting)
- 📝 Comprehensive Error Handling
- 🧪 Ready for Testing

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT
- **Validation**: Express-validator
- **Security**: Helmet, CORS, bcryptjs
- **Development**: Nodemon, ESLint

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd clarityhub-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clarityhub
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Note**: Generate secure JWT secrets using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Start the development server:

```bash
npm run dev
```

The server will be running at `http://localhost:5000`

## Authentication

For detailed information about the authentication system, including all endpoints, token management, and security best practices, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## API Endpoints

### Authentication Routes

| Method | Endpoint                    | Description          | Access  |
| ------ | --------------------------- | -------------------- | ------- |
| POST   | `/api/auth/signup`          | Register new user    | Public  |
| POST   | `/api/auth/login`           | User login           | Public  |
| GET    | `/api/auth/profile`         | Get user profile     | Private |
| PUT    | `/api/auth/profile`         | Update user profile  | Private |
| POST   | `/api/auth/change-password` | Change password      | Private |
| POST   | `/api/auth/refresh`         | Refresh access token | Public  |
| POST   | `/api/auth/logout`          | Logout user          | Private |

### User Management Routes

| Method | Endpoint         | Description    | Access               |
| ------ | ---------------- | -------------- | -------------------- |
| GET    | `/api/users`     | Get all users  | Admin Only           |
| GET    | `/api/users/:id` | Get user by ID | Admin or Own Profile |
| PUT    | `/api/users/:id` | Update user    | Admin or Own Profile |
| DELETE | `/api/users/:id` | Delete user    | Admin Only           |

### Community Routes

| Method | Endpoint                        | Description                   | Access  |
| ------ | ------------------------------- | ----------------------------- | ------- |
| POST   | `/api/communities`              | Create new community          | Private |
| GET    | `/api/communities`              | List communities              | Private |
| GET    | `/api/communities/my-communities`| Get my joined communities    | Private |
| GET    | `/api/communities/:id`          | Get community details         | Private |
| POST   | `/api/communities/:id/join`     | Join community (follow)       | Private |
| POST   | `/api/communities/:id/leave`    | Leave community (unfollow)    | Private |
| POST   | `/api/communities/:id/posts`    | Create post in community      | Private |
| GET    | `/api/communities/:id/posts`    | Get posts in community        | Private |

## Postman Collection

### Version 3 (Latest - With Community Features)

The V3 collection includes all previous features plus new Community API endpoints.

**Quick Setup:**

1. Import the Postman collection: `ClarityHub-API-v3.postman_collection.json`
2. Configure `baseUrl` variable to `http://localhost:3000`
3. Start your backend server: `npm run dev`
4. Test the authentication flow to get your token set automatically.
   - **Sign Up** - Creates account and saves tokens automatically
   - **Get Profile** - Retrieves your profile (uses saved token)
   - **Community Endpoints** - Create, Join, and post in communities

**Features:**

- ✅ Automatic token management
- ✅ Tokens saved after login/signup
- ✅ Tokens cleared after logout
- ✅ Bearer authentication pre-configured
- ✅ All 7 auth endpoints included
- ✅ User management endpoints
- ✅ Response examples for each request

**Documentation:** See [POSTMAN_GUIDE_V2.md](./POSTMAN_GUIDE_V2.md) for complete guide.

### Version 1 (Legacy)

Original collection: `ClarityHub-Backend.postman_collection.json`

For detailed testing instructions, see [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) or [POSTMAN_GUIDE_V2.md](./POSTMAN_GUIDE_V2.md).

- Health Check
- User Signup (saves JWT token automatically)
- User Login
- Get Profile
- Other authenticated endpoints

### Collection Features

- ✅ **Automated token management** - JWT tokens are automatically extracted and stored
- ✅ **Complete test coverage** - Every endpoint has response validation tests
- ✅ **Error scenarios** - Tests for validation errors, unauthorized access, etc.
- ✅ **Environment variables** - Easy switching between local and production
- ✅ **Admin operations** - Separate admin user creation and management endpoints

### Available Environments

- **Local Development**: `ClarityHub-Local.postman_environment.json`
- **Production**: `ClarityHub-Production.postman_environment.json`

## API Usage Examples

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Access protected route

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
src/
├── config/          # Database and configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware (auth, validation, etc.)
├── models/          # Mongoose models
├── routes/          # Express routes
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- MongoDB injection prevention

## Environment Variables

| Variable         | Description               | Default                                |
| ---------------- | ------------------------- | -------------------------------------- |
| `NODE_ENV`       | Environment mode          | `development`                          |
| `PORT`           | Server port               | `3000`                                 |
| `MONGODB_URI`    | MongoDB connection string | `mongodb://localhost:27017/clarityhub` |
| `JWT_SECRET`     | JWT signing secret        | Required                               |
| `JWT_EXPIRES_IN` | JWT expiration time       | `7d`                                   |
| `CORS_ORIGIN`    | Allowed CORS origin       | `http://localhost:3000`                |

## Error Handling

The API uses consistent error response format:

```json
{
  "error": "Error message",
  "details": "Additional error details (in development mode)"
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
