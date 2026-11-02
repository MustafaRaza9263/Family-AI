import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';

describe('GET /files Range', () => {
  it('returns 206 for a ranged video request', async () => {
    const { app, users, assets, env } = await buildStudioTestApp();
    const user = await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const userDir = path.join(env.DATA_DIR, user.id);
    await mkdir(userDir, { recursive: true });
    const asset = await assets.create({
      userId: user.id,
      kind: 'video',
      filePath: '',
      thumbPath: '',
      mime: 'video/mp4',
      bytes: 20,
      width: 64,
      height: 64,
      durationSec: 1,
      source: 'generated',
      createdAt: new Date(),
    });
    const filePath = path.join(userDir, `${asset.id}.mp4`);
    const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
    const payload = Buffer.from('0123456789abcdefghij');
    await writeFile(filePath, payload);
    await writeFile(thumbPath, Buffer.from('thumb'));
    await assets.updatePaths(asset.id, filePath, thumbPath);

    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const res = await agent
      .get(`/api/files/${asset.id}`)
      .set('Range', 'bytes=0-4');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 0-4/20');
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(Buffer.from(res.body).toString()).toBe('01234');
  });
});
