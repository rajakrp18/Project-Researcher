export interface MessagingVerificationResult {
  hasWhatsApp: boolean;
  isBusiness: boolean;
  businessProfileName: string | null;
}

export class MessagingVerificationService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY;
  }

  /**
   * Checks if a phone number is registered on WhatsApp and attempts to fetch
   * its business profile name if it is a WhatsApp Business account.
   */
  async verifyWhatsApp(phone: string): Promise<MessagingVerificationResult> {
    if (!this.apiKey) {
      console.warn('[MessagingVerificationService] No API key configured. Skipping WhatsApp check.');
      return { hasWhatsApp: false, isBusiness: false, businessProfileName: null };
    }

    // Clean phone, ensure it has country code (defaults to +91 for India if exactly 10 digits)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    try {
      return await this.pingWhatsAppApi(cleanPhone);
    } catch (err) {
      console.error(`[MessagingVerificationService] Error verifying ${cleanPhone}:`, err);
      return { hasWhatsApp: false, isBusiness: false, businessProfileName: null };
    }
  }

  private async pingWhatsAppApi(phoneWithCountryCode: string): Promise<MessagingVerificationResult> {
    // TODO: Replace with your chosen vendor (e.g., Green API, UltraMsg, or Official Cloud API)
    // Example for a generic REST API:
    /*
    const response = await fetch(`https://api.yourvendor.com/v1/whatsapp/checkContact`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneWithCountryCode })
    });
    const data = await response.json();
    return {
      hasWhatsApp: data.exists,
      isBusiness: data.isBusiness || false,
      businessProfileName: data.businessName || null
    };
    */
    
    // Placeholder returning false until vendor is configured
    return { hasWhatsApp: false, isBusiness: false, businessProfileName: null };
  }
}
