#!/usr/bin/env node
// batch-issue.js - Issue multiple VCs with same fixed issuer
import { setupAgent } from './src/agent.js'
import { getFixedIssuer } from './src/fixedIssuer.js'
import { issueStudentCredential } from './src/issuer.js'
import { initializeStorage } from './src/storage.js'

// List of students to receive credentials
const students = [
  { 
    studentId: '2025001', 
    name: 'Alice Johnson', 
    title: 'Computer Engineering',
    description: 'Alice Johnson is a student of the Computer Engineering program'
  },
  { 
    studentId: '2025002', 
    name: 'Bob Smith', 
    title: 'Electrical Engineering',
    description: 'Bob Smith is a student of the Electrical Engineering program'
  },
  { 
    studentId: '2025003', 
    name: 'Carol White', 
    title: 'Software Engineering',
    description: 'Carol White is a student of the Software Engineering program'
  },
  { 
    studentId: '2025004', 
    name: 'David Brown', 
    title: 'Mechanical Engineering',
    description: 'David Brown is a student of the Mechanical Engineering program'
  },
  { 
    studentId: '2025005', 
    name: 'Emma Davis', 
    title: 'Civil Engineering',
    description: 'Emma Davis is a student of the Civil Engineering program'
  },
  { 
    studentId: '2025006', 
    name: 'Frank Miller', 
    title: 'Chemical Engineering',
    description: 'Frank Miller is a student of the Chemical Engineering program'
  },
  { 
    studentId: '2025007', 
    name: 'Grace Wilson', 
    title: 'Biomedical Engineering',
    description: 'Grace Wilson is a student of the Biomedical Engineering program'
  }
]

async function batchIssue() {
  console.log('=== University Batch VC Issuance ===\n')
  
  // Initialize system
  initializeStorage()
  const agent = setupAgent()
  
  // Get/create fixed issuer (same for all credentials in this session)
  const issuer = await getFixedIssuer(agent)
  
  console.log('\n=== Fixed University Issuer ===')
  console.log(`DID: ${issuer.did}`)
  console.log(`All ${students.length} credentials will be signed by this issuer\n`)
  
  console.log('=== Issuing Credentials ===\n')
  
  const results = []
  
  for (const student of students) {
    const studentData = {
      ...student,
      dateOfIssue: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
      directedBy: 'Example University',
      location: 'University Campus'
    }
    
    try {
      const result = await issueStudentCredential(agent, issuer, studentData)
      results.push({
        studentId: student.studentId,
        name: student.name,
        success: true,
        issuer: result.vc.issuer.id
      })
      console.log(`✓ ${student.studentId}: ${student.name} - ${student.title}`)
    } catch (error) {
      results.push({
        studentId: student.studentId,
        name: student.name,
        success: false,
        error: error.message
      })
      console.log(`✗ ${student.studentId}: ${student.name} - ERROR: ${error.message}`)
    }
  }
  
  // Summary
  console.log('\n=== Issuance Summary ===')
  console.log(`Total credentials issued: ${results.filter(r => r.success).length}/${students.length}`)
  console.log(`Failed: ${results.filter(r => !r.success).length}`)
  
  // Verify all have same issuer
  const issuers = [...new Set(results.filter(r => r.success).map(r => r.issuer))]
  console.log(`\nUnique issuer DIDs: ${issuers.length}`)
  if (issuers.length === 1) {
    console.log('✓ SUCCESS: All credentials signed by same issuer!')
    console.log(`  Issuer DID: ${issuers[0]}`)
  } else {
    console.log('⚠ WARNING: Multiple issuer DIDs found')
    issuers.forEach((did, i) => console.log(`  ${i + 1}. ${did}`))
  }
  
  console.log('\n=== Next Steps ===')
  console.log('View all credentials:')
  console.log('  node issue.js list')
  console.log('\nVerify a credential:')
  console.log('  node issue.js verify 2025001')
  console.log('\nView stored credential:')
  console.log('  cat .storage/credentials/2025001.json')
  console.log('\nExtract JWT token:')
  console.log('  cat .storage/credentials/2025001.json | grep \'"jwt"\' | cut -d\'"\' -f4')
  console.log()
}

// Run batch issuance
batchIssue().catch(error => {
  console.error('Error in batch issuance:', error.message)
  process.exit(1)
})
