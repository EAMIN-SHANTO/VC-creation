# Verifiable Credential Creation and Verification System

**W3C Standard-Compliant Off-Chain VC Implementation for Cross-Chain Authentication**

---

## Overview

This system implements W3C Verifiable Credentials (VC) using cryptographic proofs to enable secure, tamper-proof credential issuance and verification. Credentials are signed using EdDSA (Ed25519) and can be verified independently without requiring access to the original issuer.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VC Lifecycle                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. KEY GENERATION                                           │
│     ┌─────────────────┐                                     │
│     │  Generate Keys  │ → Ed25519 Keypair (32-byte keys)   │
│     │  Create DID     │ → did:key:z6Mk...                  │
│     └─────────────────┘                                     │
│            ↓                                                 │
│  2. CREDENTIAL ISSUANCE                                     │
│     ┌─────────────────┐                                     │
│     │  Build VC       │ → @context, type, issuer, subject  │
│     │  Sign with      │ → EdDSA signature (64 bytes)       │
│     │  Private Key    │                                     │
│     │  Export JWT     │ → Base64URL encoded token          │
│     └─────────────────┘                                     │
│            ↓                                                 │
│  3. CREDENTIAL TRANSFER                                     │
│     ┌─────────────────┐                                     │
│     │  JWT String     │ → Can be stored/transmitted        │
│     │  (780 chars)    │ → Works across blockchains         │
│     └─────────────────┘                                     │
│            ↓                                                 │
│  4. CREDENTIAL VERIFICATION                                 │
│     ┌─────────────────┐                                     │
│     │  Import JWT     │ → Parse header.payload.signature   │
│     │  Resolve DID    │ → Extract public key from DID      │
│     │  Verify Sig     │ → Ed25519 verification             │
│     │  Check Claims   │ → Validate issuer, subject, expiry │
│     └─────────────────┘                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## How VC Creation Works

### Step 1: Identity Creation (DID Generation)

```javascript
// Generate issuer and subject identities
const issuer = await agent.didManagerCreate({ alias: 'Issuer' })
const subject = await agent.didManagerCreate({ alias: 'Subject' })
```

**Process:**
1. Generate Ed25519 keypair (private key: 32 bytes, public key: 32 bytes)
2. Encode public key using multibase encoding
3. Create DID: `did:key:z[encoded_public_key]`
4. Store private key securely (in-memory for testing, should be persistent in production)

**Example DID:**
```
did:key:z6MkqhsS52wX2JcQaXKcGhkgseuvhHRKKc6z8DarNo8aXxY9
         ↑
         multibase prefix (z = base58btc)
```

### Step 2: Credential Structure

```javascript
const credential = {
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
  }
}
```

**W3C Required Fields:**
- `@context`: Defines vocabulary and semantics
- `type`: Credential type(s)
- `issuer`: DID of credential issuer
- `issuanceDate`: ISO 8601 timestamp
- `credentialSubject`: Claims about the subject

### Step 3: Cryptographic Signing

```javascript
const vc = await agent.createVerifiableCredential({
  credential,
  proofFormat: 'jwt',
  save: false
})
```

**Signing Process:**

1. **Serialize Credential to JWT**
   ```
   Header:  { "alg": "EdDSA", "typ": "JWT" }
   Payload: { "vc": {...credential...}, "iss": "did:key:...", "sub": "did:key:..." }
   ```

2. **Create Signing Input**
   ```
   signingInput = base64url(header) + "." + base64url(payload)
   ```

3. **Generate Signature Using Ed25519**
   ```
   signature = Ed25519.sign(signingInput, privateKey)
   ```
   
   **Ed25519 Algorithm:**
   - Hash message with SHA-512
   - Generate deterministic nonce: `r = SHA512(hash(private_key) || message) mod L`
   - Compute R point: `R = r × BasePoint`
   - Compute challenge: `h = SHA512(R || public_key || message) mod L`
   - Compute S: `S = (r + h × private_key) mod L`
   - Signature = R || S (64 bytes)

4. **Create JWT**
   ```
   JWT = signingInput + "." + base64url(signature)
   ```

**Example JWT Structure:**
```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6...
└─────────── header ──────────┘ └────────── payload ──────────

...YKbvQ62XpskGtesb1ayfFA0azp2RQ_BUOAu20i9xNAz7zCpfpCcBB4b9AMIv93UUlxrBYewvGM6ck1WvG0_BAw
   └─────────────────────────── signature (64 bytes) ──────────────────────────┘
```

### Step 4: JWT Export for Cross-Chain Use

```javascript
const jwtToken = exportCredentialJWT(vc)
// Returns: "eyJhbGci...signature" (780 characters)
```

This JWT can be:
- Stored in databases
- Transmitted via APIs
- Stored on blockchains (as transaction data or smart contract storage)
- Shared across different blockchain networks

