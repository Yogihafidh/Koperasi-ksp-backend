const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'nik',
]);

function maskString(value: string) {
  if (value.length <= 8) {
    return '********';
  }
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

export function maskSensitiveFields(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveFields(item));
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      if (SENSITIVE_FIELDS.has(key)) {
        result[key] =
          typeof value === 'string' ? maskString(value) : '********';
      } else {
        result[key] = maskSensitiveFields(value);
      }
    }
    return result;
  }

  return input;
}

export function buildDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  const beforeValue = before ?? {};
  const afterValue = after ?? {};
  const keys = new Set([
    ...Object.keys(beforeValue),
    ...Object.keys(afterValue),
  ]);

  for (const key of keys) {
    const prev = beforeValue[key];
    const next = afterValue[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      oldValue[key] = prev ?? null;
      newValue[key] = next ?? null;
    }
  }

  return { oldValue, newValue };
}
