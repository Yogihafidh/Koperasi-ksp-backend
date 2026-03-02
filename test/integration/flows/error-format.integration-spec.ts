import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createTestApp,
  cleanupDatabase,
  seedDatabase,
  closeTestApp,
  getPrisma,
} from '../../helpers/test-app.helper';
import {
  loginAsAdmin,
  authGet,
  authPost,
  registerAndLogin,
} from '../../helpers/auth.helper';

/**
 * Verify every error response follows the standard format:
 * { statusCode, message, timestamp, path }
 */
describe('Error Response Format Consistency (Integration)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase(getPrisma());
    await seedDatabase(getPrisma());
    const tokens = await loginAsAdmin(app);
    adminToken = tokens.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  function assertErrorFormat(
    body: Record<string, unknown>,
    expectedStatus: number,
  ) {
    expect(body).toHaveProperty('statusCode', expectedStatus);
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path');
    // timestamp should be valid ISO string
    expect(new Date(body.timestamp as string).toISOString()).toBe(
      body.timestamp,
    );
  }

  describe('401 Unauthorized', () => {
    it('should return standard format for unauthenticated request', async () => {
      const res = await request(app.getHttpServer() as App)
        .get('/api/pegawai')
        .expect(401);

      assertErrorFormat(res.body, 401);
    });
  });

  describe('403 Forbidden', () => {
    it('should return standard format for unauthorized role', async () => {
      const user = await registerAndLogin(app, {
        username: 'errfmt_user',
        email: 'errfmt@test.com',
        password: 'ErrFmt123!',
      });

      const res = await authGet(app, '/api/settings', user.accessToken).expect(
        403,
      );

      assertErrorFormat(res.body, 403);
    });
  });

  describe('404 Not Found', () => {
    it('should return standard format for non-existent resource', async () => {
      const res = await authGet(app, '/api/pegawai/99999', adminToken).expect(
        404,
      );

      assertErrorFormat(res.body, 404);
    });

    it('should return standard format for non-existent route', async () => {
      const res = await authGet(app, '/api/nonexistent', adminToken).expect(
        404,
      );

      assertErrorFormat(res.body, 404);
    });
  });

  describe('400 Bad Request (Validation)', () => {
    it('should return standard format with validation messages', async () => {
      const res = await authPost(app, '/api/pegawai', adminToken)
        .send({})
        .expect(400);

      assertErrorFormat(res.body, 400);
      // message should be array of validation errors
      expect(
        Array.isArray(res.body.message) || typeof res.body.message === 'string',
      ).toBe(true);
    });
  });

  describe('409 Conflict', () => {
    it('should return standard format for duplicate resource', async () => {
      // Register same username twice
      await request(app.getHttpServer() as App)
        .post('/api/register')
        .send({
          username: 'errfmt_dup',
          email: 'errfmt_dup@test.com',
          password: 'ErrFmtDup123!',
        })
        .expect(201);

      const res = await request(app.getHttpServer() as App)
        .post('/api/register')
        .send({
          username: 'errfmt_dup',
          email: 'errfmt_dup2@test.com',
          password: 'ErrFmtDup123!',
        })
        .expect(409);

      assertErrorFormat(res.body, 409);
    });
  });
});
