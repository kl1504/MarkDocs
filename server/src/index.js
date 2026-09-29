import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD is not set. Anyone who can reach this API can edit and delete documents.');
}

const port = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/folio')
  .then(() => createApp().listen(port, () => console.log(`Folio API listening on :${port}`)))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