---

## How VC Verification Works

### Step 1: JWT Import

```javascript
const credential = importCredentialFromJWT(jwtToken)
// Creates: { proof: { jwt: "eyJhbGci..." } }
```

### Step 2: Parse JWT Components

```javascript
const [headerB64, payloadB64, signatureB64] = jwtToken.split('.')

// Decode header
const header = JSON.parse(base64decode(headerB64))
// { "alg": "EdDSA", "typ": "JWT" }

// Decode payload
const payload = JSON.parse(base64decode(payloadB64))
// { "vc": {...}, "iss": "did:key:...", "sub": "did:key:..." }

// Decode signature
const signature = base64urldecode(signatureB64)
// 64 bytes of cryptographic signature
```

### Step 3: DID Resolution

```javascript
const issuerDID = payload.iss
// Extract public key from DID
const publicKey = resolveDIDToPublicKey(issuerDID)
```

**For `did:key` method:**
- DID contains the public key directly
- Format: `did:key:z[multibase_encoded_public_key]`
- Decode multibase to get 32-byte Ed25519 public key

### Step 4: Signature Verification

```javascript
const verificationResult = await agent.verifyCredential({ credential })
```

**Verification Process:**

1. **Reconstruct Signing Input**
   ```
   signingInput = headerB64 + "." + payloadB64
   ```

2. **Extract Signature Components**
   ```
   R = first 32 bytes of signature
   S = last 32 bytes of signature
   ```

3. **Verify Using Ed25519**
   ```
   valid = Ed25519.verify(signingInput, signature, publicKey)
   ```
   
   **Verification Algorithm:**
   - Compute challenge: `h = SHA512(R || public_key || message) mod L`
   - Check equation: `S × BasePoint = R + h × PublicKey`
   - If equation holds: signature is valid
   - If equation fails: signature is invalid (tampered)

4. **Return Result**
   ```javascript
   {
     verified: true/false,
     verifiableCredential: {...}, // Decoded credential
     error: {...} // If verification failed
   }
   ```

### Step 5: Additional Validation

After cryptographic verification, application-level checks:

```javascript
// Check issuer trust
const trustedIssuers = ['did:key:z6Mkq...']
const issuerTrusted = trustedIssuers.includes(vc.issuer.id)

// Check subject matches expected user
const subjectMatches = (vc.credentialSubject.id === expectedUserDID)

// Check expiration
if (vc.expirationDate) {
  const expired = new Date(vc.expirationDate) < new Date()
}
```

---

## Cryptographic Proof Explanation

### What is the Cryptographic Proof?

The cryptographic proof is a **digital signature** created using the **EdDSA (Edwards-curve Digital Signature Algorithm)** with the **Ed25519** elliptic curve.

### Mathematical Foundation

**Elliptic Curve Equation:**
```
-x² + y² = 1 + d·x²·y²
where d = -121665/121666
```

**Security Basis:**
- **Discrete Logarithm Problem:** Given P = k × G, finding k is computationally infeasible
- **Security Level:** ~128-bit (requires 2^128 operations to break)
- **Quantum Resistance:** Vulnerable to Shor's algorithm (post-quantum alternatives needed for long-term)

### How the Proof Guarantees Security

#### 1. Authenticity
Only the holder of the private key can create a valid signature.

**Why?**
- Signature = f(message, private_key)
- Private key never leaves issuer's system
- Without private key, cannot create valid signature

#### 2. Integrity
Any modification to the credential breaks the signature.

**Why?**
- Signature is computed over entire message (header + payload)
- Even 1-bit change in message → completely different hash
- Old signature won't verify with modified message

**Example:**
```
Original:  "Bachelor of Computer Science" → Signature_A
Tampered:  "Master of Computer Science"   → Signature_A (invalid!)
```

#### 3. Non-Repudiation
Issuer cannot deny having issued the credential.

**Why?**
- Only issuer's private key could have created this signature
- Public key in DID proves identity
- Signature mathematically links issuer to credential

#### 4. Unforgeability
Cannot create valid signature without private key.

**Why?**
- Ed25519 security: Finding private key from public key requires ~2^128 operations
- Current fastest computers: ~10^18 operations/second
- Time to break: ~10^19 years (age of universe: ~10^10 years)

### Proof Verification Steps

