// src/helpers.js - Helper functions for VC operations

/**
 * Creates a standardized credential structure
 */
export function createCredentialPayload(issuer, subject, credentialData) {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    type: ['VerifiableCredential', 'UniversityDegreeCredential'],
    issuer: { id: issuer.did },
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subject.did,
      ...credentialData
    }
  }
}

/**
 * Creates a credential with expiration date
 */
export function createCredentialWithExpiration(issuer, subject, credentialData, expirationDate) {
  const payload = createCredentialPayload(issuer, subject, credentialData)
  payload.expirationDate = expirationDate
  return payload
}

/**
 * Validates if an issuer is in the trusted list
 */
export function validateIssuer(verificationResult, trustedIssuers) {
  if (!verificationResult.verified) {
    return { valid: false, reason: 'Credential verification failed' }
  }
  
  const issuerDid = verificationResult.verifiableCredential.issuer.id
  const isTrusted = trustedIssuers.includes(issuerDid)
  
  return {
    valid: isTrusted,
    issuer: issuerDid,
    reason: isTrusted ? 'Issuer is trusted' : 'Issuer not in trusted list'
  }
}

/**
 * Validates if credential subject matches expected DID
 */
export function validateSubject(verificationResult, expectedSubjectDid) {
  if (!verificationResult.verified) {
    return { valid: false, reason: 'Credential verification failed' }
  }
  
  const actualSubject = verificationResult.verifiableCredential.credentialSubject.id
  const matches = actualSubject === expectedSubjectDid
  
  return {
    valid: matches,
    expectedSubject: expectedSubjectDid,
    actualSubject: actualSubject,
    reason: matches ? 'Subject matches' : 'Subject DID mismatch'
  }
}

/**
 * Checks if credential is expired
 */
export function isCredentialExpired(verificationResult) {
  if (!verificationResult.verified) {
    return { expired: null, reason: 'Credential verification failed' }
  }
  
  const expirationDate = verificationResult.verifiableCredential.expirationDate
  
  if (!expirationDate) {
    return { expired: false, reason: 'No expiration date set' }
  }
  
  const expDate = new Date(expirationDate)
  const now = new Date()
  const expired = expDate < now
  
  return {
    expired,
    expirationDate: expDate.toISOString(),
    reason: expired ? `Expired on ${expDate.toISOString()}` : 'Still valid'
  }
}

/**
 * Exports credential as JWT string for cross-chain sharing
 */
export function exportCredentialJWT(vc) {
  return vc.proof.jwt
}

/**
 * Creates credential object from JWT string for verification
 */
export function importCredentialFromJWT(jwtString) {
  return {
    proof: {
      jwt: jwtString
    }
  }
}

/**
 * Comprehensive credential validation
 */
export async function validateCredential(agent, vc, options = {}) {
  const {
    trustedIssuers = [],
    expectedSubject = null,
    checkExpiration = true
  } = options
  
  // Verify signature
  const verification = await agent.verifyCredential({ credential: vc })
  
  const results = {
    signatureValid: verification.verified,
    issuerTrusted: null,
    subjectValid: null,
    expired: null,
    errors: []
  }
  
  if (!verification.verified) {
    results.errors.push('Signature verification failed')
    return results
  }
  
  // Check issuer trust
  if (trustedIssuers.length > 0) {
    const issuerCheck = validateIssuer(verification, trustedIssuers)
    results.issuerTrusted = issuerCheck.valid
    if (!issuerCheck.valid) {
      results.errors.push(issuerCheck.reason)
    }
  }
  
  // Check subject
  if (expectedSubject) {
    const subjectCheck = validateSubject(verification, expectedSubject)
    results.subjectValid = subjectCheck.valid
    if (!subjectCheck.valid) {
      results.errors.push(subjectCheck.reason)
    }
  }
  
  // Check expiration
  if (checkExpiration) {
    const expirationCheck = isCredentialExpired(verification)
    results.expired = expirationCheck.expired
    if (expirationCheck.expired) {
      results.errors.push(expirationCheck.reason)
    }
  }
  
  return results
}
