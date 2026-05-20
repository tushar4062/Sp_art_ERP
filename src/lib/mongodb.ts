import mongoose from 'mongoose';
import dns from 'node:dns';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch {
  /* ignore if unsupported */
}

let resolvedUri: string | null = null;

/** Resolve mongodb+srv to a standard URI (avoids querySrv ECONNREFUSED on some Windows setups). */
async function getConnectionUri(): Promise<string> {
  if (resolvedUri) return resolvedUri;
  if (!MONGODB_URI.startsWith('mongodb+srv://')) {
    resolvedUri = MONGODB_URI;
    return resolvedUri;
  }

  const parsed = new URL(MONGODB_URI);
  const srvHost = `_mongodb._tcp.${parsed.hostname}`;
  const records = await dns.promises.resolveSrv(srvHost);
  const hosts = records.map(r => `${r.name}:${r.port}`).join(',');
  const auth =
    parsed.username && parsed.password
      ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`
      : parsed.username
        ? `${encodeURIComponent(parsed.username)}@`
        : '';
  const dbName = parsed.pathname.replace(/^\//, '') || 'SpArts';
  const search = parsed.search ? parsed.search.replace(/^\?/, '') : '';
  const params = new URLSearchParams(search);
  if (!params.has('ssl')) params.set('ssl', 'true');
  if (!params.has('authSource')) params.set('authSource', 'admin');
  const query = params.toString();

  resolvedUri = `mongodb://${auth}${hosts}/${dbName}${query ? `?${query}` : ''}`;
  return resolvedUri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      maxPoolSize: 10,
    };

    cached.promise = getConnectionUri()
      .then(uri => mongoose.connect(uri, opts))
      .then(m => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    resolvedUri = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
