import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

import * as LocalAuthentication from 'expo-local-authentication';

const toBase64Url = (buf: Buffer) => {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

function buildMockAttestation(credentialIdBuf: Buffer): string {
  const rpIdHash = Buffer.from([0x39, 0x1E, 0x88, 0x62, 0x0A, 0x22, 0x03, 0x75, 0x5E, 0x9B, 0x5F, 0x8D, 0x81, 0x51, 0x80, 0xD0, 0x45, 0x55, 0xF2, 0xAD, 0x37, 0xD6, 0xAB, 0xE3, 0x44, 0x8B, 0x8D, 0x93, 0x1A, 0xF3, 0xA9, 0x6E]);
  const flags = Buffer.from([0x41]);
  const signCount = Buffer.from([0, 0, 0, 0]);
  const aaguid = Buffer.alloc(16, 0);
  
  const credIdLen = Buffer.alloc(2);
  credIdLen.writeUInt16BE(credentialIdBuf.length, 0);
  
  const coseKey = Buffer.from('a5010203262001215820c2f8b9fb292eb8eab69848a718c0a734a4bc2cd4cb1493b5f40e6e21707aa08122582023f0c59e395dc29d4e395e49fb41c811c86e005711d1260fbe0d6f9585251fb8', 'hex');
  
  const authData = Buffer.concat([rpIdHash, flags, signCount, aaguid, credIdLen, credentialIdBuf, coseKey]);
  
  const mapStart = Buffer.from('a3', 'hex');
  const fmtKey = Buffer.from('63666d74', 'hex');
  const fmtVal = Buffer.from('646e6f6e65', 'hex');
  const attStmtKey = Buffer.from('6761747453746d74', 'hex');
  const attStmtVal = Buffer.from('a0', 'hex');
  const authDataKey = Buffer.from('686175746844617461', 'hex');
  
  const authDataLenByte = Buffer.from([0x58, authData.length]);
  const attObj = Buffer.concat([mapStart, fmtKey, fmtVal, attStmtKey, attStmtVal, authDataKey, authDataLenByte, authData]);
  
  return toBase64Url(attObj);
}

export interface Fido2Attestation {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
}

export interface Fido2Assertion {
  id: string;
  rawId: string;
  type: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
}

/**
 * FidoService provides a React Native abstraction for FIDO2/WebAuthn.
 * It simulates secure enclave storage by pairing 'expo-local-authentication' (FaceID/TouchID)
 * with 'expo-secure-store' (Keychain/Keystore).
 */
export class FidoService {
  /**
   * Prompts the user for Biometrics, then creates a bound cryptographic keypair.
   * This is called during the Identity Device Registration phase.
   */
  static async generateKeyAndAttest(devicePermanentId: string, challengeB64Url: string): Promise<Fido2Attestation> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      throw new Error('Biometrics not available or not enrolled on this device.');
    }

    // Force user to accept biometric prompt to provision the key
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to Create Stardomes Passkey',
      disableDeviceFallback: false,
    });

    if (!authResult.success) {
      throw new Error('Biometric authentication failed.');
    }

    // In a native TEE (Passkey), we would use WebAuthn native modules to generate an ECDSA KeyPair.
    // For this wrapper, we emulate the public and private strings securely.
    const mockPublicKey = `pk_fido_${devicePermanentId}_${Date.now()}`;
    const mockPrivateKey = `sk_fido_${devicePermanentId}_${Date.now()}`;
    
    const credentialIdBuf = Buffer.from(`cred_${devicePermanentId}`);
    const mockCredentialId = toBase64Url(credentialIdBuf);
    
    // Store the Private Key strictly inside the mobile secure enclave
    await SecureStore.setItemAsync('STARDOMES_FIDO_PRIVATE_KEY', mockPrivateKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync('STARDOMES_FIDO_CRED_ID', mockCredentialId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return {
      id: mockCredentialId,
      rawId: mockCredentialId,
      type: 'public-key',
      response: {
        attestationObject: buildMockAttestation(credentialIdBuf),
        clientDataJSON: toBase64Url(Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: challengeB64Url })))
      }
    };
  }

  /**
   * Prompts the user for Biometrics and signs the challenge payload.
   * This is called during Bank and Merchant Transaction Approvals.
   */
  static async signChallenge(challengeB64Url: string): Promise<Fido2Assertion> {
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Approve Transaction via Passkey',
      disableDeviceFallback: false,
    });

    if (!authResult.success) {
      throw new Error('User rejected biometric FIDO prompt.');
    }

    // Retrieve private key from the Secure Enclave
    const privateKey = await SecureStore.getItemAsync('STARDOMES_FIDO_PRIVATE_KEY');
    const credentialId = await SecureStore.getItemAsync('STARDOMES_FIDO_CRED_ID');
    if (!privateKey || !credentialId) {
      throw new Error('Device is not bound. No Stardomes FIDO key found.');
    }

    // Emulate a cryptographic signature over the payload utilizing the FIDO private key.
    // In production, this would be an ECDSA SHA-256 signature algorithm.
    const mockSignature = `signed_[${challengeB64Url}]_with_${privateKey.substring(0, 15)}`;

    return {
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      response: {
        signature: toBase64Url(Buffer.from(mockSignature)),
        clientDataJSON: toBase64Url(Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: challengeB64Url, origin: 'app' }))),
        authenticatorData: toBase64Url(Buffer.from('mock_auth_data'))
      }
    };
  }
}
