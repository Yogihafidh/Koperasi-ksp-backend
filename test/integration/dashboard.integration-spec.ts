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
  registerAndLogin,
} from '../helpers/auth.helper';

describe('Dashboard Module (Integration)', () => {
  let app: INestApplication;
  let adminToken: string;

  const bulan = new Date().getMonth() + 1;
  const tahun = new Date().getFullYear();

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

  describe('GET /api/dashboard', () => {
    it('should return dashboard summary', async () => {
      const res = await authGet(
        app,
        `/api/dashboard?bulan=${bulan}&tahun=${tahun}`,
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should require bulan and tahun query params', async () => {
      await authGet(app, '/api/dashboard', adminToken).expect(400);
    });

    it('should reject invalid bulan (>12)', async () => {
      await authGet(
        app,
        `/api/dashboard?bulan=13&tahun=${tahun}`,
        adminToken,
      ).expect(400);
    });

    it('should reject invalid tahun (<2000)', async () => {
      await authGet(
        app,
        `/api/dashboard?bulan=1&tahun=1990`,
        adminToken,
      ).expect(400);
    });
  });

  describe('Authorization', () => {
    it('should reject users without dashboard.read permission', async () => {
      const user = await registerAndLogin(app, {
        username: 'dashnoacccess',
        email: 'dashnoaccess@test.com',
        password: 'NoAccess123!',
      });

      await authGet(
        app,
        `/api/dashboard?bulan=${bulan}&tahun=${tahun}`,
        user.accessToken,
      ).expect(403);
    });
  });
});
