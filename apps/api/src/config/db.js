import mongoose from 'mongoose';

// maxPoolSize is PER PROCESS; total Atlas connections = sum across dynos. Keep it modest
// and explicit rather than the driver default of 100. socketTimeoutMS caps a hung query so
// it can't hold a pooled connection forever.
const baseOptions = () => ({
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 1,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 120000,
  retryWrites: true,
  retryReads: true,
});

export const connectDb = async (uri, overrides = {}) => {
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  // Auto-build indexes only outside production; production indexes (the unique ledger
  // clientId index especially) are built deliberately by a migration script.
  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');
  await mongoose.connect(uri, { ...baseOptions(), ...overrides });
  return mongoose.connection;
};
