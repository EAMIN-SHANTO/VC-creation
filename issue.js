#!/usr/bin/env node
// issue.js - University VC Issuance CLI
import { setupAgent } from './src/agent.js'
import { getFixedIssuer } from './src/fixedIssuer.js'
import { issueStudentCredential, verifyStudentCredential } from './src/issuer.js'
import { initializeStorage, listAllVCs, updateVCStatus } from './src/storage.js'

const command = process.argv[2]

async function issueVC() {
  const args = process.argv.slice(3)
  
  if (args.length < 2) {
    console.log('Usage: node issue.js issue <studentId> <name> [title] [description]')
    console.log('Example: node issue.js issue 2023001 "John Doe" "Computer Science" "Student of Computer Science"')
    process.exit(1)
  }
  
  const [studentId, name, title = 'Computer Science', description = 'University Student'] = args
  
  console.log('=== University VC Issuance Service ===\n')
  
  // Initialize
  initializeStorage()
  const agent = setupAgent()
  const issuer = await getFixedIssuer(agent)
  
  // Student data
  const studentData = {
    studentId,
    name,
    title,
    description: `${name} is a student of the ${title} program`,
    dateOfIssue: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    directedBy: 'Example University',
    location: 'University Campus'
  }
  
  // Issue credential
  const result = await issueStudentCredential(agent, issuer, studentData)
  
  console.log('\n=== Credential Details ===')
  console.log('Issuer:', result.vc.issuer.id)
  console.log('Student:', result.vc.credentialSubject.name)
  console.log('Program:', result.vc.credentialSubject.title)
  console.log('Valid Until:', result.vc.expirationDate)
  console.log('\n=== JWT Token ===')
  console.log(result.jwt)
  console.log('\n✓ Credential saved. Student can use this for authentication.')
}

async function verifyVC() {
  const studentId = process.argv[3]
  
  if (!studentId) {
    console.log('Usage: node issue.js verify <studentId>')
    console.log('Example: node issue.js verify 2023001')
    process.exit(1)
  }
  
  console.log('=== Verifying Student Credential ===\n')
  
  const agent = setupAgent()
  const issuer = await getFixedIssuer(agent)
  
  const result = await verifyStudentCredential(agent, studentId)
  
  if (!result.verified) {
    console.log('✗ VERIFICATION FAILED')
    console.log('Error:', result.error)
    return
  }
  
  console.log('✓ CREDENTIAL VERIFIED')
  console.log('\nStudent Information:')
  console.log('  Name:', result.credentialSubject.name)
  console.log('  Program:', result.credentialSubject.title)
  console.log('  Student ID:', result.credentialSubject.id)
  console.log('\nCredential Status:')
  console.log('  Issued:', result.issuanceDate)
  console.log('  Expires:', result.expirationDate)
  console.log('  Expired:', result.expired ? '✗ YES' : '✓ NO')
  console.log('  Status:', result.statusActive ? '✓ ACTIVE' : '✗ REVOKED')
  console.log('\nIssued By:', result.issuer.id)
  
  if (result.expired || !result.statusActive) {
    console.log('\n⚠ WARNING: Credential is not valid for use')
  } else {
    console.log('\n✓ Credential is valid and can be used for authentication')
  }
}

async function listVCs() {
  console.log('=== All Issued Credentials ===\n')
  
  initializeStorage()
  const credentials = listAllVCs()
  
  if (credentials.length === 0) {
    console.log('No credentials issued yet.')
    return
  }
  
  console.log(`Total credentials: ${credentials.length}\n`)
  
  credentials.forEach((vcData, index) => {
    const vc = vcData.credential
    console.log(`${index + 1}. Student ID: ${vcData.studentId}`)
    console.log(`   Name: ${vc.credentialSubject.name}`)
    console.log(`   Program: ${vc.credentialSubject.title}`)
    console.log(`   Status: ${vcData.status}`)
    console.log(`   Issued: ${vcData.issuedAt}`)
    console.log()
  })
}

async function revokeVC() {
  const studentId = process.argv[3]
  
  if (!studentId) {
    console.log('Usage: node issue.js revoke <studentId>')
    process.exit(1)
  }
  
  console.log('=== Revoking Student Credential ===\n')
  
  initializeStorage()
  const result = updateVCStatus(studentId, 'revoked')
  
  if (result) {
    console.log(`✓ Credential revoked for student: ${studentId}`)
    console.log('This credential will no longer be accepted for authentication.')
  } else {
    console.log(`✗ Credential not found for student: ${studentId}`)
  }
}

function showHelp() {
  console.log('University VC Issuance Service')
  console.log('==============================\n')
  console.log('Commands:')
  console.log('  issue <id> <name> [program] [desc]  Issue new credential')
  console.log('  verify <id>                          Verify credential')
  console.log('  list                                 List all credentials')
  console.log('  revoke <id>                          Revoke credential\n')
  console.log('Examples:')
  console.log('  node issue.js issue 2023001 "John Doe" "Computer Science"')
  console.log('  node issue.js verify 2023001')
  console.log('  node issue.js list')
  console.log('  node issue.js revoke 2023001\n')
}

// Main execution
if (!command) {
  showHelp()
  process.exit(0)
}

switch (command.toLowerCase()) {
  case 'issue':
  case 'create':
    issueVC().catch(error => {
      console.error('Error issuing credential:', error.message)
      process.exit(1)
    })
    break
    
  case 'verify':
  case 'check':
    verifyVC().catch(error => {
      console.error('Error verifying credential:', error.message)
      process.exit(1)
    })
    break
    
  case 'list':
  case 'ls':
    listVCs().catch(error => {
      console.error('Error listing credentials:', error.message)
      process.exit(1)
    })
    break
    
  case 'revoke':
  case 'suspend':
    revokeVC().catch(error => {
      console.error('Error revoking credential:', error.message)
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
    console.log('Run "node issue.js help" for usage information')
    process.exit(1)
}
