import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { env } from '../config/env';
import { AppError, ErrorCodes } from './errors';

/** Parse a phone into E.164 using DEFAULT_PHONE_REGION when no country code is given. */
export function normalizePhone(raw: string, region = env.DEFAULT_PHONE_REGION): string {
  const parsed = parsePhoneNumberFromString(raw, region as CountryCode);
  if (!parsed || !parsed.isValid()) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid phone number', {
      details: [{ path: 'phone', message: 'Invalid phone number' }],
    });
  }
  return parsed.format('E.164');
}
