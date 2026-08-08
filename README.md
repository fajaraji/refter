# RefPer - On-chain Credential MVP

RefPer issues and verifies reference letters on Monad Testnet.

## Role Model

- **Owner**: the smart contract owner. The owner manages which wallets may act as issuers.
- **Issuer**: a wallet listed in `authorizedIssuers`. Issuers create and revoke credentials.
- **Holder**: the wallet address that receives a credential. The holder does not need to connect during issuance.
- **Verifier**: anyone. Verifiers do not need a wallet or database; they only need a Credential ID.

Holder names are not used as on-chain identity. The holder wallet address is the identity in the MVP.

## MVP Flow

1. The owner connects a wallet and authorizes a company or HR wallet in the **Roles** tab.
2. The issuer connects the authorized wallet.
3. The issuer enters the holder wallet address, holder name as a display label, job title, and employment period.
4. The issuer signs the `issueCredential` transaction in MetaMask.
5. The holder connects the recipient wallet to view its credentials.
6. The holder shares the Credential ID with a verifier.
7. The verifier checks the ID in the **Verify** tab without connecting a wallet.

The company name is not required in every form. In the MVP, the authorized issuer wallet is the issuer identity. A company profile can be added later as on-chain or off-chain metadata.

## Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Solidity + Foundry |
| Frontend | Vite + React + TypeScript + viem |
| Agent | Local pattern matching, with no browser API key |
| Blockchain | Monad Testnet, chain ID 10143 |

## Quickstart

```bash
# Contract
cd contracts
forge build
forge test

# Web
cd ../web
npm install
npm run dev
```

## Environment

`web/.env.local` only needs these public values:

```env
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_CONTRACT_ADDRESS=0x079D95b97f062888227D7237AE3a9312C978747D
```

The MVP does not send a Gemini API key from the browser. If generative AI is added later, use a server-side proxy with rate limiting.

## MVP Deployment

- Contract: `0x079D95b97f062888227D7237AE3a9312C978747D`
- Explorer: https://testnet.monadexplorer.com

Keep the frontend, documentation, and deployment metadata on the same address. If the Solidity source changes after deployment, deploy again before relying on the new contract validation.

## MVP Limitations

- Credentials store compact metadata, not PDF files.
- Public verification uses an ID, not a name search.
- There is no database, indexer, or encrypted document storage yet.
- The Roles tab checks the connected wallet; a global issuer directory requires an event indexer.
- A revoked credential cannot be restored.
