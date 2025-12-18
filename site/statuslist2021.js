// Default capacity: 2048 bits = 2048 credentials (e.g. one per student)
const DEFAULT_BIT_COUNT = 2048;

function zeroBitstringBase64(bitCount) {
  const byteLength = Math.ceil(bitCount / 8); // 2048 bits = 256 bytes
  const bytes = new Uint8Array(byteLength); // all zeros
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function createEmptyStatusList({
  statusPurpose = 'revocation',
  bitCount = DEFAULT_BIT_COUNT
} = {}) {
  return {
    '@context': 'https://w3id.org/vc/status-list/2021/v1',
    type: 'StatusList2021',
    statusPurpose,
    bitCount,
    encodedList: zeroBitstringBase64(bitCount)
  };
}

export const defaultStatusList = createEmptyStatusList();

if (typeof window !== 'undefined') {
  window.StatusList2021 = { createEmptyStatusList, defaultStatusList };
}
