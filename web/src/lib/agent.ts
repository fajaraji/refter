export interface AgentParams {
  holderAddress?: `0x${string}`
  holderName?: string
  credentialType?: string
  title?: string
  period?: string
  credentialId?: number
}

export type AgentIntent = 'issue' | 'verify' | 'list' | 'revoke' | 'check_issuer' | 'register' | 'chat' | 'unknown'

export interface AgentResponse {
  intent: AgentIntent
  params: AgentParams
  message: string
}

const CREDENTIAL_TYPE_MAP: Record<string, string> = {
  'reference letter': 'Reference Letter',
  'employment reference': 'Reference Letter',
  'employment letter': 'Reference Letter',
  certificate: 'Certificate',
  certification: 'Certificate',
  'recommendation letter': 'Recommendation Letter',
}

function extractAddress(input: string): `0x${string}` | undefined {
  const match = input.match(/0x[a-fA-F0-9]{40}/)
  return match?.[0] as `0x${string}` | undefined
}

function extractCredentialId(input: string): number | undefined {
  // Supports "ID 3", "#3", "credential 3", and "id=3" without matching years.
  const match = input.match(/(?:id|#|credential|number|no\.?)\s*[=:]?\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : undefined
}

function extractCredentialType(input: string): string | undefined {
  const key = Object.keys(CREDENTIAL_TYPE_MAP).find((candidate) => input.includes(candidate))
  return key ? CREDENTIAL_TYPE_MAP[key] : undefined
}

function extractName(originalInput: string): string | undefined {
  const patterns = [
    /(?:on behalf of|for|name|holder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
    /(?:reference\s+letter|certificate|recommendation\s+letter|credential)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
    /(?:check|view|show|verify)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
  ]
  const stopwords = new Set(['reference', 'letter', 'certificate', 'recommendation', 'credential', 'mine', 'my', 'id', 'valid'])

  for (const pattern of patterns) {
    const match = originalInput.match(pattern)
    if (!match) continue
    const name = match[1].split(/\s+(?:with|as|from|at|for|valid|authentic|genuine)\b/i)[0].trim()
    const words = name.split(/\s+/)
    if (words.length >= 2 && words.length <= 4 && !stopwords.has(words[0].toLowerCase())) return name
  }
  return undefined
}

function extractTitle(input: string): string | undefined {
  const quoted = input.match(/(?:title)\s*["']([^"']+)["']/i)
  if (quoted) return quoted[1]
  const phrase = input.match(
    /(?:workshop|course|training|bootcamp|seminar|certification|position|as)\s+["']?([^"',.!?]{3,60})["']?/i,
  )
  if (!phrase) return undefined
  const title = phrase[1]
    .trim()
    .replace(/^(?:for|from|at)\b\s*/i, '')
    .split(/\s+(?:for|from|at)\b/i)[0]
    .trim()
  if (/^0x[a-f0-9]{40}$/i.test(title)) return undefined
  return title
}

function extractPeriod(input: string): string | undefined {
  const months = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
  const match = input.match(
    new RegExp(String.raw`(${months})\s+(\d{4})\s*[-–]\s*(${months})\s+(\d{4})`, 'i'),
  )
  if (!match) return undefined
  return `${match[1]} ${match[2]} - ${match[3]} ${match[4]}`
}

export function parseWithPattern(userInput: string): AgentResponse {
  const input = userInput.toLowerCase()

  let intent: AgentIntent = 'unknown'
  if (/(?:credentials?|reference letters?)\s+(?:mine|my|for me)|\bmy credentials\b/.test(input)) intent = 'list'
  else if (/issuer|authoriz/.test(input)) intent = 'check_issuer'
  else if (/register|add\s+holder/.test(input)) intent = 'register'
  else if (/revoke|cancel/.test(input)) intent = 'revoke'
  else if (/issue|create|generate|mint|publish/.test(input)) intent = 'issue'
  else if (/check|verify|valid|authentic|genuine/.test(input)) intent = 'verify'
  else if (/view|show|list|my/.test(input)) intent = 'list'
  else intent = 'chat'

  const params: AgentParams = {
    holderAddress: extractAddress(input),
    holderName: extractName(userInput),
    credentialType: extractCredentialType(input),
    title: extractTitle(input),
    period: extractPeriod(input),
    credentialId: extractCredentialId(input),
  }

  return { intent, params, message: buildResponse(intent, params) }
}

function buildResponse(intent: AgentIntent, params: AgentParams): string {
  switch (intent) {
    case 'issue':
      return `Ready to issue ${params.credentialType ?? 'credential'}${params.title ? ` "${params.title}"` : ''} for ${params.holderName ?? params.holderAddress ?? 'the holder address'}. Confirm the transaction in MetaMask.`
    case 'verify':
      return params.credentialId
        ? `Checking credential #${params.credentialId} on the blockchain...`
        : 'Public verification uses a Credential ID. Example: "check credential ID 1".'
    case 'list':
      return 'Loading credentials for the connected wallet...'
    case 'revoke':
      return params.credentialId
        ? `Ready to revoke credential #${params.credentialId}. Confirm the transaction in MetaMask.`
        : 'Which credential should be revoked? Enter its ID.'
    case 'register':
      return 'Holder registration is not required in the MVP. Enter the holder wallet address when issuing a credential.'
    case 'chat':
      return 'Processing your request...'
    case 'check_issuer':
      return 'Checking issuer status...'
    default:
      return 'Available actions: issue a reference letter, view credentials for the connected wallet, verify a Credential ID, or revoke a credential you issued.'
  }
}
