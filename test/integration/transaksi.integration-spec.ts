import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  cleanupDatabase,
  seedDatabase,
  closeTestApp,
  getPrisma,
} from '../helpers/test-app.helper';
import { loginAsAdmin, authGet, authPost } from '../helpers/auth.helper';
import { createFullNasabah } from '../helpers/factory.helper';

describe('Transaksi Module (Integration)', () => {
  let app: INestApplication;
  let adminToken: string;
  let nasabahId: number;
  let rekeningSukarelaId: number;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanupDatabase(getPrisma());
    await seedDatabase(getPrisma());
    const tokens = await loginAsAdmin(app);
    adminToken = tokens.accessToken;

    // Create verified nasabah with rekening
    const { nasabah, rekeningList } = await createFullNasabah(app, adminToken);
    nasabahId = nasabah.id;
    rekeningSukarelaId = rekeningList.find(
      (r: { jenisSimpanan: string }) => r.jenisSimpanan === 'SUKARELA',
    )!.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  let createdTransaksiId: number;

  describe('POST /api/transaksi', () => {
    it('should create SETORAN transaksi via generic endpoint', async () => {
      const res = await authPost(app, '/api/transaksi', adminToken)
        .send({
          nasabahId,
          rekeningSimpananId: rekeningSukarelaId,
          jenisTransaksi: 'SETORAN',
          nominal: 500000,
          metodePembayaran: 'CASH',
        })
        .expect(201);

      expect(res.body.message).toContain('berhasil');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.jenisTransaksi).toBe('SETORAN');
      createdTransaksiId = res.body.data.id;
    });

    it('should reject invalid jenisTransaksi', async () => {
      await authPost(app, '/api/transaksi', adminToken)
        .send({
          nasabahId,
          rekeningSimpananId: rekeningSukarelaId,
          jenisTransaksi: 'INVALID_TYPE',
          nominal: 100000,
          metodePembayaran: 'CASH',
        })
        .expect(400);
    });

    it('should reject without nasabahId', async () => {
      await authPost(app, '/api/transaksi', adminToken)
        .send({
          rekeningSimpananId: rekeningSukarelaId,
          jenisTransaksi: 'SETORAN',
          nominal: 100000,
          metodePembayaran: 'CASH',
        })
        .expect(400);
    });
  });

  describe('GET /api/transaksi', () => {
    it('should list all transaksi with pagination', async () => {
      const res = await authGet(app, '/api/transaksi', adminToken).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by jenisTransaksi', async () => {
      const res = await authGet(
        app,
        '/api/transaksi?jenisTransaksi=SETORAN',
        adminToken,
      ).expect(200);

      for (const trx of res.body.data) {
        expect(trx.jenisTransaksi).toBe('SETORAN');
      }
    });

    it('should filter by statusTransaksi', async () => {
      const res = await authGet(
        app,
        '/api/transaksi?statusTransaksi=APPROVED',
        adminToken,
      ).expect(200);

      for (const trx of res.body.data) {
        expect(trx.statusTransaksi).toBe('APPROVED');
      }
    });
  });

  describe('GET /api/transaksi/:id', () => {
    it('should get transaksi by id', async () => {
      const res = await authGet(
        app,
        `/api/transaksi/${createdTransaksiId}`,
        adminToken,
      ).expect(200);

      expect(res.body.data.id).toBe(createdTransaksiId);
      expect(res.body.data).toHaveProperty('jenisTransaksi');
      expect(res.body.data).toHaveProperty('statusTransaksi');
      expect(res.body.data).toHaveProperty('nominal');
    });
  });

  describe('GET /api/transaksi/nasabah/:nasabahId', () => {
    it('should list transaksi by nasabah', async () => {
      const res = await authGet(
        app,
        `/api/transaksi/nasabah/${nasabahId}`,
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/transaksi/pending', () => {
    it('should list pending transaksi', async () => {
      const res = await authGet(
        app,
        '/api/transaksi/pending',
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/transaksi/export', () => {
    it('should export transaksi data', async () => {
      const res = await authGet(
        app,
        '/api/transaksi/export',
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should export with date range filter', async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = now.toISOString();

      const res = await authGet(
        app,
        `/api/transaksi/export?tanggalFrom=${from}&tanggalTo=${to}`,
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
