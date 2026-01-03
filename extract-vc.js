#!/usr/bin/env node
// extract-vc.js - Extract a student's VC in different formats
import fs from 'fs'

const studentId = process.argv[2]
const format = process.argv[3] || 'jwt' // jwt, full, or both

if (!studentId) {
  console.log('Usage: node extract-vc.js <studentId> [format]')
  console.log('')
  console.log('Formats:')
  console.log('  jwt   - Extract only JWT token (default)')
  console.log('  full  - Extract complete VC JSON')
  console.log('  both  - Extract both JWT and full VC')
  console.log('')
  console.log('Examples:')
  console.log('  node extract-vc.js 2025001')
  console.log('  node extract-vc.js 2025001 jwt')
  console.log('  node extract-vc.js 2025001 full')
  console.log('  node extract-vc.js 2025001 both')
  process.exit(1)
}

const credentialPath = `.storage/credentials/${studentId}.json`

if (!fs.existsSync(credentialPath)) {
  console.error(`✗ Credential not found for student: ${studentId}`)
  console.error(`  Looking for: ${credentialPath}`)
  process.exit(1)
}

const vcData = JSON.parse(fs.readFileSync(credentialPath, 'utf-8'))

console.log(`=== Student Credential: ${studentId} ===`)
console.log(`Name: ${vcData.credential.credentialSubject.name}`)
console.log(`Program: ${vcData.credential.credentialSubject.title}`)
console.log(`Status: ${vcData.status}`)
console.log()

if (format === 'jwt' || format === 'both') {
  console.log('=== JWT Token ===')
  console.log(vcData.jwt)
  console.log()
  
  // Save to file
  const jwtFile = `student_${studentId}_vc.jwt`
  fs.writeFileSync(jwtFile, vcData.jwt)
  console.log(`✓ JWT saved to: ${jwtFile}`)
  console.log()
}

if (format === 'full' || format === 'both') {
  console.log('=== Full Verifiable Credential ===')
  console.log(JSON.stringify(vcData.credential, null, 2))
  console.log()
  
  // Save to file
  const vcFile = `student_${studentId}_vc.json`
  fs.writeFileSync(vcFile, JSON.stringify(vcData.credential, null, 2))
  console.log(`✓ Full VC saved to: ${vcFile}`)
  console.log()
}

console.log('=== Usage Instructions ===')
console.log(`Student ${studentId} can now:`)
console.log('1. Store the JWT in their wallet/app')
console.log('2. Present it to blockchain services for authentication')
console.log('3. Verify it anytime with:')
console.log(`   node issue.js verify ${studentId}`)
