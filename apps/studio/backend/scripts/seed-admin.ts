/**
 * Create the first admin. Never prints the password.
 * Prefers SEED_ADMIN_EMAIL / SEED_ADMIN_NAME / SEED_ADMIN_PASSWORD;
 * otherwise prompts interactively (password input does not echo).
 */
import { createInterface } from 'node:readline';
import { loadEnv } from '../src/config/env.js';
import { createLogger } from '../src/lib/logger.js';
import { hashPassword } from '../src/lib/password.js';
import { connectMongo, closeMongo } from '../src/db/mongo.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { MongoUserRepository } from '../src/db/repositories/mongo-user-repository.js';

function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const fromEnv = process.env.SEED_ADMIN_PASSWORD;
    if (!fromEnv) {
      throw new Error('SEED_ADMIN_PASSWORD is required when stdin is not a TTY');
    }
    return fromEnv;
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const onData = (char: string): void => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (char === '\u0003') {
        reject(new Error('Cancelled'));
        return;
      }
      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);
  const db = await connectMongo(env.MONGODB_URI, logger);
  await ensureIndexes(db);
  const users = new MongoUserRepository(db);

  let email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  let fullName = process.env.SEED_ADMIN_NAME?.trim();
  let password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !fullName || !password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    fullName = fullName || (await ask(rl, 'Full name: '));
    email = email || (await ask(rl, 'Email: ')).toLowerCase();
    rl.close();
    password = password || (await askHidden('Password: '));
  }

  if (!email || !fullName || !password) {
    throw new Error('Email, full name and password are required');
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error('Password must be 10-128 characters');
  }

  const existing = await users.findByEmail(email);
  if (existing) {
    throw new Error(`User with email ${email} already exists`);
  }

  const now = new Date();
  await users.create({
    email,
    fullName,
    passwordHash: await hashPassword(password),
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  process.stdout.write(`Created admin user ${email}.\n`);
  await closeMongo(logger);
}

main().catch(async (err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  try {
    await closeMongo();
  } catch {
    // ignore
  }
  process.exit(1);
});