```
┌──────────────────────────────────────────────────────────┐
│              Verification Process                         │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  1. Input:                                                │
│     - Message (header.payload)                           │
│     - Signature (64 bytes)                               │
│     - Public Key (from DID)                              │
│                                                            │
│  2. Parse Signature:                                      │
│     R = signature[0:32]   // First 32 bytes              │
│     S = signature[32:64]  // Last 32 bytes               │
│                                                            │
│  3. Compute Challenge:                                    │
│     h = SHA512(R || PublicKey || Message) mod L          │
│                                                            │
│  4. Verify Equation:                                      │
│     [S]B ?= R + [h]A                                     │
│     where:                                                │
│       [S]B = scalar multiplication of base point         │
│       [h]A = scalar multiplication of public key         │
│       R = point on curve                                 │
│                                                            │
│  5. Result:                                               │
│     ✓ Equation holds → VALID                             │
│     ✗ Equation fails → INVALID (tampered/forged)         │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Why This Is Secure for Cross-Chain Authentication

1. **Self-Contained:** JWT contains all information needed for verification
2. **No Online Issuer Needed:** Can verify offline using public key from DID
3. **Blockchain Agnostic:** Same JWT works on Ethereum, Polygon, Solana, etc.
4. **Tamper-Evident:** Any modification is immediately detectable
5. **Standards-Based:** W3C VC standard ensures interoperability

---

## Testing Commands

### Installation

```bash
# Install dependencies
npm install

# Verify installation
npm test
```

### Basic Operations

#### 1. Generate a Verifiable Credential

```bash
# Using CLI
node cli.js generate

# Using npm script
npm run generate

# Using main script
npm start
```

**Expected Output:**
```
=== Generating Verifiable Credential ===

Issuer DID: did:key:z6Mkq4mv25bjUZHd...
Subject DID: did:key:z6MktasMYX58NeQEvSqXD...

=== VC Generated Successfully ===

JWT Token (copy this for verification):
----------------------------------------
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
----------------------------------------

Token Length: 780 characters
```

#### 2. Verify a Credential

```bash
# Verify using CLI
node cli.js verify "JWT_TOKEN_HERE"

# Or using npm
npm run verify "JWT_TOKEN_HERE"
```

**Expected Output (Valid):**
```
=== Verifying Verifiable Credential ===

✓ VERIFICATION SUCCESSFUL

Credential Details:
-------------------
Issuer: did:key:z6Mkq4mv...
Subject: did:key:z6MktasM...
Issued: 2025-12-28T20:16:29.000Z

✓ Credential is cryptographically valid
```

**Expected Output (Invalid):**
```
=== Verifying Verifiable Credential ===

✗ VERIFICATION FAILED

Error: invalid_signature: no matching public key found
```

#### 3. Run Comprehensive Test Suite

```bash
# Run all tests
npm test

# Or directly
node test.js
```

**Test Coverage:**
- Test 1: Valid credential verification
- Test 2: Tampered credential detection
- Test 3: Wrong subject DID validation
- Test 4: Untrusted issuer detection
- Test 5: Expired credential check

**Expected Output:**
```
========================================
VC VERIFICATION TEST SUITE
========================================

--- Test 1: Valid Credential ---
PASS: Valid credential verified successfully
   Issuer Validation: TRUSTED
   Subject Validation: MATCH

--- Test 2: Tampered Credential ---
PASS: Tampered credential correctly rejected

--- Test 3: Wrong Subject DID ---
PASS: Cryptographic signature is valid
   WARNING: Subject DID mismatch

--- Test 4: Different Issuer ---
PASS: Cryptographic signature is valid
   WARNING: Untrusted issuer

--- Test 5: Expired Credential ---
FAIL: Verification failed

========================================
STATISTICS:
Total Tests: 5
Passed: 2
Failed: 1
Warnings: 2
========================================
```

### Advanced Testing

#### Test JWT Structure

```bash
node -e "
const jwt = 'YOUR_JWT_HERE'
const [header, payload, signature] = jwt.split('.')
console.log('Header:', Buffer.from(header, 'base64').toString())
console.log('Payload:', Buffer.from(payload, 'base64').toString())
console.log('Signature (hex):', Buffer.from(signature, 'base64url').toString('hex'))
"
```

#### Test Tampering Detection

```bash
# Generate valid credential
node cli.js generate > vc.txt

# Extract JWT from output
JWT=$(grep -A 1 "^eyJ" vc.txt | head -1)

# Verify original (should pass)
node cli.js verify "$JWT"

# Tamper with it (change one character)
TAMPERED="${JWT:0:-5}XXXXX"

# Verify tampered (should fail)
node cli.js verify "$TAMPERED"
```

#### Performance Testing

```bash
# Generate 100 credentials and measure time
time for i in {1..100}; do
  node cli.js generate > /dev/null
done

# Verify 100 times and measure time
JWT=$(node cli.js generate 2>/dev/null | grep "^eyJ" | head -1)
time for i in {1..100}; do
  node cli.js verify "$JWT" > /dev/null
