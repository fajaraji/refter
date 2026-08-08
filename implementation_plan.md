# Implementation Plan: AI Agent Credential Issuer 🤖🎯

> Anti-palsu sertifikat & paklaring di Monad blockchain — powered by AI Agent
>
> Built with: monskill scaffold, Context7 Monad/Foundry/viem docs

## Goal

Platform AI Agent yang bisa **terbitkan dan verifikasi kredensial** (sertifikat, paklaring, surat referensi) di blockchain Monad via **natural language**. HR bicara ke agent → agent issue credential on-chain. HR tanya "cek paklaring Budi" → agent query blockchain → jawab.

## Kenapa AI Agent? (Judging Criteria Alignment)

| Criteria | Score | Cara Penuhi |
|----------|-------|-------------|
| **Novelty & Originality** | 8/10 | AI agent issuer belum ada di Monad. Kombinasi NL + on-chain issuance = fresh |
| **Innovative Mechanics** | 7/10 | Natural language → smart contract interaction. Leverage Monad fast finality (400ms block) untuk real-time issuance |
| **Problem-Solving** | 8/10 | Pemalsuan paklaring = masalah nyata Indonesia. AI bikin akses lebih gampang (gak perlu tech knowledge) |
| **Learning & Experimentation** | 7/10 | Experiment AI + blockchain integration. Agent parse intent → generate tx → on-chain |

---

## 3 Aktor

| Aktor | Siapa | Interaksi |
|-------|-------|-----------|
| **Issuer** | Perusahaan / panitia | Chat dengan AI agent: "Terbitkan paklaring untuk Budi, posisi Senior Dev, 2020-2024" |
| **Holder** | Karyawan / peserta | Lihat kredensial di profil, share via QR |
| **Verifier** | HR / siapapun | Chat dengan AI agent: "Cek credential ID 5, valid gak?" |

## Alur

```
Issuer: "Terbitkan sertifikat untuk 0x1234..., judul Workshop Monad 101"
    ↓ AI Agent parse intent
    ↓ AI Agent call smart contract issueCredential()
    ↓ Monad blockchain terbitkan credential (1 detik)
    ↓ AI Agent: "✅ Credential #3 terbitkan. Cek di monadscan..."
    
Verifier: "Cek credential ID 3, valid gak?"
    ↓ AI Agent parse intent  
    ↓ AI Agent call smart contract verifyCredential()
    ↓ AI Agent: "✅ VALID. Issuer: 0x5678..., Tipe: Sertifikat, Judul: Workshop Monad 101"
```

---

## Architecture

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Smart Contract** | Solidity via Foundry | On-chain credential storage & verification |
| **AI Agent** | Gemini 2.0 Flash API | Parse natural language → intent → contract call |
| **Frontend** | Vite + React + viem | Chat UI + credential dashboard |
| **Blockchain** | Monad Testnet (10143) | Fast finality, low gas |

### On-chain vs Off-chain

| On-chain | Off-chain |
|----------|-----------|
| Credential records (hash + metadata) | AI agent logic (NL parsing) |
| Issuer authorization | UI state |
| Verification status | Dokumen asli (PDF → IPFS, future) |

> Per scaffold skill: "Reputation scores → on-chain commitments. Business logic that changes frequently → offchain." AI agent logic = offchain. Credential data = onchain.

---

## Project Structure

```
c:\monad-blitz-2026/
├── contracts/
│   ├── src/
│   │   └── Credentials.sol          # Smart contract
│   ├── test/
│   │   └── Credentials.t.sol         # Unit tests
│   ├── foundry.toml                   # Foundry config (Monad testnet)
│   └── .env                           # Private key
├── web/
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatAgent.tsx          # AI chat interface (main feature)
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── CredentialCard.tsx     # Display credential
│   │   │   ├── MyCredentials.tsx      # Holder panel
│   │   │   └── VerifyResult.tsx       # Verification result display
│   │   ├── lib/
│   │   │   ├── client.ts              # viem clients (Monad testnet)
│   │   │   ├── contract.ts            # viem contract instance
│   │   │   ├── abi.ts                # ABI
│   │   │   └── agent.ts              # AI agent logic (parse intent → contract call)
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   ├── tsconfig.json                  # target: ES2020
│   └── vite.config.ts
├── .monskills
└── README.md
```

---

