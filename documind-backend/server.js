require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const documentRoutes = require('./src/routes/document.routes');
const chatRoutes = require('./src/routes/chat.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required env vars early
const requiredEnv = ['MONGODB_URI', 'OPENAI_API_KEY'];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️  Missing env vars: ${missing.join(', ')} — see .env.example`);
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '1mb' }));

// Request logger (dev-friendly)
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Health check — includes DB status
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    version: '1.0.0',
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'DocuMind API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/documents': 'List documents',
      'POST /api/documents/upload': 'Upload PDF (field: pdf)',
      'DELETE /api/documents/:id': 'Delete document',
      'POST /api/chat': 'Chat with document {documentId, question}',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Global error handler (handles multer etc.)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large — max 50 MB.' });
  }
  if (err.message === 'Only PDF files are accepted.') {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 DocuMind server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  if (missing.length) console.log(`   ⚠️  Set ${missing.join(', ')} in .env then restart`);
});
