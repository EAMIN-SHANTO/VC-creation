// index.js
import { setupAgent } from './src/agent.js'

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
  const vc = await agent.createVerifiableCredential({
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
        authorization: 'Cross-Chain-Allowed' // Custom field for your thesis
      },
    },
    proofFormat: 'jwt',
    save: false,
  })

  console.log('Credential Created (JWT Format):')
  // We print a shortened version to keep the console clean
  console.log(vc.proof.jwt.substring(0, 50) + '...') 

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

  console.log('\n========================================')
  console.log('VC Creation and Verification Complete!')
  console.log('Run "node test.js" to test failure scenarios')
  console.log('========================================')
}

// Run the main function
main().catch(console.error)