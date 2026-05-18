// ═══════════════════════════════════════════════════
//  server.js — Auth Overlay Backend
//  Stack: Node.js + Express + bcrypt + JSON file store
// ═══════════════════════════════════════════════════

const express  = require('express');
const bcrypt   = require('bcryptjs'); // pure-JS, no native compilation needed
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Path to our "database" (a local JSON file) ──────
const USERS_FILE = path.join(__dirname, 'users.json');

// ── Middleware ───────────────────────────────────────
app.use(express.json());                        // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve public folder

// ── Helper: read users from JSON file ────────────────
function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If file missing or corrupt, return empty array
    return [];
  }
}

// ── Helper: write users back to JSON file ────────────
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// ── Helper: log with timestamp ───────────────────────
function log(type, msg) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const icons = { INFO: '📋', SUCCESS: '✅', ERROR: '❌', WARN: '⚠️ ' };
  console.log(`[${stamp}] ${icons[type] || '•'} [${type}] ${msg}`);
}

// ══════════════════════════════════════════════════════
//  POST /signup — Register a new user
// ══════════════════════════════════════════════════════
app.post('/signup', async (req, res) => {
  const { fullname, username, email, password } = req.body;

  log('INFO', `Signup attempt — username: "${username}", email: "${email}"`);

  // ── Basic server-side validation ──────────────────
  if (!fullname || !username || !email || !password) {
    log('WARN', 'Signup failed — missing required fields');
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (username.length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  const users = readUsers();

  // ── Check for duplicate username or email ─────────
  const usernameTaken = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (usernameTaken) {
    log('WARN', `Signup failed — username "${username}" already taken`);
    return res.status(409).json({ success: false, message: 'Username is already taken.' });
  }

  const emailTaken = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailTaken) {
    log('WARN', `Signup failed — email "${email}" already registered`);
    return res.status(409).json({ success: false, message: 'Email is already registered.' });
  }

  // ── Hash password with bcrypt (10 salt rounds) ────
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // ── Save new user ─────────────────────────────────
  const newUser = {
    id:        Date.now().toString(),
    fullname:  fullname.trim(),
    username:  username.trim().toLowerCase(),
    email:     email.trim().toLowerCase(),
    password:  hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  log('SUCCESS', `New user registered — username: "${newUser.username}", id: ${newUser.id}`);

  // Return user info (never send password back)
  return res.status(201).json({
    success:  true,
    message:  'Account created successfully! Welcome aboard.',
    user: {
      id:       newUser.id,
      fullname: newUser.fullname,
      username: newUser.username,
      email:    newUser.email
    }
  });
});

// ══════════════════════════════════════════════════════
//  POST /login — Authenticate an existing user
// ══════════════════════════════════════════════════════
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier = username OR email

  log('INFO', `Login attempt — identifier: "${identifier}"`);

  if (!identifier || !password) {
    log('WARN', 'Login failed — missing credentials');
    return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
  }

  const users = readUsers();

  // ── Find user by username or email ───────────────
  const user = users.find(
    u => u.username === identifier.toLowerCase() ||
         u.email    === identifier.toLowerCase()
  );

  if (!user) {
    log('WARN', `Login failed — user "${identifier}" not found`);
    // Vague message intentionally (don't reveal whether user exists)
    return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
  }

  // ── Compare password with bcrypt ─────────────────
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    log('WARN', `Login failed — wrong password for user "${user.username}"`);
    return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
  }

  log('SUCCESS', `User logged in — username: "${user.username}", id: ${user.id}`);

  return res.status(200).json({
    success:  true,
    message:  `Welcome back, ${user.fullname}!`,
    user: {
      id:       user.id,
      fullname: user.fullname,
      username: user.username,
      email:    user.email
    }
  });
});

// ══════════════════════════════════════════════════════
//  Catch-all — serve index.html for any unknown routes
// ══════════════════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    🚀  AUTH OVERLAY SERVER  RUNNING      ║');
  console.log(`║    📡  http://localhost:${PORT}             ║`);
  console.log('║    📁  Serving: /public                  ║');
  console.log('║    💾  Users stored in: users.json       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\n');
});
