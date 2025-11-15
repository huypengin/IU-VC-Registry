declare module 'multiformats/bases/base58' {
  export const base58btc: {
    encode(bytes: Uint8Array): string;
    decode(s: string): Uint8Array;
  };
}

