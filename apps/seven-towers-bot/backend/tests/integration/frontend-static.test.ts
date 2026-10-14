import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { createFakeKnowledge, createPlainLlm } from '../helpers/fakes';

describe('frontend static serving', () => {
  let distDir = '';

  beforeEach(() => {
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-frontend-'));
    fs.mkdirSync(path.join(distDir, 'login'), { recursive: true });
    fs.writeFileSync(
      path.join(distDir, 'login', 'index.html'),
      '<!doctype html><title>login</title>',
    );
    fs.writeFileSync(
      path.join(distDir, '404.html'),
      '<!doctype html><title>missing</title>',
    );
  });

  afterEach(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it('GET /login/ returns HTML and GET /api/nope returns JSON 404', async () => {
    const app = createApp({
      llm: createPlainLlm(),
      knowledge: createFakeKnowledge(),
      frontendDistDir: distDir,
    });

    const login = await request(app).get('/login/');
    expect(login.status).toBe(200);
    expect(login.headers['content-type']).toMatch(/html/);
    expect(login.text).toContain('login');

    const api = await request(app).get('/api/nope');
    expect(api.status).toBe(404);
    expect(api.headers['content-type']).toMatch(/json/);
    expect(api.body.error.code).toBe('NOT_FOUND');
  });
});
