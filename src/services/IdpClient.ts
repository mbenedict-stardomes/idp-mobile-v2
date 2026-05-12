import { FidoService } from './fido';
import { api } from './api';
import { Buffer } from 'buffer';

/**
 * IdpClient provides a high-level wrapper unifying API interactions and local FIDO Biometric Prompts.
 * This directly implements the OpenId API contracts for User Onboarding and Approval modes.
 */
export class IdpClient {
  /**
   * Complete Identity Initialization: Registers user and immediately binds the device via FIDO
   */
  static async provisionIdentityAndDevice(displayName: string, phone: string, email: string) {
    // 1. Create Identity Core Record in the backend
    const identityResult = await api.registerIdentity({ display_name: displayName, phone, email });

    if (!identityResult || !identityResult.identity_id) {
      throw new Error('Identity generation failed.');
    }

    const devicePermanentId = `DEV_${Math.random().toString(36).substring(2, 12)}`;

    // 2. Generate local Mobile Secure Enclave Keypair utilizing biometrics
    const attestation = await FidoService.generateKeyAndAttest(devicePermanentId);

    // 3. Register and bind the hardware signature parameters to the remote IDP
    const deviceResult = await api.registerDevice({
      identity_id: identityResult.identity_id,
      device_permanent_id: devicePermanentId,
      device_model: 'Stardomes Mobile App Client',
      os_type: 'Mobile',
      os_version: '1.0',
      device_public_key: attestation.publicKey,
      attestation_object: Buffer.from(attestation.attestationObject, 'utf-8').toString('base64'),
      attestation_format: attestation.attestationFormat
    });

    return { identity: identityResult, device: deviceResult };
  }

  /**
   * Complete Bank Transaction Approval Path using FIDO Assurances.
   */
  static async executeBankTransactionApproval(challengeId: string, transactionHash: string) {
    // 1. Verify user presence using Biometrics + retrieve Secure Enclave Private Key
    const fidoAssertion = await FidoService.signChallenge(transactionHash);

    // 2. Send the digitally signed assertion back to the IDP Challenge Resolver
    const result = await api.respondToChallenge(challengeId, {
      action: 'APPROVE',
      // @ts-ignore
      fido2_assertion: fidoAssertion,
      transaction_context: 'BANK_TRANSFER'
    });

    return result;
  }

  /**
   * Complete Merchant Transaction Approval Path using FIDO Assurances.
   */
  static async executeMerchantTransactionApproval(challengeId: string, merchantReference: string) {
    // 1. Verify user presence using Biometrics + retrieve Secure Enclave Private Key
    const fidoAssertion = await FidoService.signChallenge(merchantReference);

    // 2. Send the digitally signed assertion back to the IDP Challenge Resolver
    const result = await api.respondToChallenge(challengeId, {
      action: 'APPROVE',
      // @ts-ignore
      fido2_assertion: fidoAssertion,
      transaction_context: 'MERCHANT_PAYMENT'
    });

    return result;
  }
}
