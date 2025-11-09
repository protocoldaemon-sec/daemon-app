/**
 * Utility functions for wallet address formatting and display
 */

/**
 * Truncates a wallet address to show first and last characters with ellipsis
 * @param address - The full wallet address
 * @param startChars - Number of characters to show at the start (default: 6)
 * @param endChars - Number of characters to show at the end (default: 4)
 * @returns Truncated address string
 */
export function truncateAddress(
  address: string | null | undefined,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || typeof address !== 'string') return "wallet_address";

  if (address.length <= startChars + endChars) {
    return address;
  }

  const start = address.substring(0, startChars);
  const end = address.substring(address.length - endChars);
  return `${start}...${end}`;
}

/**
 * Smart truncation based on container width and font size
 * For mobile sidebar with max-w-xs (320px), shows more characters
 * @param address - The full wallet address
 * @param containerWidth - Width of the container (default: 'mobile') 
 * @returns Truncated address string optimized for container
 */
export function smartTruncateAddress(
  address: string | null | undefined,
  containerWidth: 'mobile' | 'desktop' | 'small' = 'mobile'
): string {
  if (!address || typeof address !== 'string') return "wallet_address";

  // Define truncation patterns based on container size
  const patterns = {
    mobile: { start: 12, end: 8 },   // For max-w-xs mobile sidebar
    desktop: { start: 8, end: 6 },   // For smaller desktop contexts
    small: { start: 6, end: 4 }      // For very small containers
  };

  const { start, end } = patterns[containerWidth];
  return truncateAddress(address, start, end);
}

/**
 * Formats wallet address for different display contexts
 */
export const walletFormats = {
  // Short format: 2ReLle...EW2
  short: (address: string | null) => truncateAddress(address, 6, 4),
  
  // Medium format: 2ReLleDm...EW2
  medium: (address: string | null) => truncateAddress(address, 8, 4),
  
  // Long format: 2ReLleDm2kh...EW2
  long: (address: string | null) => truncateAddress(address, 10, 4),
  
  // Copy format: Full address for copying
  full: (address: string | null) => address || "",
};

/**
 * Validates if a string looks like a valid wallet address
 * @param address - Address to validate
 * @returns Boolean indicating if address appears valid
 */
export function isValidAddress(address: string | null): boolean {
  if (!address) return false;
  
  // Basic validation for Solana addresses (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Gets wallet type from localStorage
 */
export function getWalletType(): string | null {
  return localStorage.getItem('wallet_type');
}

/**
 * Gets wallet address from localStorage
 */
export function getWalletAddress(): string | null {
  return localStorage.getItem('wallet_address');
}

/**
 * Checks if user has a connected wallet
 */
export function isWalletConnected(): boolean {
  const address = getWalletAddress();
  const type = getWalletType();
  return !!(address && type);
}
