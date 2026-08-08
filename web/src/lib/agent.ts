export interface AgentParams {
  holderAddress?: `0x${string}`
  credentialType?: string
  title?: string
  credentialId?: number
}

export type AgentIntent = 'issue' | 'verify' | 'list' | 'revoke' | 'check_issuer' | 'unknown'

export interface AgentResponse {
  intent: AgentIntent
  params: AgentParams
  message: string
}

const CREDENTIAL_TYPES = ['sertifikat', 'paklaring', 'surat referensi'] as const

function extractAddress(input: string): `0x${string}` | undefined {
  const m = input.match(/0x[a-fA-F0-9]{40}/)
  return m?.[0] as `0x${string}` | undefined
}

function extractCredentialId(input: string): number | undefined {
  // "ID 3", "#3", "credential 3", "id=3" — avoid matching years in dates
  const m = input.match(/(?:id|#|credential|nomor|no\.?)\s*[=:]?\s*(\d+)/i)
  return m ? parseInt(m[1], 10) : undefined
}

function extractCredentialType(input: string): string | undefined {
  const t = CREDENTIAL_TYPES.find((t) => input.includes(t))
  return t
}

function extractTitle(input: string): string | undefined {
  const quoted = input.match(/(?:judul|title)\s*["']([^"']+)["']/i)
  if (quoted) return quoted[1]
  const phrase = input.match(
    /(?:workshop|kursus|pelatihan|bootcamp|seminar|sertifikasi|posisi)\s+["']?([^"',.!?]{3,60})["']?/i,
  )
  if (!phrase) return undefined
  // Cut at " untuk <address>" boundary so addresses don't leak into titles
  return phrase[1].split(/\s+untuk\b/i)[0].trim()
}

export function parseWithPattern(userInput: string): AgentResponse {
  const input = userInput.toLowerCase()

  let intent: AgentIntent = 'unknown'
  if (/terbit|issue|buat|bikin|terbitkan/.test(input)) intent = 'issue'
  else if (/cek|verif|valid|asli|sah/.test(input)) intent = 'verify'
  else if (/lihat|tampil|list|kredensial|punya|saya/.test(input)) intent = 'list'
  else if (/cabut|tarik|revoke/.test(input)) intent = 'revoke'
  else if (/issuer|authoriz/.test(input)) intent = 'check_issuer'

  const params: AgentParams = {
    holderAddress: extractAddress(input),
    credentialType: extractCredentialType(input),
    title: extractTitle(input),
    credentialId: extractCredentialId(input),
  }

  return { intent, params, message: buildResponse(intent, params) }
}

function buildResponse(intent: AgentIntent, params: AgentParams): string {
  switch (intent) {
    case 'issue':
      return `Siap terbitkan ${params.credentialType ?? 'kredensial'}${params.title ? ` "${params.title}"` : ''} untuk ${params.holderAddress ?? 'alamat pemegang'}. Konfirmasi transaksi di MetaMask ya.`
    case 'verify':
      return params.credentialId
        ? `Mengecek kredensial #${params.credentialId} di blockchain...`
        : 'Kredensial mana yang mau dicek? Sebutkan ID-nya, contoh: "cek credential ID 1"'
    case 'list':
      return 'Menampilkan semua kredensial milik wallet kamu...'
    case 'revoke':
      return params.credentialId
        ? `Siap mencabut kredensial #${params.credentialId}. Konfirmasi transaksi di MetaMask ya.`
        : 'Kredensial mana yang mau dicabut? Sebutkan ID-nya.'
    case 'check_issuer':
      return 'Memeriksa status issuer...'
    default:
      return 'Saya bisa bantu: terbitkan kredensial, cek kevalidan, lihat kredensial kamu, atau cabut kredensial. Coba: "terbitkan sertifikat Workshop Monad 101 untuk 0x...", "cek credential ID 1", "kredensial saya"'
  }
}
