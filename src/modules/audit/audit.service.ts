import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditRepository } from './audit.repository';
import { buildDiff, maskSensitiveFields } from './audit.utils';

type LogPayload = {
  userId?: number | null;
  entityName?: string | null;
  entityId?: number | null;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

@Injectable()
export class AuditTrailService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(payload: LogPayload, tx?: Prisma.TransactionClient) {
    const { oldValue, newValue } = buildDiff(payload.before, payload.after);

    const maskedOldValue = maskSensitiveFields(oldValue);
    const maskedNewValue = maskSensitiveFields(newValue);

    const hasOldValue = payload.before && Object.keys(oldValue).length;
    const hasNewValue = payload.after && Object.keys(newValue).length;

    const data: Prisma.AuditTrailCreateInput = {
      action: payload.action,
      ...(payload.userId ? { user: { connect: { id: payload.userId } } } : {}),
      ...(payload.entityName !== undefined && payload.entityName !== null
        ? { entityName: payload.entityName }
        : {}),
      ...(payload.entityId !== undefined && payload.entityId !== null
        ? { entityId: payload.entityId }
        : {}),
      ...(payload.ipAddress !== undefined && payload.ipAddress !== null
        ? { ipAddress: payload.ipAddress }
        : {}),
      ...(hasOldValue
        ? { oldValue: maskedOldValue as Prisma.InputJsonValue }
        : {}),
      ...(hasNewValue
        ? { newValue: maskedNewValue as Prisma.InputJsonValue }
        : {}),
    };

    return this.auditRepository.createAuditTrail(data, tx);
  }
}
