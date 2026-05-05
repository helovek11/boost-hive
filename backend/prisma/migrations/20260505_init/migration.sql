-- PostgreSQL migration for initial Prisma schema
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  "passwordHash" TEXT,
  role TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Service" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  "pricePer1k" REAL,
  "minOrder" INTEGER,
  "maxOrder" INTEGER,
  speed TEXT,
  retention TEXT,
  quality TEXT,
  icon TEXT,
  badge TEXT
);

CREATE TABLE IF NOT EXISTS "Order" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "serviceId" TEXT,
  target TEXT,
  quantity INTEGER,
  status TEXT,
  progress INTEGER,
  date TIMESTAMPTZ DEFAULT now(),
  price REAL,
  FOREIGN KEY ("userId") REFERENCES "User"(id),
  FOREIGN KEY ("serviceId") REFERENCES "Service"(id)
);

CREATE TABLE IF NOT EXISTS "TerminalMessage" (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  type TEXT,
  content TEXT
);

CREATE TABLE IF NOT EXISTS "ApiCredential" (
  id TEXT PRIMARY KEY,
  provider TEXT,
  "apiUrl" TEXT,
  "apiKeyHash" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
