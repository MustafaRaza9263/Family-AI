import type { Types } from 'mongoose';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
      accountStatus?: 'pending' | 'active' | 'disabled';
      id?: string;
    }
  }
}

export type ObjectId = Types.ObjectId;
