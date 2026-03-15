/**
 * Script de migration one-shot : password_encrypted (CryptoJS AES) → password_encoded (Base64)
 *
 * Usage :
 *   npx tsx scripts/migrate-passwords.ts
 *
 * Prérequis : variables d'env DATABASE_URL et CRYPTO_SECRET
 * Le script est ADDITIF — il ne modifie pas password_encrypted
 */

import { neon } from "@neondatabase/serverless";
import CryptoJS from "crypto-js";

const DATABASE_URL = process.env.DATABASE_URL;
const CRYPTO_SECRET = process.env.CRYPTO_SECRET;

if (!DATABASE_URL || !CRYPTO_SECRET) {
  console.error("❌ Manque DATABASE_URL ou CRYPTO_SECRET dans les variables d'env");
  console.error("   Usage : DATABASE_URL=... CRYPTO_SECRET=... npx tsx scripts/migrate-passwords.ts");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("🔄 Étape 1 : Vérifier/ajouter la colonne password_encoded...");

  // Ajouter la colonne si elle n'existe pas
  await sql`
    ALTER TABLE referentiel.users
    ADD COLUMN IF NOT EXISTS password_encoded TEXT
  `;
  console.log("✅ Colonne password_encoded existe");

  // Lire tous les utilisateurs
  console.log("\n🔄 Étape 2 : Convertir les mots de passe...");
  const users = await sql`
    SELECT id, username, password_encrypted
    FROM referentiel.users
  `;

  console.log(`   ${users.length} utilisateurs trouvés\n`);

  let success = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Décrypter CryptoJS AES
      const bytes = CryptoJS.AES.decrypt(user.password_encrypted, CRYPTO_SECRET);
      const plaintext = bytes.toString(CryptoJS.enc.Utf8);

      if (!plaintext) {
        console.error(`   ❌ ${user.username} : décryptage vide (CRYPTO_SECRET incorrect ?)`);
        errors++;
        continue;
      }

      // Encoder en Base64
      const encoded = Buffer.from(plaintext).toString("base64");

      // Écrire dans password_encoded
      await sql`
        UPDATE referentiel.users
        SET password_encoded = ${encoded}
        WHERE id = ${user.id}
      `;

      // Vérification : décoder et comparer
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const match = decoded === plaintext ? "✅" : "❌ MISMATCH";
      console.log(`   ${match} ${user.username} : "${plaintext}" → Base64 OK`);
      success++;
    } catch (err: any) {
      console.error(`   ❌ ${user.username} : ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Résultat : ${success} succès, ${errors} erreurs sur ${users.length} utilisateurs`);

  if (errors > 0) {
    console.error("\n⚠️  Des erreurs sont survenues. Vérifiez CRYPTO_SECRET et les données.");
    process.exit(1);
  }

  console.log("\n✅ Migration terminée ! Les deux colonnes coexistent :");
  console.log("   - password_encrypted (CryptoJS AES) → utilisé par les apps Replit");
  console.log("   - password_encoded (Base64) → utilisé par les nouvelles apps CF Workers");
}

migrate().catch((err) => {
  console.error("💥 Erreur fatale :", err);
  process.exit(1);
});
