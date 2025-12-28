import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@valspec/env/server";

import { Prisma, PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;

// Re-export PrismaClient type and Prisma namespace for input types
export type { PrismaClient };
export { Prisma };

// Re-export model types and enums from client (includes Environment, Secret, etc.)
export type {
  User,
  Session,
  Account,
  Verification,
  Apikey,
  Project,
  Environment,
  Secret,
  SecretVersion,
  AuditLog,
} from "../prisma/generated/client";

export * from "../prisma/generated/enums";
