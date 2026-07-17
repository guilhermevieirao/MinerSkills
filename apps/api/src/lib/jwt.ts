import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = 'HS256';

export interface AdminTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
}

export async function signAdminToken(payload: {
  sub: string;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
  return payload as AdminTokenPayload;
}
