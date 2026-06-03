import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Ekstrem API', version: '1.0.0' });
});

// Routes (will be added by Backend API agent)
// import authRouter from './routes/auth.js';
// import gmailRouter from './routes/gmail.js';
// import pdfRouter from './routes/pdf.js';

app.listen(PORT, () => {
  console.log(`Ekstrem API running on http://localhost:${PORT}`);
});

export default app;
