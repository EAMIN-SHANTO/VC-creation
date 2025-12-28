#!/usr/bin/env node
// cli.js - Command-line tool for VC operations
import { setupAgent } from './src/agent.js'
import { createCredentialPayload, exportCredentialJWT, importCredentialFromJWT } from './src/helpers.js'

const command = process.argv[2]
const jwtInput = process.argv[3]

async function generateVC() {
  console.log('=== Generating Verifiable Credential ===\n')
  
  const agent = setupAgent()
  
  // Create issuer and subject
  const issuer = await agent.didManagerCreate({ alias: 'CLIIssuer' })
  const subject = await agent.didManagerCreate({ alias: 'CLISubject' })
  
  console.log(`Issuer DID: ${issuer.did}`)
  console.log(`Subject DID: ${subject.did}\n`)
  
  // Create credential
  const credentialData = {
    degree: {
      type: 'BachelorDegree',
      name: 'Bachelor of Computer Science'
    },
    authorization: 'Cross-Chain-Allowed',
    timestamp: new Date().toISOString()
  }
  
  const credential = createCredentialPayload(issuer, subject, credentialData)
  const vc = await agent.createVerifiableCredential({
    credential,
    proofFormat: 'jwt',
    save: false,
  })
  
  const jwt = exportCredentialJWT(vc)
  
  console.log('=== VC Generated Successfully ===')
  console.log('\nJWT Token (copy this for verification):')
  console.log('----------------------------------------')
  console.log(jwt)
  console.log('----------------------------------------')
  console.log(`\nToken Length: ${jwt.length} characters`)
  console.log('\nTo verify this credential, run:')
  console.log(`node cli.js verify "${jwt}"`)
}

async function verifyVC(jwt) {
  if (!jwt) {
    console.error('Error: Please provide a JWT token to verify')
    console.log('Usage: node cli.js verify "YOUR_JWT_TOKEN_HERE"')
    process.exit(1)
  }
  
  console.log('=== Verifying Verifiable Credential ===\n')
  console.log(`JWT Length: ${jwt.length} characters\n`)
  
  const agent = setupAgent()
  
  try {
    const credential = importCredentialFromJWT(jwt)
    const verification = await agent.verifyCredential({ credential })
    
    if (verification.verified) {
      console.log('✓ VERIFICATION SUCCESSFUL\n')
      console.log('Credential Details:')
      console.log('-------------------')
      
      const vc = verification.verifiableCredential
      console.log(`Issuer: ${vc.issuer.id}`)
      console.log(`Subject: ${vc.credentialSubject.id}`)
      console.log(`Issued: ${vc.issuanceDate}`)
      
      if (vc.expirationDate) {
        const expired = new Date(vc.expirationDate) < new Date()
        console.log(`Expiration: ${vc.expirationDate} ${expired ? '[EXPIRED]' : '[VALID]'}`)
      }
      
      console.log('\nCredential Subject Data:')
      console.log(JSON.stringify(vc.credentialSubject, null, 2))
      
      console.log('\n✓ Credential is cryptographically valid')
    } else {
      console.log('✗ VERIFICATION FAILED\n')
      console.log('Error:', verification.error?.message || 'Unknown error')
    }
  } catch (error) {
    console.log('✗ VERIFICATION ERROR\n')
    console.log('Error:', error.message)
    console.log('\nPlease ensure the JWT token is valid and properly formatted')
  }
}

function showHelp() {
  console.log('VC Command-Line Interface')
  console.log('=========================\n')
  console.log('Commands:')
  console.log('  generate    Generate a new verifiable credential')
  console.log('  verify      Verify an existing credential from JWT\n')
  console.log('Usage:')
  console.log('  node cli.js generate')
  console.log('  node cli.js verify "JWT_TOKEN_HERE"\n')
  console.log('Examples:')
  console.log('  # Generate a new VC')
  console.log('  node cli.js generate\n')
  console.log('  # Verify a VC')
  console.log('  node cli.js verify "eyJhbGciOiJFZERTQSIsInR5c..."\n')
}

// Main execution
if (!command) {
  showHelp()
  process.exit(0)
}

switch (command.toLowerCase()) {
  case 'generate':
  case 'gen':
  case 'create':
    generateVC().catch(error => {
      console.error('Error generating credential:', error.message)
      process.exit(1)
    })
    break
    
  case 'verify':
  case 'check':
    verifyVC(jwtInput).catch(error => {
      console.error('Error verifying credential:', error.message)
      process.exit(1)
    })
    break
    
  case 'help':
  case '--help':
  case '-h':
    showHelp()
    break
    
  default:
    console.error(`Unknown command: ${command}`)
    console.log('Run "node cli.js help" for usage information')
    process.exit(1)
}
