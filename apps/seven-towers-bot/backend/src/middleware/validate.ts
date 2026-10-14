import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError, ErrorCodes } from '../lib/errors';

type Target = 'body' | 'query' | 'params';

/** Parse body/query/params with Zod; throw 400 VALIDATION_ERROR with field list. */
export function validate(schema: ZodType, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const problems = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || target,
        message: issue.message,
      }));
      next(
        new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
          details: problems,
        }),
      );
      return;
    }

    const data = result.data;
    if (target === 'body') {
      req.body = data;
    } else {
      // Express 5 exposes query/params as getters only — redefine the property.
      Object.defineProperty(req, target, {
        value: data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
