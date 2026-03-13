import CryptoJS from "crypto-js";

/**
 * Chiffrement RÉVERSIBLE avec CryptoJS AES
 * ⚠️ IMPORTANT : Utilisé pour permettre à l'admin de récupérer les mots de passe en clair
 * (feature spécifique Filtreplante)
 */

export function encryptPassword(password: string, secret: string): string {
  return CryptoJS.AES.encrypt(password, secret).toString();
}

export function decryptPassword(encrypted: string, secret: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function verifyPassword(
  password: string,
  encrypted: string,
  secret: string
): boolean {
  try {
    const decrypted = decryptPassword(encrypted, secret);
    return password === decrypted;
  } catch {
    return false;
  }
}
