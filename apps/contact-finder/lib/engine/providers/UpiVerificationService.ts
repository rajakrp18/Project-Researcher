export interface UpiVerificationResult {
  isValid: boolean;
  registeredName: string | null;
  vpaChecked: string;
}

export class UpiVerificationService {
  private apiKey: string | undefined;
  
  // A common list of high-success UPI handles in India
  private commonHandles = ['paytm', 'ybl', 'okicici', 'oksbi', 'okhdfcbank', 'axl'];

  constructor() {
    this.apiKey = process.env.UPI_VERIFICATION_API_KEY;
  }

  /**
   * Attempts to verify a phone number by pinging common UPI handles.
   * Returns the registered bank account name if successful.
   */
  async verifyPhone(phone: string): Promise<UpiVerificationResult> {
    if (!this.apiKey) {
      console.warn('[UpiVerificationService] No API key configured. Skipping UPI check.');
      return { isValid: false, registeredName: null, vpaChecked: '' };
    }

    // Clean phone to ensure 10 digits
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return { isValid: false, registeredName: null, vpaChecked: '' };
    }

    // Try handles until we get a hit (to save API costs, maybe just try one or two most common)
    for (const handle of this.commonHandles.slice(0, 2)) {
      const vpa = `${cleanPhone}@${handle}`;
      try {
        const result = await this.pingUpiApi(vpa);
        if (result.isValid && result.registeredName) {
          return result;
        }
      } catch (err) {
        console.error(`[UpiVerificationService] Error verifying ${vpa}:`, err);
      }
    }

    return { isValid: false, registeredName: null, vpaChecked: '' };
  }

  private async pingUpiApi(vpa: string): Promise<UpiVerificationResult> {
    // TODO: Replace with your chosen vendor (e.g., Setu, Razorpay, Signzy)
    // Example for a generic REST API:
    /*
    const response = await fetch('https://api.yourvendor.com/v1/upi/verify', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vpa })
    });
    const data = await response.json();
    return {
      isValid: data.success,
      registeredName: data.name || null,
      vpaChecked: vpa
    };
    */
    
    // Placeholder returning false until vendor is configured
    return { isValid: false, registeredName: null, vpaChecked: vpa };
  }
}