## Smart Contract (Credentials.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Credentials is Ownable {
    
    struct Credential {
        address issuer;
        address holder;
        string credentialType;   // "Sertifikat" / "Paklaring" / "Surat Referensi"
        string title;             // "Workshop Monad 101"
        string ipfsHash;          // hash dokumen di IPFS (placeholder untuk MVP)
        uint256 issuedAt;
        bool active;
    }

    mapping(uint256 => Credential) public credentials;
    uint256 public nextId = 1;

    mapping(address => bool) public authorizedIssuers;
    mapping(address => uint256[]) public holderCredentials;

    event CredentialIssued(uint256 indexed id, address indexed issuer, address indexed holder, string credentialType, string title);
    event CredentialRevoked(uint256 indexed id);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    // === ISSUER MANAGEMENT ===
    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    function revokeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    // === ISSUE ===
    function issueCredential(
        address _holder,
        string calldata _credentialType,
        string calldata _title,
        string calldata _ipfsHash
    ) external returns (uint256) {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        
        uint256 id = nextId++;
        credentials[id] = Credential({
            issuer: msg.sender,
            holder: _holder,
            credentialType: _credentialType,
            title: _title,
            ipfsHash: _ipfsHash,
            issuedAt: block.timestamp,
            active: true
        });
        holderCredentials[_holder].push(id);
        
        emit CredentialIssued(id, msg.sender, _holder, _credentialType, _title);
        return id;
    }

    function revokeCredential(uint256 _id) external {
        require(credentials[_id].issuer == msg.sender, "Not the issuer");
        require(credentials[_id].active, "Already revoked");
        credentials[_id].active = false;
        emit CredentialRevoked(_id);
    }

    // === VIEW ===
    function getCredential(uint256 _id) external view returns (Credential memory) {
        return credentials[_id];
    }

    function getHolderCredentials(address _holder) external view returns (uint256[] memory) {
        return holderCredentials[_holder];
    }

    function verifyCredential(uint256 _id) external view returns (
        bool isValid, 
        address issuer, 
        address holder, 
        string memory credentialType, 
        string memory title, 
        uint256 issuedAt
    ) {
        Credential memory c = credentials[_id];
        return (c.active && authorizedIssuers[c.issuer], c.issuer, c.holder, c.credentialType, c.title, c.issuedAt);
    }

    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return authorizedIssuers[_issuer];
    }
}
```

---

## AI Agent Design (agent.ts)

### Architecture: 2-Layer Hybrid

| Layer | Tech | Role | Availability |
|-------|------|------|-------------|
| **Layer 1 (Primary)** | Pattern matching (regex) | Parse intent dari keyword | ✅ Always available, free |
| **Layer 2 (Enrichment)** | Gemini 2.0 Flash API | Parse kalimat kompleks, improve accuracy | ⚠️ Optional, needs API key |

> [!IMPORTANT]
> **Layer 1 ALWAYS runs first.** Jika Gemini API down/limit → agent tetap jalan pakai pattern matching. Demo gak gagal.

### Gemini API Integration (`web/src/lib/gemini.ts`)

```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are a credential parsing agent. Parse the user's message and return ONLY valid JSON, no markdown, no explanation.

{
  "intent": "issue" | "verify" | "list" | "revoke" | "check_issuer" | "unknown",
  "params": {
    "holderAddress": "0x..." or null,
    "credentialType": "Sertifikat" | "Paklaring" | "Surat Referensi" or null,
    "title": "string or null",
    "credentialId": number or null
  },
  "confidence": 0.0-1.0
}

Rules:
- "terbitkan/buat/issue" → intent "issue"
- "cek/verifikasi/valid gak/asli gak" → intent "verify"
- "lihat/tampilkan/kredensil saya" → intent "list"
- "cabut/tarik/revoke" → intent "revoke"
- If holderAddress is not 0x... format → set to null
- If credentialType not one of the 3 options → "Sertifikat"
`

async function parseWithGemini(userInput: string): Promise<AgentResponse | null> {
  if (!GEMINI_API_KEY) return null
  
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser message: "${userInput}"` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200 }
      })
    })
    const data = await res.json()
    const text = data.candidates[0].content.parts[0].text
    return JSON.parse(text)
  } catch {
    return null // Silent fail → fallback to pattern matching
  }
}
```

### Pattern Matching (Layer 1) — `web/src/lib/agent.ts`

```typescript
interface AgentResponse {
  intent: 'issue' | 'verify' | 'list' | 'revoke' | 'check_issuer' | 'unknown'
  params: {
    holderAddress?: `0x${string}`
    credentialType?: string
    title?: string
    credentialId?: number
  }
  message: string
}

