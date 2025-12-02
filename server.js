import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("dist"));

// Valid credentials
const VALID_USERNAME = "Aces@MSD";
const VALID_PASSWORD = "ACES@2025";

// Login API endpoint - handles form submission
app.post("/login-api", (req, res) => {
  const { username, password } = req.body;

  // Validate credentials
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    // Set session cookie
    res.cookie("session_id", "user_" + Date.now(), {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    // Store username in session
    res.cookie("username", username, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // HTTP 302 redirect to dashboard (tells browser this is a successful login)
    return res.redirect(302, "/new_central_plan/");
  }

  // Invalid credentials - redirect back to login with error
  res.redirect(302, "/?login_error=1");
});

// Dashboard page - accessible via GET
app.get("/new_central_plan/", (req, res) => {
  const sessionCookie = req.cookies.session_id;
  const username = req.cookies.username;

  // Check if user is authenticated
  if (!sessionCookie || !username) {
    return res.redirect(302, "/");
  }

  // Serve the main app
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Root page - login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Logout endpoint
app.get("/logout", (req, res) => {
  res.clearCookie("session_id");
  res.clearCookie("username");
  res.redirect(302, "/");
});

// Fallback - serve index.html for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
