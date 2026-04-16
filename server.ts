import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "ircc-monitor-super-secret-key";
const PORT = 3000;

// In-memory stores
const users: any[] = [];
const sources: any[] = [
  {
    id: "1",
    name: "IRCC Official News",
    type: "atom",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/_jcr_content/par/maintopic/feed.atom",
    status: "active",
    priority: "high",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    name: "Express Entry Draws",
    type: "html",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
    status: "active",
    priority: "high",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Middleware to verify Admin
const isAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---

  // Signup
  app.post("/api/signup", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = users.find((u) => u.email === email);
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: Math.random().toString(36).substring(2, 15),
      name,
      email,
      password_hash,
      role: users.length === 0 ? 'admin' : 'user', // First user is admin
      created_at: new Date().toISOString(),
    };

    users.push(newUser);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  });

  // Login
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const user = users.find((u) => u.email === email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });

  // --- Admin Routes ---

  app.get("/api/admin/sources", isAdmin, (req, res) => {
    res.json(sources);
  });

  app.post("/api/admin/sources", isAdmin, (req, res) => {
    const { name, type, url, priority } = req.body;
    if (!name || !type || !url || !priority) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newSource = {
      id: Math.random().toString(36).substring(2, 15),
      name,
      type,
      url,
      priority,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    sources.push(newSource);
    res.status(201).json(newSource);
  });

  app.put("/api/admin/sources/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const { name, type, url, priority, status } = req.body;
    
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ error: "Source not found" });

    sources[index] = {
      ...sources[index],
      name: name || sources[index].name,
      type: type || sources[index].type,
      url: url || sources[index].url,
      priority: priority || sources[index].priority,
      status: status || sources[index].status,
      updated_at: new Date().toISOString()
    };

    res.json(sources[index]);
  });

  app.delete("/api/admin/sources/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ error: "Source not found" });

    sources.splice(index, 1);
    res.json({ message: "Source deleted successfully" });
  });

  app.patch("/api/admin/sources/:id/toggle", isAdmin, (req, res) => {
    const { id } = req.params;
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ error: "Source not found" });

    sources[index].status = sources[index].status === 'active' ? 'inactive' : 'active';
    sources[index].updated_at = new Date().toISOString();
    
    res.json(sources[index]);
  });

  // Protected Dashboard Route (Example)
  app.get("/api/dashboard-status", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ status: "authorized", user: decoded });
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  });

  // Logout (Client side handles token removal, but we can have an endpoint for logging/blacklisting)
  app.post("/api/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // API 404 Handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
