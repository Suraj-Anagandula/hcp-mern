 


 const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// -------- Security middleware --------
app.use(helmet());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "https://hcp-mern-frontend.vercel.app",
//     credentials: true,
//   })
// );

 

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://hcp-mern-frontend.vercel.app"
    ],
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,
    preflightContinue: false,
  })
);




// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Uploads folder
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Database
require("./config/database")();

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/complaints", require("./routes/complaints"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/user", require("./routes/user"));
app.use("/api/upload", require("./routes/uploadRoutes"));

app.get("/", (req, res) => {
  res.json({ status: "Server running successfully 🚀" });
});

// 404 route
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Start server normally
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
