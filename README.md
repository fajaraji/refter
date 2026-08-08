# Refper — AI Agent Credential Issuer 🎯

Anti-palsu sertifikat & paklaring di Monad blockchain, diterbitkan lewat natural language.

## Cara Kerja

```
HR: "Terbitkan paklaring untuk Budi, posisi Senior Developer, 2020-2024"
  → AI Agent parse intent
  → issueCredential() di Monad (1 detik, permanent, anti-palsu)

HR: "Cek credential ID 3, valid gak?"
  → AI Agent query blockchain
  → ✅ VALID / ❌ INVALID
```

## Stack

| Layer | Teknologi |
|-------|-----------|
| Smart Contract | Solidity (Foundry) — `contracts/` |
| AI Agent | Pattern matching (Layer 1) + Gemini 2.0 Flash (Layer 2) |
| Frontend | Vite + React + viem — `web/` |
| Blockchain | Monad Testnet (chain ID 10143) |

## Quickstart

```bash
# Contract (deployed: 0x5a823B5cC2E80738b7Ed26C21b18d08e2AbE15a7)
cd contracts && forge build && forge test

# Web
cd web && npm install && npm run dev
```

## Env

- Root `.env`: `PRIVATE_KEY` (deployer), `GEMINI_API_KEY` (opsional — Layer 2)
- `web/.env.local`: `VITE_MONAD_RPC_URL`, `VITE_CONTRACT_ADDRESS`, `VITE_GEMINI_API_KEY`

> AI Agent tetap jalan tanpa Gemini API key — Layer 1 pattern matching selalu aktif.

## Kontrak di Monadscan

- Contract: `0x5a823B5cC2E80738b7Ed26C21b18d08e2AbE15a7`
- Explorer: https://testnet.monadexplorer.com

## Built with monskills

`chain=monad-testnet` — lihat `.monskills`
