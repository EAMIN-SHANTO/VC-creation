// src/issuer.js - University VC Issuance Service
import { setupAgent } from './agent.js'
import { saveIssuerKey, loadIssuerKey, saveVC, loadVC } from './storage.js'

// Fixed issuer configuration (University)
const ISSUER_CONFIG = {
  alias: 'UniversityIssuer',
  name: 'Example University',
  location: 'University Location',
  website: 'https://university.edu'
}

/**
 * Initialize or load the fixed issuer identity
 * Uses deterministic key generation from stored seed
 */
export async function getOrCreateIssuer(agent) {
  const savedIssuer = loadIssuerKey()
  
  if (savedIssuer) {
    console.log('Using existing issuer identity')
    console.log(`DID: ${savedIssuer.did}`)
    
    // Import key from saved seed to recreate same DID
    try {
      const key = await agent.keyManagerImport({
        kms: 'local',
        type: 'Ed25519',
        privateKeyHex: savedIssuer.privateKeyHex
      })
      
      const issuer = await agent.didManagerImport({
        did: savedIssuer.did,
        alias: ISSUER_CONFIG.alias,
        provider: 'did:key',
        keys: [key.kid],
        controllerKeyId: key.kid
      })
      
      return issuer
    } catch (error) {
      // If import fails, fallback to getting existing
      try {
        const existingDIDs = await agent.didManagerFind({ alias: ISSUER_CONFIG.alias })
        if (existingDIDs.length > 0 && existingDIDs[0].did === savedIssuer.did) {
          return existingDIDs[0]
        }
      } catch (e) {
        // Continue to recreation
      }
    }
  }
  
  // Create new issuer with key export
  console.log('Creating new issuer identity...')
  const issuer = await agent.didManagerCreate({
    alias: ISSUER_CONFIG.alias,
  })
  
  // Export the private key for persistence
  const keys = await agent.didManagerGet({ did: issuer.did })
  const keyId = keys.keys[0].kid
  const exportedKey = await agent.keyManagerGet({ kid: keyId })
  
  // Save issuer data with private key
  saveIssuerKey({
    did: issuer.did,
    alias: ISSUER_CONFIG.alias,
    name: ISSUER_CONFIG.name,
    location: ISSUER_CONFIG.location,
    website: ISSUER_CONFIG.website,
    privateKeyHex: exportedKey.privateKeyHex,
    publicKeyHex: exportedKey.publicKeyHex,
    createdAt: new Date().toISOString()
  })
  
  console.log('✓ Created and saved new issuer identity')
  console.log(`  DID: ${issuer.did}`)
  console.log('  Keys saved for future use')
  
  return issuer
}

/**
 * Issue a Verifiable Credential for a student
 */
export async function issueStudentCredential(agent, issuer, studentData) {
  const {
    studentId,
    name,
    title,
    description,
    dateOfIssue,
    expiryDate,
    directedBy,
    location
  } = studentData
  
  // Create credential subject
  const credentialSubject = {
    id: `urn:university:student:${studentId}`,
    name,
    title,
    description,
    dateOfIssue,
    expiryDate,
    directedBy: directedBy || ISSUER_CONFIG.name,
    location: location || ISSUER_CONFIG.location
  }
  
  // Build W3C compliant credential
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    type: ['VerifiableCredential', 'UniversityCardCredential'],
    id: `urn:credential:${studentId}-${Date.now()}`,
    issuer: {
      id: issuer.did,
      name: ISSUER_CONFIG.name
    },
    issuanceDate: new Date().toISOString(),
    expirationDate: expiryDate,
    credentialSubject,
    credentialStatus: {
      id: `https://university.edu/credentials/status/${studentId}`,
      type: 'StudentCredentialStatusList2025'
    }
  }
  
  // Sign credential with issuer's private key
  const vc = await agent.createVerifiableCredential({
    credential,
    proofFormat: 'jwt',
    save: false
  })
  
  // Save to file system
  const filepath = saveVC(studentId, vc)
  
  console.log(`✓ Issued credential for student: ${name}`)
  console.log(`  Student ID: ${studentId}`)
  console.log(`  Credential saved to: ${filepath}`)
  
  return {
    vc,
    jwt: vc.proof.jwt,
    filepath,
    studentId
  }
}

/**
 * Verify a student's credential
 */
export async function verifyStudentCredential(agent, studentId, jwtToken = null) {
  let jwt = jwtToken
  
  // If no JWT provided, load from storage
  if (!jwt) {
    const vcData = loadVC(studentId)
    if (!vcData) {
      return {
        verified: false,
        error: 'Credential not found for student ID: ' + studentId
      }
    }
    jwt = vcData.jwt
  }
  
  // Verify signature (skip credential status check)
  const credential = { proof: { jwt } }
  const verification = await agent.verifyCredential({ 
    credential,
    policies: {
      credentialStatus: false // Skip status verification
    }
  })
  
  if (!verification.verified) {
    return {
      verified: false,
      error: verification.error?.message || 'Verification failed'
    }
  }
  
  const vc = verification.verifiableCredential
  
  // Check expiration
  let expired = false
  if (vc.expirationDate) {
    expired = new Date(vc.expirationDate) < new Date()
  }
  
  // Check status (in real system, check revocation registry)
  const vcData = loadVC(studentId)
  const statusActive = vcData ? vcData.status === 'active' : true
  
  return {
    verified: true,
    expired,
    statusActive,
    credentialSubject: vc.credentialSubject,
    issuer: vc.issuer,
    issuanceDate: vc.issuanceDate,
    expirationDate: vc.expirationDate
  }
}

/**
 * Revoke a student's credential
 */
export function revokeStudentCredential(studentId) {
  const { updateVCStatus } = require('./storage.js')
  const result = updateVCStatus(studentId, 'revoked')
  
  if (result) {
    console.log(`Revoked credential for student: ${studentId}`)
  } else {
    console.log(`Credential not found for student: ${studentId}!!!`)
  }
  
  return result
}