function parseWithPattern(userInput: string): AgentResponse {
  const input = userInput.toLowerCase()
  
  // Detect intent
  if (/terbit|issue|buat|bikin/.test(input))
    intent = 'issue'
  else if (/cek|verif|valid|asli/.test(input))
    intent = 'verify'
  else if (/lihat|tampil|list|kredensial|punya/.test(input))
    intent = 'list'
  else if (/cabut|tarik|revoke/.test(input))
    intent = 'revoke'
  else if (/authorized|issuer|authorize/.test(input))
    intent = 'check_issuer'
  else
    intent = 'unknown'
  
  // Extract params
  const addressMatch = input.match(/0x[a-fA-F0-9]{40}/)
  const idMatch = input.match(/#?(\d+)/)
  const typeMatch = input.match(/sertifikat|paklaring|surat\s*referensi/)
  const titleMatch = input.match(/judul\s*["']?([^"',]+)["']?/i) || input.match(/(?:workshop|kursus|pelatihan|bootcamp|posisi)\s+["']?([^"',]+)["']?/i)
  
  return {
    intent,
    params: {
      holderAddress: addressMatch?.[0] as `0x${string}`,
      credentialType: typeMatch?.[0] || undefined,
      title: titleMatch?.[1] || undefined,
      credentialId: idMatch ? parseInt(idMatch[1]) : undefined
    },
    message: generateResponse(intent, params)
  }
}

// Hybrid parser: Layer 1 first, Layer 2 enrichment
async function parseIntent(userInput: string): Promise<AgentResponse> {
  // Always run pattern matching first (guaranteed to work)
  const patternResult = parseWithPattern(userInput)
  
  // Try Gemini for better parsing (optional)
  const geminiResult = await parseWithGemini(userInput)
  
  // Merge: Gemini takes priority if confidence > 0.8 AND params lebih lengkap
  if (geminiResult && geminiResult.confidence > 0.8 && geminiResult.intent !== 'unknown') {
    return geminiResult
  }
  
  return patternResult
}
```

### Web .env Local (`web/.env.local`)

```env
# Copy from root .env

# Monad Testnet RPC (public)
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# Contract address — FILLED AFTER DEPLOY (Phase 3)
VITE_CONTRACT_ADDRESS=0x_PLACEHOLDER_WILL_BE_UPDATED_AFTER_DEPLOY

# Gemini API Key for AI Agent (Layer 2 enrichment — optional, agent works without it)
VITE_GEMINI_API_KEY=AIzaSyBVsfUry90DGxBJsBBfP86QdoYMMqUQ8QQ
```

### Contract Address Injection (Phase 3 → Phase 4)

Flow setelah deploy:
1. `forge create` → output contract address
2. Tulis ke file: `echo "export const CREDENTIALS_ADDRESS = '0x...'" > web/src/lib/contract-address.ts`
3. Juga update `web/.env.local`: replace `_PLACEHOLDER_WILL_BE_UPDATED_AFTER_DEPLOY`
4. Frontend baca dari `contract-address.ts` untuk contract instance

### Critical: .env Location

**.env stays at root** (`c:\monad-blitz-2026\.env`), NOT inside `contracts/`. 
Foundry commands (`forge create`, `cast wallet import`) akan load env dari root.
Web frontend baca dari `web/.env.local` (Vite convention).

---

## Frontend Design

### Layout: Chat-First Interface

```
┌─────────────────────────────────────────────┐
│  🤖 OnChain Credentials Agent    [Wallet]   │
├─────────────────────────────────────────────┤
│                                              │
│  Chat area:                                  │
│  ┌──────────────────────────────────────┐   │
│  │ User: Terbitkan sertifikat Workshop   │   │
│  │       Monad 101 untuk 0x1234...       │   │
│  │                                        │   │
│  │ Agent: ✅ Credential #3 terbitkan...  │   │
│  │        [Link ke Monadscan]             │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [Input chat...]                    [Send]   │
├─────────────────────────────────────────────┤
│  Tabs: [My Credentials] [Verify]             │
│                                              │
│  Quick actions:                               │
│  [Issue Credential] [Verify] [List Mine]    │
└─────────────────────────────────────────────┘
```

### Komponen:
1. **ChatAgent.tsx** — Main chat interface. User type → parseIntent() → executeAgent() → display result + MetaMask tx confirmation
2. **MyCredentials.tsx** — List credentials owned by connected wallet
3. **VerifyResult.tsx** — Visual verify result (green check / red X)
4. **WalletConnect.tsx** — Connect MetaMask

### Mobile Responsive Spec

- **Target viewport:** 375px (iPhone SE) — 768px (iPad)
- Chat input: sticky bottom, min-height 48px untuk jari
- Cards stack vertically di mobile, grid 2-column di desktop
- QR code tetap readable di mobile (min 200px)
- Navigation tabs: horizontal scroll di mobile

---

## Deployment (Context7 Monad docs + monskill)

### Prerequisites
1. Foundry installed ✅ (foundryup running)
2. MetaMask dengan Monad Testnet (chain ID 10143)
3. MON testnet dari faucet.monad.xyz
4. Private key di `.env`
5. Gemini API key (optional — untuk AI agent Layer 2 enrichment)

### Deploy

```bash
cd contracts

# Install OpenZeppelin
forge install --no-git OpenZeppelin/openzeppelin-contracts

# Build
forge build

# Import wallet
cast wallet import monad-deployer --private-key $PRIVATE_KEY

# Deploy
forge create src/Credentials.sol:Credentials \
  --account monad-deployer \
  --broadcast \
  --chain 10143 \
  --rpc-url https://testnet-rpc.monad.xyz
```

### Verify

```bash
# Standard JSON input
forge verify-contract <ADDR> src/Credentials.sol:Credentials \
  --chain 10143 \
  --show-standard-json-input > /tmp/standard-input.json

# Metadata
cat out/Credentials.sol/Credentials.json | jq '.metadata' > /tmp/metadata.json

# Call verification API (all 3 explorers)
curl -X POST https://agents.devnads.com/v1/verify \
  -H "Content-Type: application/json" \
  -d @/tmp/verify.json
```

### Monskills metadata
```ini
built-with=monskills
chain=monad-testnet
```

---

## Gas Considerations (monskill gas skill)

> [!IMPORTANT]
> Monad charges on **gas_limit** not gas used. Cold SLOAD = 8,100 gas. Cold account access = 10,100 gas.

Optimizations:
- `verifyCredential()` reads 2 storage slots (credential + issuer) — acceptable
- No contract loops — all iteration client-side (agent.ts)
- Agent uses `eth_call` (read) for verify — free, no gas
- `issueCredential()` = 3 SSTORE (credentials mapping + nextId + holderCredentials array push) — estimate ~150K gas
- Frontend sets explicit gas limits per gas skill guidelines

---

## Build Phases (5 Phase, No Chunking Needed)

### Phase 1: Project Setup (30 min)
- `forge init contracts`
- Install OpenZeppelin
- Config `foundry.toml` untuk Monad Testnet
- `npm create vite@latest web -- --template react-ts`
- Bump tsconfig target ke ES2020
- `npm install viem` di web/

### Phase 2: Smart Contract (45 min)
- Write `Credentials.sol` sesuai design di atas
- Write unit tests `Credentials.t.sol`
- `forge build` + `forge test` — pastikan pass

### Phase 3: Deploy (15 min)
- Setup `.env` dengan private key
- `cast wallet import` + `forge create` ke Monad Testnet
- Catat contract address
- Verify via API

### Phase 4: Frontend + AI Agent (2 jam)
- **4a** (30 min): viem client setup, ABI extraction, contract instance
- **4b** (45 min): ChatAgent.tsx — chat input → parseIntent → executeAgent → display result + MetaMask tx confirmation
- **4c** (30 min): agent.ts — pattern matching intents + Gemini enrichment + contract call wrappers
- **4d** (15 min): MyCredentials.tsx + VerifyResult.tsx + Dashboard tabs

### Phase 5: Polish & Demo Prep (30 min)
- Glassmorphism dark purple theme
- Smooth chat animations (typing indicator, fade-in messages)
- Toast notifications untuk transaksi
- Error handling (revert reasons, wallet not connected)
- Mobile responsive
- Demo dry-run

---

## Timeline

| Phase | Waktu | Deliverable |
|-------|-------|-------------|
| 1. Setup | 30 min | Project structure ready |
| 2. Smart Contract | 45 min | Credentials.sol + tests pass |
| 3. Deploy | 15 min | Contract on Monad Testnet |
| 4. Frontend + Agent | 2 jam | Chat AI + contract interaction |
| 5. Polish | 30 min | UI keren, demo-ready |
| **Total** | **~4 jam** | **+2 jam buffer** |

---

## Verification Plan

### Automated
```bash
cd contracts && forge test
```

### Manual E2E
1. Connect wallet (deployer = authorized issuer)
2. Chat: "Terbitkan sertifikat Workshop Monad 101 untuk 0x1234..."
   → Confirm MetaMask tx → Agent: "✅ Credential #1 terbitkan"
3. Switch wallet → Chat: "Kredensial saya apa aja?"
   → Agent: "Kamu punya 1 kredensial: #1 (Sertifikat: Workshop Monad 101)"
4. Chat: "Cek credential ID 1, valid gak?"
   → Agent: "✅ VALID — Sertifikat: Workshop Monad 101"
5. Switch back to issuer → Chat: "Cabut credential ID 1"
   → Confirm MetaMask tx → Agent: "✅ Credential #1 dicabut"
6. Chat: "Cek credential ID 1 lagi"
   → Agent: "❌ INVALID — Credential telah dicabut"

---

## Demo Script untuk Juri (2 menit)

> **[Buka chat interface]**
>
> "Ini AI Agent untuk terbitkan dan verifikasi kredensial di blockchain Monad. Bayangin kamu HR di perusahaan."
>
> **[Ketik di chat]**
> "Terbitkan paklaring untuk Budi, posisi Senior Developer, 2020-2024"
>
> **[MetaMask popup → confirm]**
> "Agent parse bahasa natural saya, terus otomatis terbitkan credential on-chain di Monad. 1 detik, permanent, gak bisa dipalsukan."
>
> **[Switch ke wallet Budi]**
> "Budi tinggal lihat di profilnya — paklaringnya ada di blockchain. Milik dia, bukan milik perusahaan. Gak perlu minta-minta ke perusahaan lama."
>
> **[Ketik di chat]**
> "Cek credential ID 1, valid gak?"
>
> **[Agent respond: ✅ VALID]**
>
> "HR mana pun bisa verifikasi 1 detik. Gak perlu telepon perusahaan lama. Gak perlu email. Cek blockchain, kelar."
>
> **[Highlight]**
> "Inovasinya: AI agent bikin blockchain accessible untuk non-teknis. HR gak perlu tau apa itu smart contract — cukup bicara natural language, agent yang handle sisanya."

---

## Checkpoint

Semua item terpenuhi. Project ready untuk eksekusi.

| Item | Status |
|------|--------|
| Foundry (forge v1.7.1) | ✅ Ready |
| Smart contract design | ✅ 6 functions + 3 mappings |
| AI Agent (2-layer hybrid) | ✅ Pattern matching (Layer 1) + Gemini (Layer 2) |
| Frontend design (chat UI) | ✅ 4 komponen + mobile responsive |
| Deploy flow | ✅ forge create + verify API |
| Gas optimization | ✅ Per monskill gas skill |
| .env (root) | ✅ PRIVATE_KEY + GEMINI_API_KEY |
| .gitignore | ✅ .env excluded |
| .monskills metadata | ✅ chain=monad-testnet |
| IPFS | ❌ Skipped (MVP pakai placeholder) |
| Gemini fallback | ✅ Layer 1 pattern matching guarantees no demo fail |

---

## Sources

- **Monskill**: scaffold/ (project structure, OpenZeppelin, verification API), gas/ (gas_limit not gas_used), addresses/ (testnet config)
- **Context7 Monad docs**: Foundry config `foundry.toml`, `forge create` deploy, chain ID 10143, RPC `https://testnet-rpc.monad.xyz`
- **Context7 Foundry docs**: `forge build`, `forge test`, `cast wallet import`
- **Context7 viem docs**: `getContract()`, `writeContract()`, `createPublicClient()`, `createWalletClient()`, custom chain
- **Judging Criteria**: 50% participant vote + 50% jury. Focus on Novelty, Innovative Mechanics, Problem-Solving, Learning. Spirit: "celebrate new, innovative ideas"
