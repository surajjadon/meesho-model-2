import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import mongoose from 'mongoose';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import inventoryRoutes from './routes/inventory.routes';
import mappingRoutes from './routes/mapping.routes';
import cropperRoutes from './routes/cropper.routes';
import orderRoutes from './routes/order.routes';
import paymentsRoutes from './routes/payments.routes';
import plRoutes from './routes/pl.routes';
import returnsRoutes from './routes/returns.routes';
import teamRoutes from './routes/team.routes';

dotenv.config();

// 1. Initialize DB with Retry Logic
connectDB();

const app: Application = express();
const PORT = Number(process.env.PORT) || 24554;

// 2. Security Headers (Helmet) - Must be first!
app.use(helmet());

// 3. Improvised CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

console.log("✅ Allowed CORS origins:", allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Explicitly allow methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gstin'], // Explicitly allow headers
  maxAge: 600 // Cache the "Preflight" OPTIONS response for 10 minutes (reduces server load)
}));

// 4. Request Size Limits (Prevents DoS via large payloads)
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 5. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 6. Request Logging (Optional but helpful)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/cropper', cropperRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/pl', plRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/team', teamRoutes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({ 
    status: 'OK', 
    serverTime: new Date().toISOString(),
    database: dbStatus 
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});