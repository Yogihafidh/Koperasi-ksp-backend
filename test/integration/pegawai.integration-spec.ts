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
  registerUser,
  authGet,
  authPost,
  authPatch,
} from '../helpers/auth.helper';

describe('Pegawai Module (Integration)', () => {
  let app: INestApplication;
  let adminToken: string;
  let testUserId: number;
  let createdPegawaiId: number;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase(getPrisma());
    await seedDatabase(getPrisma());
    const tokens = await loginAsAdmin(app);
    adminToken = tokens.accessToken;

    // Create a user for pegawai
    const userRes = await registerUser(app, {
      username: 'pegawaiuser1',
      email: 'pegawai1@test.com',
      password: 'Pegawai123!',
    });
    testUserId = userRes.user.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /api/pegawai', () => {
    it('should create pegawai successfully', async () => {
      const res = await authPost(app, '/api/pegawai', adminToken)
        .send({
          userId: testUserId,
          nama: 'Budi Pegawai',
          jabatan: 'Kasir',
          noHp: '081299998888',
          alamat: 'Jl. Pegawai No. 1',
        })
        .expect(201);

      expect(res.body.message).toBe('Pegawai berhasil dibuat');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nama).toBe('Budi Pegawai');
      expect(res.body.data.statusAktif).toBe(true);
      createdPegawaiId = res.body.data.id;
    });

    it('should reject duplicate user as pegawai', async () => {
      await authPost(app, '/api/pegawai', adminToken)
        .send({
          userId: testUserId,
          nama: 'Duplicate',
          jabatan: 'Staff',
          noHp: '081200000000',
          alamat: 'Duplicate',
        })
        .expect(409);
    });

    it('should reject invalid DTO', async () => {
      await authPost(app, '/api/pegawai', adminToken)
        .send({ nama: 'No userId' })
        .expect(400);
    });

    it('should reject non-existent userId', async () => {
      await authPost(app, '/api/pegawai', adminToken)
        .send({
          userId: 99999,
          nama: 'Ghost User',
          jabatan: 'Staff',
          noHp: '081200000000',
          alamat: 'Nowhere',
        })
        .expect(404);
    });
  });

  describe('GET /api/pegawai', () => {
    it('should list pegawai with pagination', async () => {
      const res = await authGet(app, '/api/pegawai', adminToken).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toHaveProperty('nextCursor');
      expect(res.body.pagination).toHaveProperty('hasNext');
    });
  });

  describe('GET /api/pegawai/:id', () => {
    it('should get pegawai by id', async () => {
      const res = await authGet(
        app,
        `/api/pegawai/${createdPegawaiId}`,
        adminToken,
      ).expect(200);

      expect(res.body.data.id).toBe(createdPegawaiId);
      expect(res.body.data.nama).toBe('Budi Pegawai');
      expect(res.body.data.user).toHaveProperty('username');
    });

    it('should return 404 for non-existent id', async () => {
      await authGet(app, '/api/pegawai/99999', adminToken).expect(404);
    });
  });

  describe('PATCH /api/pegawai/:id', () => {
    it('should update pegawai data', async () => {
      const res = await authPatch(
        app,
        `/api/pegawai/${createdPegawaiId}`,
        adminToken,
      )
        .send({ jabatan: 'Kasir Senior', noHp: '081277776666' })
        .expect(200);

      expect(res.body.data.jabatan).toBe('Kasir Senior');
      expect(res.body.data.noHp).toBe('081277776666');
    });
  });

  describe('PATCH /api/pegawai/:id/status', () => {
    it('should toggle pegawai status', async () => {
      const res = await authPatch(
        app,
        `/api/pegawai/${createdPegawaiId}/status`,
        adminToken,
      )
        .send({ statusAktif: false })
        .expect(200);

      expect(res.body.data.statusAktif).toBe(false);

      // Re-activate
      const res2 = await authPatch(
        app,
        `/api/pegawai/${createdPegawaiId}/status`,
        adminToken,
      )
        .send({ statusAktif: true })
        .expect(200);

      expect(res2.body.data.statusAktif).toBe(true);
    });
  });
});
