import { getIssuerConfig } from '../src/v1.0/config/multikey.js';

try {
  const config = getIssuerConfig();
  console.log('\n✅ Issuer configuration loaded successfully!\n');
  console.log('Public Domain:', config.publicDomain);
  console.log('Issuer DID:', config.issuerDid);
  console.log('Verification Method:', config.issuerVerificationMethod);
  console.log('\nES256 JWK Details:');
  console.log('  Key Type:', config.privateKeyJwk.kty);
  console.log('  Curve:', config.privateKeyJwk.crv);
  console.log('  Algorithm:', config.privateKeyJwk.alg);
  console.log('  Key ID:', config.privateKeyJwk.kid);
  console.log('  Has Private Component:', !!config.privateKeyJwk.d);
  console.log('\n✅ All configuration validated successfully!\n');
} catch (error) {
  console.error('\n❌ Error loading issuer configuration:', error);
  process.exit(1);
}
