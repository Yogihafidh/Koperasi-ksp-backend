import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ==================== USER OPERATIONS ====================
  async createUser(data: {
    username: string;
    email: string;
    password: string;
  }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findUserByUsernameOrEmail(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateUserPassword(userId: number, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  async updateUser(
    userId: number,
    data: {
      username?: string;
      email?: string;
      password?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateLastLogin(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ==================== ROLE OPERATIONS ====================
  async createRole(data: { name: string; description?: string }) {
    return this.prisma.role.create({
      data,
    });
  }

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async findRoleById(id: number) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async updateRole(id: number, data: { name?: string; description?: string }) {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: number) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  // ==================== PERMISSION OPERATIONS ====================
  async createPermission(data: { code: string; description?: string }) {
    return this.prisma.permission.create({
      data,
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });
  }

  async findPermissionById(id: number) {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async findPermissionByCode(code: string) {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }

  async deletePermission(id: number) {
    return this.prisma.permission.delete({
      where: { id },
    });
  }

  // ==================== ROLE-PERMISSION OPERATIONS ====================
  async assignPermissionsToRole(roleId: number, permissionIds: number[]) {
    // Delete existing permissions for the role
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions
    const data = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    return this.prisma.rolePermission.createMany({
      data,
    });
  }

  async removePermissionFromRole(roleId: number, permissionId: number) {
    return this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
  }

  // ==================== USER-ROLE OPERATIONS ====================
  async assignRolesToUser(userId: number, roleIds: number[]) {
    // Delete existing roles for the user
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // Create new roles
    const data = roleIds.map((roleId) => ({
      userId,
      roleId,
    }));

    return this.prisma.userRole.createMany({
      data,
    });
  }

  async removeRoleFromUser(userId: number, roleId: number) {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  async getUserRoles(userId: number) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }
}
