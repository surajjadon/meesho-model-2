import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import inventoryRoutes from './routes/inventory.routes';
import mappingRoutes from './routes/mapping.routes';
import cropperRoutes from './routes/cropper.routes';
import orderRoutes from './routes/order.routes';
import paymentsRoutes from './routes/payments.routes';
import plRoutes from './routes/pl.routes';
import returnsRoutes from './routes/returns.routes'; // 1. Import the new returns route
import mongoose from 'mongoose';

dotenv.config();

connectDB();

const app: Application = express();
const PORT = Number(process.env.PORT) || 24554;


const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

  console.log("✅ Allowed CORS origins:", allowedOrigins);


app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- FINAL API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/cropper', cropperRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/pl', plRoutes);
app.use('/api/returns', returnsRoutes); // 2. Register the route

app.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({ 
    status: 'OK', 
    serverTime: new Date().toISOString(),
    database: dbStatus 
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

//app.listen(PORT, () => { console.log(`🚀 Server running on: http://localhost:${PORT}`); });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
