// The MVP keeps parsing local so no API key is exposed in the browser bundle.
// A server-side Gemini proxy can be added later without changing the contract flow.

function localAnswer(userInput: string, account?: string): string | null {
  const query = userInput.toLowerCase().trim()

  if (/^who\s+am\s+i|^what\s+is\s+my\s+wallet/i.test(query)) {
    if (account) {
      return `Your connected wallet is:\n\n${account}\n\nYou can view its roles in the Roles tab. It can issue credentials only if the contract owner has authorized it.`
    }
    return 'You are currently a public verifier. Connect a wallet to view credentials for that wallet or request issuer access.'
  }

  if (/what\s+is\s+monad|explain\s+monad|about\s+monad/i.test(query)) {
    return 'Monad is the EVM blockchain used by RefPer to store credentials transparently. RefPer currently runs on Monad Testnet.'
  }

  if (/what\s+is\s+blockchain|explain\s+blockchain/i.test(query)) {
    return 'A blockchain is a public ledger that records transactions and contract data. RefPer reads credentials directly from the smart contract without an application database.'
  }

  if (/what\s+is\s+(?:a\s+)?reference\s+letter|explain\s+(?:a\s+)?reference\s+letter/i.test(query)) {
    return 'A reference letter is an employment record issued by an organization to a holder. In the MVP, a credential stores its type, title, issuer, holder, issue time, and active status.'
  }

  if (/what\s+is\s+refper|explain\s+refper|about\s+refper/i.test(query)) {
    return 'RefPer is a credential issuance and verification application on Monad. The owner manages issuers, issuers create credentials, holders receive them, and verifiers check them by ID.'
  }

  if (/^hello|^hi|^hey|^good\s+(?:morning|afternoon|evening)/i.test(query)) {
    return 'Hello! Use Issue Reference Letter for an issuer, My Credentials for a holder, or Verify to check someone else\'s credential by ID.'
  }

  if (/thank\s+you|thanks/i.test(query)) {
    return 'You are welcome. You can inspect the wallet roles in the Roles tab.'
  }

  return null
}

// Kept as a stable interface for the parser. The MVP intentionally makes no
// browser-to-Gemini request because VITE_* values are public at runtime.
export async function parseWithGemini(_userInput: string): Promise<{ intent: string; params: Record<string, unknown>; confidence: number } | null> {
  return null
}

export async function chatWithGemini(userInput: string, account?: string): Promise<string> {
  return localAnswer(userInput, account)
    ?? 'Available actions: issue a reference letter to a holder wallet, view credentials for the connected wallet, verify someone else\'s credential by ID, or revoke a credential you issued.'
}
