import { base58btc } from 'multiformats/bases/base58';

export function publickeyToMultibase(rawPub: Uint8Array): string {
    const ed25519Prefix = new Uint8Array([0xED, 0x01]);
    const multicodecPub = new Uint8Array(ed25519Prefix.length + rawPub.length);
    multicodecPub.set(ed25519Prefix, 0);
    multicodecPub.set(rawPub, ed25519Prefix.length);

    return base58btc.encode(multicodecPub);
}

export function privatekeyToMultibase(rawPriv: Uint8Array, rawPub: Uint8Array): string {
    const ed25519PrivPrefix = new Uint8Array([0x80, 0x26]);
    const combined = new Uint8Array(ed25519PrivPrefix.length + rawPriv.length + rawPub.length);
    combined.set(ed25519PrivPrefix, 0);
    combined.set(rawPriv, ed25519PrivPrefix.length);
    combined.set(rawPub, ed25519PrivPrefix.length + rawPriv.length);
    
    return base58btc.encode(combined);
}