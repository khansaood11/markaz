import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

type Session = {
  isLoggedIn: boolean;
};

// These functions are for encrypting and decrypting the session cookie.
// They use JOSE which works in Node.js, Edge, and browser environments.

export async function sealData(
  data: Session,
  options: { password: string }
): Promise<string> {
  const secret = new TextEncoder().encode(options.password);
  const alg = 'HS256';

  return new SignJWT(data)
    .setProtectedHeader({ alg })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);
}

export async function unsealData<T>(
  token: string,
  options: { password: string }
): Promise<T | null> {
  const secret = new TextEncoder().encode(options.password);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch (e) {
    return null;
  }
}
