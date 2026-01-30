import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import mongoose from 'mongoose';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser'; 

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
import SubciptionPlans from './routes/plan.routes' ;
import Payment  from './routes/razorpay.model';
import logger from './utils/templogger';

import devLogsRouter from './routes/devLogs';
import plans from 'razorpay/dist/types/plans';



dotenv.config();

// 1. Initialize DB with Retry Logic
connectDB();

const app: Application = express();
const PORT = Number(process.env.PORT) || 24554;

app.set('trust proxy', 1);
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

// 👇 5. ADD COOKIE PARSER HERE (Must be before routes)
app.use(cookieParser()); 

// 6. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
// 7. Request Logging (Optional but helpful)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
// --- DEV LOGS ROUTE ---
app.use(devLogsRouter);
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
app.use('/api/razorpay',Payment );
app.use('/api/subplans',SubciptionPlans);


// Health Check
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

logger.info('tempLogger is working');


const TRUSTED_IPS = (process.env.HEALTH_TRUSTED_IPS || '127.0.0.1,::1')
  .split(',')
  .map(ip => ip.trim());

const HEALTH_SECRET = process.env.HEALTH_SECRET;


app.get('/readyz', (req: Request, res: Response) => {
  const requestIP = req.ip || req.socket.remoteAddress || '';
  const authHeader = req.headers['x-health-secret'];
  const isAuthorized = HEALTH_SECRET && authHeader === HEALTH_SECRET;
  if (!TRUSTED_IPS.includes(requestIP) && !isAuthorized) {
     console.warn(`⚠️ Unauthorized /readyz attempt from IP: ${requestIP}`);
     return res.status(403).json({ message: 'Forbidden' });
  }
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(503).json({ status: 'Not Ready', reason: 'Database disconnected' });
  }
  res.status(200).json({ 
    status: 'Ready', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
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