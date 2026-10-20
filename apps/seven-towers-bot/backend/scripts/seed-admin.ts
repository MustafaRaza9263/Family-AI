/**
 * Create (or promote) the first admin user.
 * Interactive when stdin is a TTY; otherwise reads SEED_ADMIN_PASSWORD.
 */
import { createInterface } from 'readline';
import { connect, disconnect } from '../src/db/connection';
import { hashPassword, assertPasswordRules } from '../src/lib/password';
import { normalizePhone } from '../src/lib/phone';
import { User } from '../src/models/user.model';

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
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
  await connect();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const fullName = await ask(rl, 'Full name: ');
  const email = (await ask(rl, 'Email: ')).toLowerCase();
  const phoneRaw = await ask(rl, 'Phone: ');
  rl.close();

  const password1 = await askHidden('Password: ');
  if (process.stdin.isTTY) {
    const password2 = await askHidden('Password (again): ');
    if (password1 !== password2) {
      throw new Error('Passwords do not match');
    }
  }

  assertPasswordRules(password1, email);
  const phone = normalizePhone(phoneRaw);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    await existing.save();
    console.log(`Updated existing user ${email} to role=admin (password unchanged).`);
  } else {
    await User.create({
      email,
      fullName,
      phone,
      passwordHash: await hashPassword(password1),
      role: 'admin',
      status: 'active',
    });
    console.log(`Created admin user ${email}.`);
  }

  await disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
