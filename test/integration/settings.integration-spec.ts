import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  cleanupDatabase,
  seedDatabase,
  closeTestApp,
  getPrisma,
} from '../helpers/test-app.helper';
import {
  loginAsAdmin,
  authGet,
  authPut,
  registerAndLogin,
} from '../helpers/auth.helper';

describe('Settings Module (Integration)', () => {
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

  describe('GET /api/settings', () => {
    it('should list all settings (10 seeded)', async () => {
      const res = await authGet(app, '/api/settings', adminToken).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('GET /api/settings/:key', () => {
    it('should get setting by key', async () => {
      const res = await authGet(
        app,
        '/api/settings/loan.maxLoanAmount',
        adminToken,
      ).expect(200);

      expect(res.body.data).toHaveProperty('key', 'loan.maxLoanAmount');
      expect(res.body.data).toHaveProperty('value');
    });

    it('should return 404 for non-existent key', async () => {
      await authGet(app, '/api/settings/nonexistent.key', adminToken).expect(
        404,
      );
    });
  });

  describe('PUT /api/settings/:key', () => {
    it('should update existing setting', async () => {
      const res = await authPut(
        app,
        '/api/settings/loan.maxLoanAmount',
        adminToken,
      )
        .send({
          value: '75000000',
          valueType: 'NUMBER',
          description: 'Updated max',
        })
        .expect(200);

      expect(res.body.data.value).toBe('75000000');
    });

    it('should create new setting via upsert', async () => {
      const res = await authPut(
        app,
        '/api/settings/custom.newSetting',
        adminToken,
      )
        .send({
          value: 'hello',
          valueType: 'STRING',
          description: 'New custom setting',
        })
        .expect(200);

      expect(res.body.data.key).toBe('custom.newSetting');
      expect(res.body.data.value).toBe('hello');
    });
  });

  describe('Authorization', () => {
    it('should reject non-admin access', async () => {
      const user = await registerAndLogin(app, {
        username: 'settingsnonadmin',
        email: 'settingsnonadmin@test.com',
        password: 'NoAdmin123!',
      });

      await authGet(app, '/api/settings', user.accessToken).expect(403);
    });
  });
});
