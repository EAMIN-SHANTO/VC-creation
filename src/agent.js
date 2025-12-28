// src/agent.js
import { createAgent } from '@veramo/core'
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager'
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager'
import { KeyManagementSystem } from '@veramo/kms-local'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { KeyDIDProvider } from '@veramo/did-provider-key'
import { getResolver as getKeyResolver } from 'key-did-resolver'
import { Resolver } from 'did-resolver' // <--- 1. NEW IMPORT

export const setupAgent = () => {
  return createAgent({
    plugins: [
      new KeyManager({
        store: new MemoryKeyStore(),
        kms: {
          local: new KeyManagementSystem(new MemoryPrivateKeyStore()),
        },
      }),
      new DIDManager({
        store: new MemoryDIDStore(),
        defaultProvider: 'did:key',
        providers: {
          'did:key': new KeyDIDProvider({
            defaultKms: 'local',
          }),
        },
      }),
      new DIDResolverPlugin({
        // 2. FIXED: We wrap the list of resolvers in the formal "Resolver" class
        resolver: new Resolver({
          ...getKeyResolver(),
        }),
      }),
      new CredentialPlugin(),
    ],
  })
}