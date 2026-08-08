import { isAddress } from 'viem'
import type { Address } from 'viem'

const DEFAULT_CREDENTIALS_ADDRESS = '0x079D95b97f062888227D7237AE3a9312C978747D'
const configuredAddress = (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined)?.trim()

export const CREDENTIALS_ADDRESS: Address = (
  configuredAddress && isAddress(configuredAddress) ? configuredAddress : DEFAULT_CREDENTIALS_ADDRESS
) as Address
