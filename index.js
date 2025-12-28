// index.js
import { setupAgent } from './src/agent.js'
import { 
  createCredentialPayload, 
  exportCredentialJWT, 
  importCredentialFromJWT 
} from './src/helpers.js'

async function main() {
  // 1. Start the Agent
  const agent = setupAgent()
  console.log('Agent initialized successfully.')

  // 2. Create an Identifier (DID) for the Issuer
  // This represents the University or Authority issuing the credential
  console.log('\n--- 1. Creating Issuer Identity ---')
  const issuer = await agent.didManagerCreate({
    alias: 'MyThesisIssuer',
  })
  console.log(`Issuer DID: ${issuer.did}`)

  // 3. Create a Subject DID (The User/Student)
  // Creating a real DID for proper verification
  console.log('\n--- 2. Creating Subject Identity ---')
  const subject = await agent.didManagerCreate({
    alias: 'ThesisSubject',
  })
  console.log(`Subject DID: ${subject.did}`)

  // 4. Create the Verifiable Credential (VC)
  console.log('\n--- 3. Issuing Credential ---')
  const credentialData = {
    degree: {
      type: 'BachelorDegree',
      name: 'Bachelor of Computer Science'
    },
    authorization: 'Cross-Chain-Allowed' // Custom field for your thesis
  }
  
  const credential = createCredentialPayload(issuer, subject, credentialData)
  
  const vc = await agent.createVerifiableCredential({
    credential,
    proofFormat: 'jwt',
    save: false,
  })

  console.log('Credential Created (JWT Format):')
  console.log(vc.proof.jwt.substring(0, 50) + '...')
  
  // Priority 1: Export JWT for cross-chain sharing
  const jwtToken = exportCredentialJWT(vc)
  console.log('\nExported JWT Token (for cross-chain transfer):')
  console.log('Length:', jwtToken.length, 'characters') 

  // 5. Verify the Credential
  console.log('\n--- 4. Verifying Credential ---')
  const verification = await agent.verifyCredential({
    credential: vc,
  })

  // 6. Check Results
  if (verification.verified) {
    console.log('SUCCESS: Credential is Valid!')
    console.log(`Issued by: ${verification.verifiableCredential.issuer.id}`)
    console.log(`Subject: ${verification.verifiableCredential.credentialSubject.id}`)
  } else {
    console.log('FAILURE: Credential is Invalid.')
    console.log(verification.error)
  }

  // 7. Test JWT Import and Re-verification
  console.log('\n--- 5. Testing JWT Import ---')
  const importedCredential = importCredentialFromJWT(jwtToken)
  const reVerification = await agent.verifyCredential({
    credential: importedCredential,
  })
  
  if (reVerification.verified) {
    console.log('SUCCESS: Imported JWT credential verified!')
    console.log('This JWT can be shared across blockchains')
  } else {
    console.log('FAILURE: Imported credential failed verification')
  }

  console.log('\n========================================')
  console.log('VC Creation and Verification Complete!')
  console.log('Run "node test.js" to test failure scenarios')
  console.log('========================================')
}

// Run the main function
main().catch(console.error)