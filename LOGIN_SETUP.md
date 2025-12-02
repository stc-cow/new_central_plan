# Backend Login Flow Setup

## Overview

The login flow now uses proper HTML form submission with HTTP redirect:

1. **HTML Form** → POSTs credentials to `/login-api`
2. **Backend Server** → Validates credentials
3. **HTTP 302 Redirect** → Redirects to `/new_central_plan/` on success
4. **Browser Password Manager** → Automatically prompts to save password

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

This installs:

- `express` - Backend server framework
- `cookie-parser` - For handling session cookies

### 2. Build the Frontend

```bash
npm run build
```

This creates the `dist/` folder with compiled assets.

### 3. Run the Server

```bash
npm start
# or
npm run server
```

Server starts on `http://localhost:3000`

### 4. Test Login

1. Go to `http://localhost:3000`
2. Enter credentials:
   - Username: `Aces@MSD`
   - Password: `ACES@2025`
3. Click "Sign In"
4. Browser shows **"Save password?"** dialog ✅
5. Click "Save" to store credentials

## What Changed

### HTML Form (`index.html`)

```html
<form
  class="login-form"
  id="loginForm"
  method="POST"          <!-- ✅ Normal form submission -->
  action="/login-api"    <!-- ✅ Posts to backend API -->
  autocomplete="on"      <!-- ✅ Enables auto-fill -->
>
  <input type="text" name="username" autocomplete="username" />
  <input type="password" name="password" autocomplete="current-password" />
  ...
</form>
```

### JavaScript (`script.js`)

- ✅ Removed `e.preventDefault()` - allows normal form submission
- ✅ Removed client-side validation
- ✅ Backend handles all validation and security

### Backend Server (`server.js`)

- ✅ POST `/login-api` endpoint
- ✅ Validates credentials
- ✅ Returns HTTP 302 redirect
- ✅ Sets secure session cookies
- ✅ GET `/new_central_plan/` for dashboard access
- ✅ GET `/logout` to clear session

## How Browser Password Save Works

The browser ONLY shows "Save password?" when:

✅ Form is a real HTML `<form>` (not JavaScript fetch/XHR)
✅ Form POSTs to an endpoint
✅ Server returns HTTP 302 redirect
✅ Next page loads with GET request
✅ Input `name` attributes match standard conventions (`username`, `password`)

All these conditions are now met!

## API Endpoints

### POST `/login-api`

Login with credentials

```
POST /login-api HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=Aces@MSD&password=ACES@2025
```

**Success:** `HTTP 302` redirect to `/new_central_plan/`
**Failure:** `HTTP 302` redirect to `/?login_error=1`

### GET `/new_central_plan/`

Dashboard (requires valid session cookie)

### GET `/logout`

Logout and clear session

## Production Deployment

When deploying to production:

1. Build frontend: `npm run build`
2. Set `NODE_ENV=production`
3. Set appropriate `PORT` (default 3000)
4. Server serves static files from `dist/` folder

Example with Fly.io:

```bash
fly deploy
```

Example with Heroku:

```bash
git push heroku main
```

## Troubleshooting

### "405 Not Allowed" Error

- Form is trying to POST to wrong endpoint
- Check `<form action="/login-api">`
- Ensure `method="POST"` is set

### Browser not showing "Save Password?"

- Check form uses `<input name="username">` (not `id="username"`)
- Check form uses `<input name="password">` (not `id="password"`)
- Check form has `<form ... method="POST" action="/login-api">`
- Check backend returns HTTP 302 redirect, not 200
- Refresh browser page if form was cached

### "Cookie not set" or "Session lost"

- Check cookies are not disabled
- Check `/new_central_plan/` validates `session_id` cookie
- Check cookies have `httpOnly: true` (secure)

## Next Steps

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Start server: `npm start`
4. Test: Go to `http://localhost:3000` and login
