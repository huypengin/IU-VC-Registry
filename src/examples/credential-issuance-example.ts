/**
 * Example: Integration with Credential Issuance
 * 
 * This shows how to integrate the StatusList2021 service
 * when issuing verifiable credentials.
 */

import { allocateStatusIndices } from '../status/status-list-service.js';

/**
 * Example credential issuance with status list
 */
export async function issueCredentialWithStatus(studentData: {
  id: string;
  name: string;
  degree: string;
  gpa: number;
}): Promise<any> {
  
  // 1. Allocate a status index for this credential
  const listId = 'slu-degree-2025';
  const credentialId = `urn:uuid:${studentData.id}`;
  
  console.log('🔢 Allocating status index...');
  const [statusListIndex] = await allocateStatusIndices(
    listId,
    1,  // Allocate 1 index
    credentialId
  );
  
  console.log(`✅ Allocated index: ${statusListIndex}`);
  
  // 2. Build the verifiable credential
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://infra-vc-registry-web-911368042037.asia-east2.run.app/contexts/iu-edu-degree-v1.jsonld',
    ],
    id: credentialId,
    type: ['VerifiableCredential', 'IUEducationDegreeCredential'],
    issuer: 'did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle',
    issuanceDate: new Date().toISOString(),
    
    // Credential subject (the student data)
    credentialSubject: {
      id: `did:web:student-${studentData.id}`,
      name: studentData.name,
      degree: studentData.degree,
      gpa: studentData.gpa,
      university: 'International University',
    },
    
    // ✨ Add status information (THIS IS THE KEY PART)
    credentialStatus: {
      id: `https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json#${statusListIndex}`,
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: String(statusListIndex),
      statusListCredential: 'https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json',
    },
  };
  
  console.log('📜 Credential with status:', JSON.stringify(credential, null, 2));
  
  // 3. Sign the credential (implement your signing logic here)
  // const signedCredential = await signCredential(credential);
  
  // 4. Store credential in your database
  // await storeCredential(signedCredential);
  
  return credential;
}

/**
 * Example: Batch credential issuance
 */
export async function issueBatchCredentials(students: Array<{
  id: string;
  name: string;
  degree: string;
  gpa: number;
}>): Promise<any[]> {
  
  const listId = 'slu-degree-2025';
  
  // 1. Allocate batch of indices
  console.log(`🔢 Allocating ${students.length} status indices...`);
  const indices = await allocateStatusIndices(listId, students.length);
  console.log(`✅ Allocated indices: ${indices[0]} to ${indices[indices.length - 1]}`);
  
  // 2. Create credentials with allocated indices
  const credentials = students.map((student, i) => {
    const statusListIndex = indices[i];
    const credentialId = `urn:uuid:${student.id}`;
    
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://infra-vc-registry-web-911368042037.asia-east2.run.app/contexts/iu-edu-degree-v1.jsonld',
      ],
      id: credentialId,
      type: ['VerifiableCredential', 'IUEducationDegreeCredential'],
      issuer: 'did:web:infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:web:student-${student.id}`,
        name: student.name,
        degree: student.degree,
        gpa: student.gpa,
        university: 'International University',
      },
      credentialStatus: {
        id: `https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json#${statusListIndex}`,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: String(statusListIndex),
        statusListCredential: 'https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json',
      },
    };
  });
  
  console.log(`✅ Created ${credentials.length} credentials with status`);
  
  return credentials;
}

/**
 * Example: CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const exampleStudent = {
    id: 'ITCST21001',
    name: 'Nguyen Van A',
    degree: 'Bachelor of Computer Science',
    gpa: 3.75,
  };
  
  issueCredentialWithStatus(exampleStudent)
    .then((credential) => {
      console.log('\n✅ Credential issued successfully!');
      console.log('\n📋 Credential ID:', credential.id);
      console.log('📍 Status Index:', credential.credentialStatus.statusListIndex);
      console.log('🔗 Status List URL:', credential.credentialStatus.statusListCredential);
    })
    .catch((error) => {
      console.error('❌ Error issuing credential:', error);
      process.exit(1);
    });
}

/**
 * How verifiers check status:
 * 
 * 1. Extract statusListCredential URL from the credential
 * 2. Fetch the StatusList2021Credential:
 *    GET https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json
 * 
 * 3. Extract encodedList from the response
 * 4. Decode: base64url -> GZIP -> bitstring
 * 5. Check bit at statusListIndex:
 *    - bit = 0: ✅ Valid (not revoked)
 *    - bit = 1: ❌ Revoked
 */

