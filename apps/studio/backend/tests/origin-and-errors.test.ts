import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { buildTestApp } from './helpers/test-app.js';
import { createErrorHandler } from '../src/middleware/error-handler.js';
import pino from 'pino';
import express from 'express';

describe('origin check', () => {
  it('rejects a mutating request with a foreign Origin', async () => {
    const { app } = await buildTestApp({
      CORS_ORIGIN: 'http://localhost:3001',
    });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'https://evil.example')
      .send({
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'password1234',
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('allows requests with no Origin header', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(201);
  });
});

describe('error handler', () => {
  it('never leaks an unknown error message', async () => {
    const app = express();
    app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('secret database password is hunter2'));
    });
    app.use(createErrorHandler(pino({ level: 'silent' })));

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(res.body.error.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});
