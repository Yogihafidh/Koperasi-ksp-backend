import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createAuditTrail(
    data: Prisma.AuditTrailCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client: PrismaClientOrTx = tx ?? this.prisma;
    return client.auditTrail.create({ data });
  }
}