done
```

---

## Project Structure

```
VC creation/
├── index.js              # Main VC creation demo
├── test.js               # Comprehensive test suite
├── cli.js                # Command-line interface
├── package.json          # Dependencies and scripts
├── README.md            # This documentation
├── CRYPTOGRAPHY.md      # Detailed cryptographic explanation
├── src/
│   ├── agent.js         # Veramo agent setup
│   └── helpers.js       # Utility functions
└── node_modules/        # Dependencies
```

---

## Dependencies

### Core Libraries

- **@veramo/core** (^6.0.0): Core Veramo framework
- **@veramo/credential-w3c** (^6.0.0): W3C VC implementation
- **@veramo/did-manager** (^6.0.0): DID management
- **@veramo/did-provider-key** (^6.0.0): did:key method
- **@veramo/did-resolver** (^6.0.0): DID resolution
- **@veramo/key-manager** (^6.0.0): Key management
- **@veramo/kms-local** (^6.0.0): Local key storage
- **did-resolver** (^4.1.0): DID resolver
- **key-did-resolver** (^3.0.0): did:key resolver

### Cryptographic Implementation

Veramo internally uses:
- **@noble/ed25519** or **tweetnacl**: Ed25519 implementation
- **@stablelib/sha512**: SHA-512 hashing

---

## API Reference

### Helper Functions

#### `createCredentialPayload(issuer, subject, credentialData)`
Creates a standardized W3C credential structure.

**Parameters:**
- `issuer`: Object with `did` property
- `subject`: Object with `did` property
- `credentialData`: Object containing credential claims

**Returns:** Credential object ready for signing

#### `exportCredentialJWT(vc)`
Extracts JWT token from verifiable credential.

**Parameters:**
- `vc`: Verifiable credential object

**Returns:** JWT string

#### `importCredentialFromJWT(jwtString)`
Creates credential object from JWT for verification.

**Parameters:**
- `jwtString`: JWT token

**Returns:** Credential object

#### `validateIssuer(verificationResult, trustedIssuers)`
Checks if issuer is in trusted list.

**Parameters:**
- `verificationResult`: Result from verification
- `trustedIssuers`: Array of trusted DIDs

**Returns:** Validation result object

#### `validateSubject(verificationResult, expectedSubjectDid)`
Validates subject DID matches expected value.

**Parameters:**
- `verificationResult`: Result from verification
- `expectedSubjectDid`: Expected subject DID

**Returns:** Validation result object

#### `isCredentialExpired(verificationResult)`
Checks if credential has expired.

**Parameters:**
- `verificationResult`: Result from verification

**Returns:** Expiration check result

---

## Security Considerations

### Current Implementation

✅ **Secure:**
- Ed25519 cryptographic signatures
- W3C standard compliance
- Tamper-evident design
- Self-verifying identities

⚠️ **Limitations:**
- In-memory key storage (for testing only)
- No key backup/recovery
- No revocation mechanism
- No distributed trust (single issuer)

### Production Recommendations

1. **Key Management:**
   - Use hardware security modules (HSM)
   - Implement key backup and recovery
   - Use encrypted persistent storage

2. **Revocation:**
   - Implement status list 2021
   - Use blockchain-based revocation registry
   - Check revocation before accepting credentials

3. **Trust Framework:**
   - Maintain trusted issuer registry
   - Implement governance framework
   - Use verifiable trust chains

4. **Privacy:**
   - Implement selective disclosure (BBS+ signatures)
   - Use zero-knowledge proofs for claims
   - Minimize correlation tracking

---

## Future Enhancements for Cross-Chain Use

1. **Blockchain Integration:**
   - Store credential hashes on-chain
   - Implement cross-chain verification contracts
   - Use oracles for off-chain verification

2. **DID Methods:**
   - Support `did:ethr` for Ethereum
   - Support `did:pkh` for blockchain addresses
   - Multi-chain DID resolution

3. **Advanced Cryptography:**
   - BBS+ signatures for selective disclosure
   - Zero-knowledge proofs for privacy
   - Post-quantum cryptography

4. **Standards Compliance:**
   - W3C VC Data Model 2.0
   - DIF Presentation Exchange
   - OpenID for Verifiable Credentials

---

## References

### W3C Standards
- [Verifiable Credentials Data Model 1.1](https://www.w3.org/TR/vc-data-model/)
- [Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [VC-JWT Specification](https://www.w3.org/TR/vc-data-model/#json-web-token)

### Cryptography
- [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)
- [Ed25519 Curve](https://ed25519.cr.yp.to/)
- [Veramo Framework](https://veramo.io/)

### Research Papers
- "Self-Sovereign Identity" - Christopher Allen
- "Decentralized Identifiers" - W3C DID Working Group
- "Verifiable Credentials for Cross-Chain Authentication" - Your Thesis

---

## License

This implementation is for academic research purposes as part of a thesis on cross-chain user authentication using verifiable credentials.

---

## Contact

For questions about this implementation, refer to the thesis documentation or contact the research team.

**Last Updated:** December 29, 2025
