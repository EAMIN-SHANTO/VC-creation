// src/fixedIssuer.js - Fixed University Issuer with deterministic keys
import crypto from 'crypto'
import { setupAgent } from './agent.js'
import { saveIssuerKey, loadIssuerKey } from './storage.js'

// Fixed seed for deterministic key generation (University's master key)
// In production, this would be stored in a secure HSM or key vault
const UNIVERSITY_SEED = 'university-master-seed-2026-thesis-research-fixed-issuer-key'

/**
 * Generate deterministic Ed25519 key from seed
 */
function seedToPrivateKey(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest()
  return hash.toString('hex')
}

/**
 * Getthe fixed university issuer
 * Always returns the same DID 
 */
export async function getFixedIssuer(agent) {
  const savedIssuer = loadIssuerKey()
  const privateKeyHex = seedToPrivateKey(UNIVERSITY_SEED)
  
  // Import the fixed key into the agent
  const key = await agent.keyManagerImport({
    kms: 'local',
    type: 'Ed25519',
    privateKeyHex: privateKeyHex
  }).catch(async (error) => {
    
    return null
  })
  
  if (savedIssuer) {
    console.log('✓ Using fixed university issuer')
    console.log(`  DID: ${savedIssuer.did}`)
    
    // import the DID with the key
    try {
      const issuer = await agent.didManagerImport({
        did: savedIssuer.did,
        alias: 'UniversityIssuer',
        provider: 'did:key',
        keys: key ? [key.kid] : [],
        controllerKeyId: key ? key.kid : undefined
      })
      return issuer
    } catch (e) {
      // DID might already be imported
      const existingDIDs = await agent.didManagerFind({ alias: 'UniversityIssuer' })
      if (existingDIDs.length > 0) {
        return existingDIDs[0]
      }
      // If still not found, we'll create a new one below
    }
  }
  
  // Create new issuer (first time setup)
  console.log('Initializing fixed university issuer...')
  
  const issuer = await agent.didManagerCreate({
    alias: 'UniversityIssuer',
    provider: 'did:key'
  })
  
  // Save issuer info
  saveIssuerKey({
    did: issuer.did,
    alias: 'UniversityIssuer',
    name: 'Example University',
    location: 'University Campus',
    website: 'https://university.edu',
    createdAt: new Date().toISOString(),
    note: 'Fixed issuer - DID will be reused for all credentials'
  })
  
  console.log('Fixed issuer initialized')
  console.log(`DID: ${issuer.did}`)
  console.log('This DID will be used for all future credentials')
  
  return issuer
}
