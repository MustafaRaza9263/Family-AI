import { describe, expect, it } from 'vitest';
import { libraryPageSchema } from '@studio/shared';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';

describe('GET /library admin scope', () => {
  it('lists only own assets for a regular user', async () => {
    const ctx = await buildStudioTestApp();
    const userA = await seedActiveUser(ctx.users, {
      email: 'a@example.com',
      fullName: 'Alice A',
      password: 'password1234',
    });
    const userB = await seedActiveUser(ctx.users, {
      email: 'b@example.com',
      fullName: 'Bob B',
      password: 'password1234',
    });

    await ctx.assets.create({
      userId: userA.id,
      kind: 'image',
      filePath: 'a.png',
      thumbPath: 'a.thumb.webp',
      mime: 'image/png',
      bytes: 4,
      width: 1,
      height: 1,
      source: 'generated',
      createdAt: ctx.clock.now(),
    });
    await ctx.assets.create({
      userId: userB.id,
      kind: 'image',
      filePath: 'b.png',
      thumbPath: 'b.thumb.webp',
      mime: 'image/png',
      bytes: 4,
      width: 1,
      height: 1,
      source: 'generated',
      createdAt: ctx.clock.now(),
    });

    const agent = await loginAgent(ctx.app, 'a@example.com', 'password1234');
    const res = await agent.get('/api/library');
    expect(res.status).toBe(200);
    const page = libraryPageSchema.parse(res.body);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.owner).toBeUndefined();
  });

  it('lists every user creation with owner for an admin', async () => {
    const ctx = await buildStudioTestApp();
    const userA = await seedActiveUser(ctx.users, {
      email: 'a@example.com',
      fullName: 'Alice A',
      password: 'password1234',
    });
    const userB = await seedActiveUser(ctx.users, {
      email: 'b@example.com',
      fullName: 'Bob B',
      password: 'password1234',
    });
    await seedActiveUser(ctx.users, {
      email: 'admin@example.com',
      fullName: 'Admin User',
      password: 'password1234',
      role: 'admin',
    });

    const assetA = await ctx.assets.create({
      userId: userA.id,
      kind: 'image',
      filePath: 'a.png',
      thumbPath: 'a.thumb.webp',
      mime: 'image/png',
      bytes: 4,
      width: 1,
      height: 1,
      source: 'generated',
      createdAt: new Date(ctx.clock.nowMs - 1000),
    });
    const assetB = await ctx.assets.create({
      userId: userB.id,
      kind: 'video',
      filePath: 'b.mp4',
      thumbPath: 'b.thumb.webp',
      mime: 'video/mp4',
      bytes: 8,
      width: 64,
      height: 64,
      durationSec: 1,
      source: 'generated',
      createdAt: ctx.clock.now(),
    });

    const admin = await loginAgent(
      ctx.app,
      'admin@example.com',
      'password1234',
    );
    const res = await admin.get('/api/library');
    expect(res.status).toBe(200);
    const page = libraryPageSchema.parse(res.body);
    expect(page.items).toHaveLength(2);
    expect(page.items.map((i) => i.id)).toEqual([assetB.id, assetA.id]);
    expect(page.items[0]?.owner).toEqual({
      id: userB.id,
      fullName: 'Bob B',
      email: 'b@example.com',
    });
    expect(page.items[1]?.owner).toEqual({
      id: userA.id,
      fullName: 'Alice A',
      email: 'a@example.com',
    });
  });
});
