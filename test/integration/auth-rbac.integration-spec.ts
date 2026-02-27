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
  loginAs,
  registerAndLogin,
  authGet,
  authPost,
  authPut,
  authPatch,
  authDelete,
} from '../helpers/auth.helper';
import request from 'supertest';
import { App } from 'supertest/types';

describe('Auth RBAC (Integration)', () => {
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

  // ==================== ROLES CRUD ====================
  describe('Roles CRUD', () => {
    let createdRoleId: number;

    it('POST /api/roles — should create a new role', async () => {
      const res = await authPost(app, '/api/roles', adminToken)
        .send({ name: 'TestRole', description: 'Role for testing' })
        .expect(201);

      expect(res.body.message).toBe('Role berhasil dibuat');
      expect(res.body.role).toHaveProperty('id');
      expect(res.body.role.name).toBe('TestRole');
      createdRoleId = res.body.role.id;
    });

    it('POST /api/roles — should reject duplicate role name', async () => {
      await authPost(app, '/api/roles', adminToken)
        .send({ name: 'TestRole' })
        .expect(409);
    });

    it('GET /api/roles — should list all roles', async () => {
      const res = await authGet(app, '/api/roles', adminToken).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5); // 4 seeded + 1 created
    });

    it('GET /api/roles/:id — should get role by id', async () => {
      const res = await authGet(
        app,
        `/api/roles/${createdRoleId}`,
        adminToken,
      ).expect(200);

      expect(res.body.data.name).toBe('TestRole');
    });

    it('PUT /api/roles/:id — should update role', async () => {
      const res = await authPut(app, `/api/roles/${createdRoleId}`, adminToken)
        .send({ name: 'UpdatedRole' })
        .expect(200);

      expect(res.body.role.name).toBe('UpdatedRole');
    });

    it('DELETE /api/roles/:id — should delete role', async () => {
      const res = await authDelete(
        app,
        `/api/roles/${createdRoleId}`,
        adminToken,
      ).expect(200);

      expect(res.body.message).toBe('Role berhasil dihapus');

      // Verify deleted
      await authGet(app, `/api/roles/${createdRoleId}`, adminToken).expect(404);
    });
  });

  // ==================== PERMISSIONS CRUD ====================
  describe('Permissions CRUD', () => {
    let createdPermId: number;

    it('POST /api/permissions — should create permission', async () => {
      const res = await authPost(app, '/api/permissions', adminToken)
        .send({ code: 'test.permission', description: 'Test perm' })
        .expect(201);

      expect(res.body.permission).toHaveProperty('id');
      createdPermId = res.body.permission.id;
    });

    it('POST /api/permissions — should reject duplicate code', async () => {
      await authPost(app, '/api/permissions', adminToken)
        .send({ code: 'test.permission' })
        .expect(409);
    });

    it('GET /api/permissions — should list all permissions', async () => {
      const res = await authGet(app, '/api/permissions', adminToken).expect(
        200,
      );

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(36); // 36 seeded
    });

    it('DELETE /api/permissions/:id — should delete permission', async () => {
      await authDelete(
        app,
        `/api/permissions/${createdPermId}`,
        adminToken,
      ).expect(200);
    });
  });

  // ==================== ROLE-PERMISSION ASSIGNMENT ====================
  describe('Role-Permission Assignment', () => {
    let testRoleId: number;

    beforeAll(async () => {
      const res = await authPost(app, '/api/roles', adminToken)
        .send({ name: 'AssignTestRole' })
        .expect(201);
      testRoleId = res.body.role.id;
    });

    it('should assign permissions to role', async () => {
      const permsRes = await authGet(
        app,
        '/api/permissions',
        adminToken,
      ).expect(200);
      const firstTwoIds = permsRes.body.data
        .slice(0, 2)
        .map((p: { id: number }) => p.id);

      const res = await authPost(
        app,
        `/api/roles/${testRoleId}/permissions`,
        adminToken,
      )
        .send({ permissionIds: firstTwoIds })
        .expect(201);

      expect(res.body.message).toContain('berhasil');
    });

    it('should verify role has assigned permissions', async () => {
      const res = await authGet(
        app,
        `/api/roles/${testRoleId}`,
        adminToken,
      ).expect(200);
      expect(res.body.data.permissions.length).toBe(2);
    });

    it('should remove permission from role', async () => {
      const roleRes = await authGet(
        app,
        `/api/roles/${testRoleId}`,
        adminToken,
      ).expect(200);
      const permId = roleRes.body.data.permissions[0].permissionId;

      await authDelete(
        app,
        `/api/roles/${testRoleId}/permissions/${permId}`,
        adminToken,
      ).expect(200);

      const updated = await authGet(
        app,
        `/api/roles/${testRoleId}`,
        adminToken,
      ).expect(200);
      expect(updated.body.data.permissions.length).toBe(1);
    });
  });

  // ==================== USER-ROLE ASSIGNMENT ====================
  describe('User-Role Assignment', () => {
    let testUserId: number;

    beforeAll(async () => {
      const result = await registerAndLogin(app, {
        username: 'rbacuser',
        email: 'rbac@test.com',
        password: 'RbacPass123!',
      });
      testUserId = result.userId;
    });

    it('should assign roles to user', async () => {
      const rolesRes = await authGet(app, '/api/roles', adminToken).expect(200);
      const staffRole = rolesRes.body.data.find(
        (r: { name: string }) => r.name === 'Staff',
      );

      const res = await authPost(
        app,
        `/api/users/${testUserId}/roles`,
        adminToken,
      )
        .send({ roleIds: [staffRole.id] })
        .expect(201);

      expect(res.body.message).toContain('berhasil');
    });

    it('should get user roles', async () => {
      const res = await authGet(
        app,
        `/api/users/${testUserId}/roles`,
        adminToken,
      ).expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should remove role from user', async () => {
      const userRoles = await authGet(
        app,
        `/api/users/${testUserId}/roles`,
        adminToken,
      ).expect(200);
      const roleId = userRoles.body.data[0].roleId;

      await authDelete(
        app,
        `/api/users/${testUserId}/roles/${roleId}`,
        adminToken,
      ).expect(200);

      const updatedRoles = await authGet(
        app,
        `/api/users/${testUserId}/roles`,
        adminToken,
      ).expect(200);
      expect(updatedRoles.body.data.length).toBe(0);
    });
  });

  // ==================== GUARD TESTS ====================
  describe('Authorization Guards', () => {
    it('should reject user without Admin role accessing pegawai.create', async () => {
      // Register user tanpa role
      const result = await registerAndLogin(app, {
        username: 'norole',
        email: 'norole@test.com',
        password: 'NoRole123!',
      });

      await authPost(app, '/api/pegawai', result.accessToken)
        .send({
          userId: 1,
          nama: 'Test',
          jabatan: 'Staff',
          noHp: '081200001111',
          alamat: 'Test',
        })
        .expect(403);
    });

    it('should reject user with Staff role accessing admin-only endpoint', async () => {
      const staffResult = await registerAndLogin(app, {
        username: 'staffguard',
        email: 'staffguard@test.com',
        password: 'StaffGuard123!',
      });

      // Assign Staff role
      const rolesRes = await authGet(app, '/api/roles', adminToken).expect(200);
      const staffRole = rolesRes.body.data.find(
        (r: { name: string }) => r.name === 'Staff',
      );
      await authPost(app, `/api/users/${staffResult.userId}/roles`, adminToken)
        .send({ roleIds: [staffRole.id] })
        .expect(201);

      // Re-login to get updated token
      const { accessToken } = await loginAs(
        app,
        'staffguard',
        'StaffGuard123!',
      );

      // Staff cannot access pegawai.create (Admin only)
      await authPost(app, '/api/pegawai', accessToken)
        .send({
          userId: 1,
          nama: 'Test',
          jabatan: 'Staff',
          noHp: '081200001111',
          alamat: 'Test',
        })
        .expect(403);
    });
  });

  // ==================== UPDATE USER ====================
  describe('PATCH /api/users/:id', () => {
    it('should deactivate user and prevent login', async () => {
      const result = await registerAndLogin(app, {
        username: 'deactivateuser',
        email: 'deactivate@test.com',
        password: 'Deactivate123!',
      });

      // Admin deactivates user
      await authPatch(app, `/api/users/${result.userId}`, adminToken)
        .send({ isActive: false })
        .expect(200);

      // User should not be able to login
      await request(app.getHttpServer() as App)
        .post('/api/login')
        .send({
          usernameOrEmail: 'deactivateuser',
          password: 'Deactivate123!',
        })
        .expect(401);
    });
  });
});
