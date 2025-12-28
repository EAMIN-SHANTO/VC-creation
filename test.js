// test.js - Testing VC Verification Scenarios
import { setupAgent } from './src/agent.js'

async function runTests() {
  console.log('========================================')
  console.log('VC VERIFICATION TEST SUITE')
  console.log('========================================')

  const agent = setupAgent()

  // Test results tracker
  const results = {
    test1: { name: 'Valid Credential', status: 'UNKNOWN', details: '' },
    test2: { name: 'Tampered Credential', status: 'UNKNOWN', details: '' },
    test3: { name: 'Wrong Subject DID', status: 'UNKNOWN', details: '' },
    test4: { name: 'Different Issuer', status: 'UNKNOWN', details: '' },
    test5: { name: 'Expired Credential', status: 'UNKNOWN', details: '' }
  }

  // Setup: Create issuer and subject
  const issuer = await agent.didManagerCreate({ alias: 'TestIssuer' })
  const subject = await agent.didManagerCreate({ alias: 'TestSubject' })

  // Create a valid credential
  const validVC = await agent.createVerifiableCredential({
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiableCredential', 'UniversityDegreeCredential'],
      issuer: { id: issuer.did },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject.did,
        degree: {
          type: 'BachelorDegree',
          name: 'Bachelor of Computer Science'
        },
        authorization: 'Cross-Chain-Allowed'
      },
    },
    proofFormat: 'jwt',
    save: false,
  })

  // Test 1: Valid Credential (SUCCESS)
  console.log('\n--- Test 1: Valid Credential ---')
  const test1 = await agent.verifyCredential({ credential: validVC })
  
  if (test1.verified) {
    console.log('PASS: Valid credential verified successfully')
    results.test1.status = 'PASS'
    results.test1.details = 'Valid credential verified successfully'
  } else {
    console.log('FAIL: Valid credential was rejected')
    results.test1.status = 'FAIL'
    results.test1.details = 'Valid credential was rejected'
  }

  // Test 2: Tampered Credential (SHOULD FAIL)
  console.log('\n--- Test 2: Tampered Credential ---')
  const tamperedVC = JSON.parse(JSON.stringify(validVC))
  tamperedVC.proof.jwt = tamperedVC.proof.jwt.slice(0, -10) + 'TAMPERED123'
  
  const test2 = await agent.verifyCredential({ credential: tamperedVC })
  
  if (!test2.verified) {
    console.log('PASS: Tampered credential correctly rejected')
    console.log(`   Reason: ${test2.error.message}`)
    results.test2.status = 'PASS'
    results.test2.details = `Correctly rejected: ${test2.error.message}`
  } else {
    console.log('FAIL: Tampered credential was accepted (SECURITY ISSUE!)')
    results.test2.status = 'FAIL'
    results.test2.details = 'SECURITY ISSUE: Tampered credential was accepted'
  }

  // Test 3: Wrong Subject DID
  console.log('\n--- Test 3: Wrong Subject DID ---')
  const wrongSubjectVC = await agent.createVerifiableCredential({
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiableCredential', 'UniversityDegreeCredential'],
      issuer: { id: issuer.did },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: 'did:key:FAKE_INVALID_DID',
        degree: {
          type: 'BachelorDegree',
          name: 'Bachelor of Computer Science'
        },
        authorization: 'Cross-Chain-Allowed'
      },
    },
    proofFormat: 'jwt',
    save: false,
  })

  const test3 = await agent.verifyCredential({ credential: wrongSubjectVC })
  
  if (test3.verified) {
    console.log('PASS: Cryptographic signature is valid')
    console.log(`   WARNING: Subject DID is ${test3.verifiableCredential.credentialSubject.id}`)
    console.log('   Note: Application must validate subject matches expected user')
    results.test3.status = 'WARNING'
    results.test3.details = 'Signature valid but subject DID mismatch - App must validate'
  } else {
    console.log('INFO: Verification failed')
    results.test3.status = 'FAIL'
    results.test3.details = 'Verification failed'
  }

  // Test 4: Different Issuer
  console.log('\n--- Test 4: Different Issuer ---')
  const unauthorizedIssuer = await agent.didManagerCreate({ alias: 'UnauthorizedIssuer' })
  
  const wrongIssuerVC = await agent.createVerifiableCredential({
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiableCredential', 'UniversityDegreeCredential'],
      issuer: { id: unauthorizedIssuer.did },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subject.did,
        degree: {
          type: 'BachelorDegree',
          name: 'Bachelor of Computer Science'
        },
        authorization: 'Cross-Chain-Allowed'
      },
    },
    proofFormat: 'jwt',
    save: false,
  })

  const test4 = await agent.verifyCredential({ credential: wrongIssuerVC })
  
  if (test4.verified) {
    console.log('PASS: Cryptographic signature is valid')
    console.log(`   WARNING: Issued by ${test4.verifiableCredential.issuer.id}`)
    console.log('   Note: Application must check if issuer is in trusted list')
    results.test4.status = 'WARNING'
    results.test4.details = 'Signature valid but untrusted issuer - App must check trust list'
  } else {
    console.log('INFO: Verification failed')
    results.test4.status = 'FAIL'
    results.test4.details = 'Verification failed'
  }

  // Test 5: Expired Credential (Manual check)
  console.log('\n--- Test 5: Expired Credential ---')
  const expiredVC = await agent.createVerifiableCredential({
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiableCredential', 'UniversityDegreeCredential'],
      issuer: { id: issuer.did },
      issuanceDate: new Date('2020-01-01').toISOString(),
      expirationDate: new Date('2021-01-01').toISOString(), // Expired
      credentialSubject: {
        id: subject.did,
        degree: {
          type: 'BachelorDegree',
          name: 'Bachelor of Computer Science'
        },
        authorization: 'Cross-Chain-Allowed'
      },
    },
    proofFormat: 'jwt',
    save: false,
  })

  const test5 = await agent.verifyCredential({ credential: expiredVC })
  
  if (test5.verified) {
    const expirationDate = new Date(test5.verifiableCredential.expirationDate)
    const isExpired = expirationDate < new Date()
    
    if (isExpired) {
      console.log('PASS: Signature valid but credential is expired')
      console.log(`   WARNING: Expired on ${expirationDate.toISOString()}`)
      console.log('   Note: Application must check expiration date')
      results.test5.status = 'WARNING'
      results.test5.details = `Expired on ${expirationDate.toISOString()} - App must check expiration`
    } else {
      console.log('INFO: Credential is still valid')
      results.test5.status = 'PASS'
      results.test5.details = 'Credential is still valid'
    }
  } else {
    results.test5.status = 'FAIL'
    results.test5.details = 'Verification failed'
  }

  // Dynamic Summary Generation
  console.log('\n========================================')
  console.log('TEST SUMMARY')
  console.log('========================================')
  
  // Display all test results
  Object.entries(results).forEach(([key, result], index) => {
    console.log(`Test ${index + 1}: [${result.status}] ${result.name}`)
    console.log(`         Details: ${result.details}`)
  })
  
  // Calculate statistics
  const stats = {
    pass: 0,
    fail: 0,
    warning: 0,
    unknown: 0
  }
  
  Object.values(results).forEach(result => {
    if (result.status === 'PASS') stats.pass++
    else if (result.status === 'FAIL') stats.fail++
    else if (result.status === 'WARNING') stats.warning++
    else stats.unknown++
  })
  
  console.log('\n========================================')
  console.log('STATISTICS:')
  console.log(`Total Tests: ${Object.keys(results).length}`)
  console.log(`Passed: ${stats.pass}`)
  console.log(`Failed: ${stats.fail}`)
  console.log(`Warnings: ${stats.warning}`)
  console.log(`Unknown: ${stats.unknown}`)
  
  console.log('\nCONCLUSION:')
  if (stats.fail === 0 && stats.pass >= 2) {
    console.log('- Cryptographic verification: [OK] Working correctly')
  } else {
    console.log('- Cryptographic verification: [ERROR] Issues detected')
  }
  
  if (stats.warning > 0) {
    console.log('- Business logic validation: [PENDING] Must implement in your app')
  }
  
  console.log('========================================')
}

runTests().catch(console.error)
