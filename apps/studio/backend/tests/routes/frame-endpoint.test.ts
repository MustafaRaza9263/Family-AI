import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';

vi.mock('sharp', () => {
  const chain = {
    metadata: async () => ({ width: 2, height: 2 }),
    resize: () => chain,
    webp: () => chain,
    toFile: async () => undefined,
  };
  return { default: () => chain };
});

describe('POST /assets/:id/frame', () => {
  it('extracts a frame for the owner of a video only', async () => {
    const { app, users, assets, env } = await buildStudioTestApp();
    const owner = await seedActiveUser(users, {
      email: 'owner@example.com',
      fullName: 'Owner',
      password: 'password1234',
    });
    await seedActiveUser(users, {
      email: 'other@example.com',
      fullName: 'Other',
      password: 'password1234',
    });

    const userDir = path.join(env.DATA_DIR, owner.id);
    await mkdir(userDir, { recursive: true });
    const video = await assets.create({
      userId: owner.id,
      kind: 'video',
      filePath: '',
      thumbPath: '',
      mime: 'video/mp4',
      bytes: 10,
      width: 64,
      height: 64,
      durationSec: 1,
      source: 'generated',
      createdAt: new Date(),
    });
    const filePath = path.join(userDir, `${video.id}.mp4`);
    const thumbPath = path.join(userDir, `${video.id}.thumb.webp`);
    await writeFile(filePath, Buffer.from('videobytes'));
    await writeFile(thumbPath, Buffer.from('t'));
    await assets.updatePaths(video.id, filePath, thumbPath);

    const image = await assets.create({
      userId: owner.id,
      kind: 'image',
      filePath: path.join(userDir, 'img.png'),
      thumbPath: path.join(userDir, 'img.thumb.webp'),
      mime: 'image/png',
      bytes: 4,
      width: 8,
      height: 8,
      source: 'generated',
      createdAt: new Date(),
    });

    const ownerAgent = await loginAgent(app, 'owner@example.com', 'password1234');
    const otherAgent = await loginAgent(app, 'other@example.com', 'password1234');

    const forbidden = await otherAgent
      .post(`/api/assets/${video.id}/frame`)
      .send({ at: 'last' });
    expect(forbidden.status).toBe(403);

    const badKind = await ownerAgent
      .post(`/api/assets/${image.id}/frame`)
      .send({ at: 'first' });
    expect(badKind.status).toBe(400);
    expect(badKind.body.error.code).toBe('INVALID_INPUT');

    const ok = await ownerAgent
      .post(`/api/assets/${video.id}/frame`)
      .send({ at: 'last' });
    expect(ok.status).toBe(201);
    expect(ok.body.asset.kind).toBe('image');
    expect(ok.body.asset.source).toBe('derived');
    expect(ok.body.asset.parentAssetId).toBe(video.id);
  });
});
