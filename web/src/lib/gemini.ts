const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are a credential parsing agent for a blockchain credential system. Parse the user's message and return ONLY valid JSON, no markdown, no explanation.

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
- "authorize issuer / status issuer" → intent "check_issuer"
- holderAddress must match 0x + 40 hex chars, else null
- credentialType must be one of: Sertifikat, Paklaring, Surat Referensi, else null
- credentialId: number mentioned with id/credential/nomor context, else null`

export async function parseWithGemini(userInput: string): Promise<{ intent: string; params: Record<string, unknown>; confidence: number } | null> {
  if (!GEMINI_API_KEY) return null
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser message: "${userInput}"` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200 },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null // Silent fail → fallback to pattern matching
  }
}
