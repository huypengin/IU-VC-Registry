// node >=18
import { base58btc } from 'multiformats/bases/base58';

// ed25519 public key raw 32 bytes (Uint8Array) from your PEM/SSH key
export function publickeyToMultibase(rawPub: Uint8Array): string {
    const ed25519Prefix = new Uint8Array([0xED, 0x01]); // multicodec ed25519-pub
    const multicodecPub = new Uint8Array(ed25519Prefix.length + rawPub.length);
    multicodecPub.set(ed25519Prefix, 0);
    multicodecPub.set(rawPub, ed25519Prefix.length);

    // multibase (base58btc) with leading 'z'
    return base58btc.encode(multicodecPub); // e.g., "z6Mki..."
}