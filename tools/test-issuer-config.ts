import { getIssuerConfig } from '../src/v1.0/config/multikey.js';

try {
  const config = getIssuerConfig();
  console.log('\n✅ Issuer configuration loaded successfully!\n');
  console.log('Public Domain:', config.publicDomain);
  console.log('Issuer DID:', config.issuerDid);
  console.log('Verification Method:', config.issuerVerificationMethod);
  console.log('\nMultikey Details:');
  console.log('  Type:', config.multikey.type);
  console.log('  Controller:', config.multikey.controller);
  console.log('  ID:', config.multikey.id);
  console.log('  Public Key Multibase:', config.multikey.publicKeyMultibase);
  console.log('  Has Secret Key:', !!config.multikey.secretKeyMultibase);
  console.log('\n✅ All configuration validated successfully!\n');
} catch (error) {
  console.error('\n❌ Error loading issuer configuration:', error);
  process.exit(1);
}

