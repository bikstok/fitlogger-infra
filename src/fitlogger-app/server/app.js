import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import session from "express-session";
import supabase from "./util/supabaseUtil.js";
import { initDb } from "./util/db.js";
import { emitUserDisconnected, emitUserCount } from "./util/socketUtil.js";
import generalLimiter from "./util/generalLimiterUtil.js";
import cors from "cors";
import helmet from "helmet";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

const app = express();
app.use(express.json());

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "fitlogger-session-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production" ? false : false, // False behind Traefik reverse proxy
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

app.use(sessionMiddleware);
app.use(generalLimiter);

// Security & CORS
app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false, // Allows frontend SPA and media assets to load without strict inline CSP blocks
  })
);

// Health check probe for Kubernetes
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

const server = http.createServer(app);

// Sockets
import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  },
});

io.engine.use(sessionMiddleware);

io.on("connection", async (socket) => {
  const userId = socket.request.session?.userId;
  if (userId) {
    const { data } = await supabase
      .from("users")
      .select("user_name")
      .eq("id", userId)
      .single();
    if (data) socket.data.username = data.user_name;
  }

  socket.on("disconnect", () => {
    if (socket.data.username) {
      emitUserDisconnected(io, socket.data.username);
    }
    emitUserCount(io, io.engine.clientsCount);
  });

  emitUserCount(io, io.engine.clientsCount);
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routers
import registerRouter from "./routers/registerRouter.js";
app.use(registerRouter);

import loginRouter from "./routers/loginRouter.js";
app.use(loginRouter);

import logoutRouter from "./routers/logoutRouter.js";
app.use(logoutRouter);

import sessionRouter from "./routers/sessionRouter.js";
app.use(sessionRouter);

import exercisesRouter from "./routers/exercisesRouter.js";
app.use(exercisesRouter);

import workoutsRouter from "./routers/workoutsRouter.js";
app.use(workoutsRouter);

import statisticsRouter from "./routers/statisticsRouter.js";
app.use(statisticsRouter);

import routinesRouter from "./routers/routinesRouter.js";
app.use(routinesRouter);

// Serve Frontend Static Files
const clientDistCandidates = [
  path.resolve(import.meta.dirname, "../../fitness-client/dist"),
  path.resolve(import.meta.dirname, "../fitness-client/dist"),
  path.resolve(import.meta.dirname, "../dist"),
  path.resolve("/app/fitness-client/dist"),
];

const clientDist = clientDistCandidates.find((dir) => fs.existsSync(dir)) || clientDistCandidates[0];
console.log("Serving static frontend from:", clientDist);

app.use(express.static(clientDist));

// SPA Fallback
app.get("/{*splat}", (req, res) => {
  const indexPath = path.join(clientDist, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send("FitLogger App Backend is running. Frontend build in progress.");
  }
});

const PORT = Number(process.env.PORT) || 3000;

// Initialize Database and Start Server
async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("Initial DB setup warning (will retry on queries):", err.message);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`FitLogger Server listening on port: ${PORT}`);
  });
}

startServer();
