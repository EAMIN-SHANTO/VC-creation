// CRYPTOGRAPHIC SIGNATURE EXPLANATION
// ====================================

/**
 * SIGNATURE ALGORITHM: EdDSA (Edwards-curve Digital Signature Algorithm)
 * 
 * Specific Implementation: Ed25519
 * - Elliptic Curve: Twisted Edwards curve (edwards25519)
 * - Key Size: 32 bytes (256 bits)
 * - Signature Size: 64 bytes (512 bits)
 * - Security Level: ~128-bit security
 * 
 * Why Ed25519?
 * - Fast: 10x faster than RSA-2048
 * - Small: 32-byte keys vs 256-byte RSA keys
 * - Secure: Resistant to timing attacks
 * - Standard: Used in SSH, TLS, cryptocurrencies
 */

/**
 * HOW IT WORKS:
 * 
 * 1. KEY GENERATION (Done when creating DID)
 * ==========================================
 * 
 * a) Generate random 32-byte private key (seed)
 *    Private Key: [random 32 bytes]
 * 
 * b) Derive public key using curve multiplication
 *    Public Key = private_key × Base Point (on edwards25519 curve)
 *    Public Key: [32 bytes]
 * 
 * c) Create DID from public key
 *    DID = "did:key:z" + multibase_encode(public_key)
 *    Example: did:key:z6Mkq4mv25bjUZHd...
 * 
 * 
 * 2. SIGNING (Creating Verifiable Credential)
 * ============================================
 * 
 * Input:
 *   - Message: JWT Header + "." + JWT Payload
 *   - Private Key: Issuer's 32-byte secret key
 * 
 * Process:
 *   a) Hash the message using SHA-512
 *      hash = SHA512(message)
 * 
 *   b) Create deterministic nonce
 *      r = SHA512(hash(private_key) || message) mod L
 *      where L = curve order
 * 
 *   c) Compute R = r × Base Point
 *      R is first 32 bytes of signature
 * 
 *   d) Compute challenge
 *      h = SHA512(R || public_key || message) mod L
 * 
 *   e) Compute S = (r + h × private_key) mod L
 *      S is second 32 bytes of signature
 * 
 * Output:
 *   Signature = R || S (64 bytes total)
 * 
 * 
 * 3. VERIFICATION (Verifying Credential)
 * ======================================
 * 
 * Input:
 *   - Message: JWT Header + "." + JWT Payload
 *   - Signature: 64 bytes (R || S)
 *   - Public Key: From issuer's DID
 * 
 * Process:
 *   a) Extract R (first 32 bytes) and S (last 32 bytes)
 * 
 *   b) Compute challenge
 *      h = SHA512(R || public_key || message) mod L
 * 
 *   c) Check equation: S × Base Point = R + h × Public Key
 *      - Left side: Point multiplication with S
 *      - Right side: Point addition on curve
 * 
 *   d) If equation holds → VALID ✓
 *      If equation fails → INVALID ✗
 * 
 * Output:
 *   Boolean: valid or invalid
 * 
 * 
 * 4. MATHEMATICAL FOUNDATION
 * ==========================
 * 
 * Elliptic Curve Equation:
 *   -x² + y² = 1 + d·x²·y²
 *   where d = -121665/121666
 * 
 * Security Basis:
 *   - Discrete Logarithm Problem on elliptic curves
 *   - Given P = k × G, finding k is computationally infeasible
 *   - Requires ~2^128 operations to break (impossible with current tech)
 * 
 * 
 * 5. WHY TAMPERING FAILS
 * ======================
 * 
 * Scenario: Attacker changes message
 * 
 * Original:
 *   Signature = f(message, private_key)
 * 
 * After tampering:
 *   message' ≠ message
 *   Signature still = f(message, private_key)
 * 
 * Verification:
 *   Check: Signature ?= f(message', public_key)
 *   Result: FAIL ✗
 * 
 * Why attacker can't create new signature:
 *   - Needs private key (unknown to attacker)
 *   - Can't derive private key from public key (ECDLP hard problem)
 *   - Can't forge signature without private key
 * 
 * 
 * 6. COMPARISON WITH OTHER ALGORITHMS
 * ===================================
 * 
 * RSA-2048:
 *   - Key: 2048 bits (256 bytes)
 *   - Signature: 256 bytes
 *   - Speed: Slower signing/verification
 *   - Security: ~112-bit
 * 
 * ECDSA (secp256k1 - Bitcoin/Ethereum):
 *   - Key: 32 bytes
 *   - Signature: ~72 bytes (variable)
 *   - Speed: Fast
 *   - Security: ~128-bit
 *   - Issue: Nonce must be random (vulnerabilities if not)
 * 
 * Ed25519 (Used here):
 *   - Key: 32 bytes
 *   - Signature: 64 bytes (fixed)
 *   - Speed: Fastest
 *   - Security: ~128-bit
 *   - Advantage: Deterministic nonce (no randomness issues)
 * 
 * 
 * 7. VERAMO IMPLEMENTATION
 * ========================
 * 
 * Libraries Used:
 *   - @veramo/kms-local: Key Management System
 *   - @veramo/key-manager: Key generation and storage
 *   - @veramo/did-provider-key: DID:key method implementation
 *   - Internal: @noble/ed25519 or tweetnacl for actual crypto
 * 
 * Flow in Your Code:
 *   1. KeyManager generates Ed25519 keypair
 *   2. DIDManager creates did:key from public key
 *   3. CredentialPlugin signs JWT using private key
 *   4. DIDResolver resolves did:key to public key
 *   5. CredentialPlugin verifies signature using public key
 */

/**
 * PRACTICAL EXAMPLE
 * =================
 */

// Private Key (32 bytes) - KEPT SECRET by issuer
// Example: 0x3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c

// Public Key (32 bytes) - EMBEDDED in DID
// Example: 0x8c0e01487e7a2fcd8dc7d7b85c5e1b9f7e4c6d5a3b2f1e0d9c8b7a6f5e4d3c2b

// DID derived from public key:
// did:key:z6MkqhsS52wX2JcQaXKcGhkgseuvhHRKKc6z8DarNo8aXxY9

// Signing:
// message = "eyJhbGci...{"vc":{...}}"
// signature = Ed25519.sign(message, private_key)
// JWT = message + "." + base64url(signature)

// Verification:
// [header, payload, signature] = JWT.split(".")
// public_key = resolve_did("did:key:z6Mkq...")
// valid = Ed25519.verify(header+"."+payload, signature, public_key)

/**
 * SECURITY GUARANTEES
 * ===================
 * 
 * 1. Authenticity: Only holder of private key can create signature
 * 2. Integrity: Any change to message breaks signature
 * 3. Non-repudiation: Signer cannot deny signing
 * 4. Unforgeability: Cannot create valid signature without private key
 * 
 * Attack Resistance:
 * - Brute Force: 2^128 operations (impossible)
 * - Timing Attacks: Ed25519 designed to be constant-time
 * - Collision Attacks: SHA-512 used (2^256 security)
 * - Quantum: Vulnerable to Shor's algorithm (future concern)
 */
