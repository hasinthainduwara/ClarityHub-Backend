# Postman Collection Setup Guide

## Quick Import Instructions

### 1. Import Collection and Environment
1. Open Postman
2. Click "Import" button (top left)
3. Select "File" tab
4. Import these files:
   - `ClarityHub-Backend.postman_collection.json`
   - `ClarityHub-Local.postman_environment.json`
   - `ClarityHub-Production.postman_environment.json` (optional)

### 2. Select Environment
1. Click the environment dropdown (top right)
2. Select "ClarityHub Local Environment"

### 3. Start Testing
Make sure your backend server is running (`npm run dev`), then run requests in this order:

#### First-Time Setup Flow:
1. **Health Check** - Verify server is running
2. **User Signup** - Create your first user (JWT token auto-saved)
3. **Get Profile** - Test authentication
4. **Create Admin User** - Create an admin account
5. **Get All Users (Admin)** - Test admin permissions

## Collection Structure

### 📁 Health Check
- `GET /health` - Server health check

### 📁 Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### 📁 Admin Operations
- `POST /api/auth/signup` - Create admin user

### 📁 User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (admin/own profile)
- `DELETE /api/users/:id` - Delete user (admin only)

### 📁 Error Scenarios
- Invalid login attempts
- Unauthorized access tests
- Validation error tests
- 404 error tests

## Automatic Features

### 🔐 Token Management
- JWT tokens are automatically extracted from login/signup responses
- Tokens are automatically used in subsequent authenticated requests
- Separate admin token storage for admin operations

### ✅ Response Validation
Every request includes tests that verify:
- Correct HTTP status codes
- Response structure validation
- Required fields presence
- Error message formats

### 🔄 Variable Storage
Key data is automatically stored:
- `jwt_token` - Regular user authentication
- `admin_token` - Admin user authentication
- `user_id` - Current user ID for operations
- `base_url` - API base URL (configurable per environment)

## Environment Configuration

### Local Development
```json
{
  "base_url": "http://localhost:3000",
  "jwt_token": "auto-populated",
  "admin_token": "auto-populated",
  "user_id": "auto-populated"
}
```

### Production
Update the base_url in production environment:
```json
{
  "base_url": "https://your-production-domain.com"
}
```

## Running Tests

### Individual Request Testing
1. Select any request
2. Click "Send"
3. Check the "Test Results" tab for validation results

### Collection Runner
1. Click the collection name
2. Click "Run collection"
3. Select requests to run
4. Click "Start Run"
5. View comprehensive test results

## Troubleshooting

### Common Issues

#### 1. Server Connection Error
- Ensure backend server is running (`npm run dev`)
- Check if port 3000 is accessible
- Verify `base_url` in environment matches your server

#### 2. Authentication Errors
- Run "User Signup" first to create an account
- Check that JWT token is being saved (Console/Variables tab)
- Ensure Authorization header is properly set

#### 3. Admin Permission Errors
- Create admin user first using "Create Admin User" request
- Use `admin_token` for admin operations, not regular `jwt_token`
- Verify admin role assignment in database

#### 4. Validation Errors
- Check request body format matches expected JSON structure
- Ensure all required fields are provided
- Verify email format and password length requirements

## Test Data Examples

### Sample User Data
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

### Sample Admin Data
```json
{
  "name": "Admin User",
  "email": "admin@clarityhub.com",
  "password": "adminpassword123"
}
```

### Sample Update Data
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

## Next Steps

After setting up the collection:
1. Run through the basic authentication flow
2. Test user management operations
3. Experiment with error scenarios
4. Customize requests for your specific use case
5. Export and share collection with your team