import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();
dotenv.config({ path: '../.env' });

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import trajectoryRoutes from './routes/trajectory.routes';
import adminRoutes from './routes/admin.routes';
import categoryRoutes from './routes/category.routes';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://localhost',
      'http://localhost:5173',
      'http://localhost:3000'
    ].filter(Boolean);

    if (
      !origin ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      allowedOrigins.some(allowed => allowed && (origin === allowed || origin.startsWith(allowed)))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/trajectory', trajectoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);

app.use(errorHandler);

export default app;
