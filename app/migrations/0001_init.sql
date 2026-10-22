-- Tablas de Better Auth (esquema base: user, session, account, verification).
CREATE TABLE "user" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"name" TEXT NOT NULL,
	"email" TEXT NOT NULL UNIQUE,
	"emailVerified" INTEGER NOT NULL,
	"image" TEXT,
	"createdAt" DATE NOT NULL,
	"updatedAt" DATE NOT NULL
);

CREATE TABLE "session" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"expiresAt" DATE NOT NULL,
	"token" TEXT NOT NULL UNIQUE,
	"createdAt" DATE NOT NULL,
	"updatedAt" DATE NOT NULL,
	"ipAddress" TEXT,
	"userAgent" TEXT,
	"userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON "session" ("userId");

CREATE TABLE "account" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"accountId" TEXT NOT NULL,
	"providerId" TEXT NOT NULL,
	"userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
	"accessToken" TEXT,
	"refreshToken" TEXT,
	"idToken" TEXT,
	"accessTokenExpiresAt" DATE,
	"refreshTokenExpiresAt" DATE,
	"scope" TEXT,
	"password" TEXT,
	"createdAt" DATE NOT NULL,
	"updatedAt" DATE NOT NULL
);
CREATE INDEX "account_userId_idx" ON "account" ("userId");

CREATE TABLE "verification" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"identifier" TEXT NOT NULL,
	"value" TEXT NOT NULL,
	"expiresAt" DATE NOT NULL,
	"createdAt" DATE NOT NULL,
	"updatedAt" DATE NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- Un registro por profesor(a): perfil, plan y todo su árbol de instituciones/cursos/estudiantes/notas
-- en "data" (JSON), igual que el documento /teachers/{uid} que había en Firestore.
CREATE TABLE "teacher" (
	"uid" TEXT PRIMARY KEY NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
	"email" TEXT,
	"phoneNumber" TEXT,
	"displayName" TEXT,
	"honorific" TEXT,
	"birthdate" TEXT,
	"photoDataUrl" TEXT,
	"plan" TEXT NOT NULL DEFAULT 'trial',
	"trialEndsAt" INTEGER NOT NULL,
	"createdAt" INTEGER NOT NULL,
	"data" TEXT NOT NULL
);
CREATE INDEX "teacher_plan_trial_idx" ON "teacher" ("plan", "trialEndsAt");
