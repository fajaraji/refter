export function walletAddressError(value: string, required = false): string | null {
  const address = value.trim()
  if (!address) return required ? 'Wallet address is required.' : null
  if (!address.startsWith('0x')) return 'The address must start with 0x.'
  if (address.length !== 42) return 'The address must contain exactly 40 characters after 0x.'
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return 'After 0x, use only hexadecimal characters: 0-9 and a-f.'
  return null
}
