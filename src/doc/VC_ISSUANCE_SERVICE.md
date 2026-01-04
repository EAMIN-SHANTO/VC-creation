# VC Issuance Service - University Credentialing System

## Overview

This is a **Verifiable Credential (VC) Issuance Service** designed for universities to issue digital credentials to students. The system follows W3C Verifiable Credentials Data Model 1.1 and uses Ed25519 cryptographic signatures.

## Architecture

```
┌─────────────────────────────────────────┐
│     University Issuance Service         │
├─────────────────────────────────────────┤
│  Fixed Issuer DID (University)          │
│  - Created once, stored persistently    │
│  - All credentials signed by same DID   │
└─────────────────────────────────────────┘
                 │
                 ▼
      ┌──────────────────┐
      │ Issue Credential │
      └──────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌──────────┐          ┌──────────┐
│  Storage │          │  JWT     │
│ .storage/│          │  Token   │
│credentials/│        │(portable)│
└──────────┘          └──────────┘

## Usage

### Issue a Credential

```bash
node issue.js issue <studentId> <name> [program] [description]
```

**Example:**
```bash
node issue.js issue 2025001 "John Doe" "Computer Science"
```

**Output:**
- Credential saved to `.storage/credentials/{studentId}.json`
- JWT token printed (can be shared cross-chain)
- Issuer DID displayed (same for all credentials in a session)

### Verify a Credential

```bash
node issue.js verify <studentId>
```

**Example:**
```bash
node issue.js verify 2025001
```

**Output:**
- Verification status (✓ VERIFIED or ✗ FAILED)
- Student information
- Credential status (expired, revoked, active)
- Issuer information

### List All Credentials

```bash
node issue.js list
```

### Revoke a Credential

```bash
node issue.js revoke <studentId>
```

## Credential Structure

Follows W3C VC Data Model 1.1:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://www.w3.org/2018/credentials/examples/v1"
  ],
  "type": ["VerifiableCredential", "UniversityCardCredential"],
  "id": "urn:credential:2025001-1767468164238",
  "issuer": {
    "id": "did:key:z6Mkothn...",
    "name": "Example University"
  },
  "issuanceDate": "2026-01-03T19:22:44.238Z",
  "expirationDate": "2027-01-03T19:22:44.238Z",
  "credentialSubject": {
    "id": "urn:university:student:2025001",
    "name": "John Doe",
    "title": "Computer Science",
    "description": "John Doe is a student of the Computer Science program",
    "dateOfIssue": "2026-01-03",
    "expiryDate": "2027-01-03T19:22:44.238Z",
    "directedBy": "Example University",
    "location": "University Campus"
  },
  "credentialStatus": {
    "id": "https://university.edu/credentials/status/2025001",
    "type": "StudentCredentialStatusList2025"
  },
  "proof": {
    "type": "JwtProof2020",
    "jwt": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Key Features

### 1. Fixed Issuer Identity
- The university issuer DID is created once and stored in `.storage/issuer-key.json`
- All credentials issued in the same session use the same issuer DID
- **Note**: Due to in-memory key storage, the issuer DID may change between sessions
- For production use, implement persistent key storage (database or file-based)

### 2. Persistent Credential Storage
- Credentials are saved to `.storage/credentials/{studentId}.json`
- Each file contains:
  - Full credential object
  - JWT token (for cross-chain sharing)
  - Issuance timestamp
  - Status (active/revoked)

### 3. JWT Format for Portability
- Credentials are signed as JWT tokens
- JWT format enables cross-chain verification
- Self-contained: includes all necessary data and signature

### 4. Cryptographic Security
- **Algorithm**: EdDSA with Ed25519 curve
- **Key Size**: 32 bytes (256 bits)
- **Signature Size**: 64 bytes
- **Security Level**: ~128-bit security
- Tamper-proof: any modification invalidates the signature

### 5. Credential Status Management
- Track status: active, revoked, expired
- `credentialStatus` field included (W3C standard)
- Revocation support via `revoke` command

## File Structure

```
.
├── issue.js                    # Main CLI application
├── src/
│   ├── agent.js               # Veramo agent setup
│   ├── fixedIssuer.js         # Fixed issuer management
│   ├── issuer.js              # VC issuance logic
│   ├── storage.js             # File-based storage
│   └── helpers.js             # Utility functions
└── .storage/                   # Generated storage
    ├── issuer-key.json        # University issuer DID
    └── credentials/           # Issued credentials
        ├── 2025001.json
        ├── 2025002.json
        └── ...
```

## W3C Standards Compliance

✓ **W3C Verifiable Credentials Data Model 1.1**
  - Proper `@context` with credential vocab
  - Required fields: type, issuer, issuanceDate, credentialSubject
  - Optional fields: expirationDate, credentialStatus, proof

✓ **W3C DID Core**
  - Uses `did:key` method (self-contained DIDs)
  - No blockchain required for DID resolution

✓ **W3C VC-JWT**
  - JWT format for verifiable credentials
  - EdDSA signature algorithm
  - Compact and portable

## Important Notes

### Issuer Key Persistence

⚠️ **Current Limitation**: The system uses `MemoryKeyStore` which means:
- Issuer keys are stored in RAM only
- Keys are lost when the program exits
- A new issuer DID may be generated on each restart

**For Production**:
- Use file-based storage: `@veramo/data-store-json`
- Or database storage: SQLite with `@veramo/data-store`
- Or fixed seed/HSM for deterministic keys

### Cross-Chain Usage

The JWT token can be used for cross-chain authentication:
1. Student receives credential JWT
2. Student presents JWT to blockchain service
3. Service verifies JWT signature
4. Service checks issuer DID is trusted
5. Service grants access based on credential claims

## Testing Commands

```bash
# Issue credentials for 3 students
node issue.js issue 2025001 "Alice Johnson" "Computer Engineering"
node issue.js issue 2025002 "Bob Smith" "Electrical Engineering"
node issue.js issue 2025003 "Carol White" "Software Engineering"

# List all credentials
node issue.js list

# Verify a credential
node issue.js verify 2025001

# Revoke a credential
node issue.js revoke 2025002

# Try to verify revoked credential
node issue.js verify 2025002
```

## Security Considerations

1. **Private Key Protection**: In production, store issuer keys in HSM or secure vault
2. **Revocation List**: Implement proper revocation registry (blockchain or centralized)
3. **Expiration Checking**: Always check expirationDate before accepting credentials
4. **Trusted Issuers**: Maintain whitelist of trusted university DIDs
5. **Transport Security**: Use HTTPS for credential transmission

## Future Enhancements

- [ ] Persistent key storage (file/database)
- [ ] Blockchain integration for credential hashes
- [ ] On-chain revocation registry
- [ ] Batch credential issuance
- [ ] Web interface for credential generation
- [ ] QR code generation for credentials
- [ ] Selective disclosure (ZKP)
- [ ] Multi-signature support

## References

- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [Veramo Framework](https://veramo.io/)
- [Ed25519 Signature](https://ed25519.cr.yp.to/)
