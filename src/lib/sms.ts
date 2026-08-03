// SMS Provider abstraction for Tunisia
// Supports multiple providers: Twilio, local Tunisian providers (SMS.tn, etc.)

export interface SMSProvider {
  send(phone: string, message: string): Promise<boolean>;
}

export interface SMSConfig {
  provider: 'twilio' | 'local' | 'console';
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  local?: {
    apiUrl: string;
    apiKey: string;
    senderId: string;
  };
}

class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: { accountSid: string; authToken: string; fromNumber: string }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
  }

  async send(phone: string, message: string): Promise<boolean> {
    try {
      // Format phone for international (Tunisia +216)
      const formattedPhone = this.formatPhoneForTwilio(phone);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: this.fromNumber,
            Body: message,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return false;
    }
  }

  private formatPhoneForTwilio(phone: string): string {
    // Remove spaces, +, etc.
    const cleaned = phone.replace(/[\s\+]/g, '');
    // If starts with 216, add +
    if (cleaned.startsWith('216')) {
      return `+${cleaned}`;
    }
    // If starts with 0, replace with +216
    if (cleaned.startsWith('0')) {
      return `+216${cleaned.substring(1)}`;
    }
    // Assume it's a local number without country code
    return `+216${cleaned}`;
  }
}

class LocalProvider implements SMSProvider {
  private apiUrl: string;
  private apiKey: string;
  private senderId: string;

  constructor(config: { apiUrl: string; apiKey: string; senderId: string }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async send(phone: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneForLocal(phone);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          from: this.senderId,
          text: message,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Local SMS provider error:', error);
      return false;
    }
  }

  private formatPhoneForLocal(phone: string): string {
    const cleaned = phone.replace(/[\s\+]/g, '');
    if (cleaned.startsWith('216')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      return `216${cleaned.substring(1)}`;
    }
    return `216${cleaned}`;
  }
}

class ConsoleProvider implements SMSProvider {
  async send(phone: string, message: string): Promise<boolean> {
    console.log(`📱 [SMS SIMULATION] To: ${phone}`);
    console.log(`📱 Message: ${message}`);
    return true;
  }
}

function getProvider(): SMSProvider {
  const providerType = (process.env.SMS_PROVIDER || 'console') as 'twilio' | 'local' | 'console';
  
  switch (providerType) {
    case 'twilio':
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
        console.warn('Twilio config missing, falling back to console');
        return new ConsoleProvider();
      }
      return new TwilioProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
      });
    
    case 'local':
      if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY || !process.env.SMS_SENDER_ID) {
        console.warn('Local SMS config missing, falling back to console');
        return new ConsoleProvider();
      }
      return new LocalProvider({
        apiUrl: process.env.SMS_API_URL,
        apiKey: process.env.SMS_API_KEY,
        senderId: process.env.SMS_SENDER_ID,
      });
    
    default:
      return new ConsoleProvider();
  }
}

const provider = getProvider();

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  // Validate phone
  if (!phone || phone.trim().length === 0) {
    console.warn('sendSMS: Empty phone number');
    return false;
  }

  // Truncate message if too long (SMS limit ~160 chars for GSM-7, but we'll allow concatenated)
  if (message.length > 480) { // 3 concatenated SMS max
    message = message.substring(0, 477) + '...';
  }

  try {
    return await provider.send(phone.trim(), message);
  } catch (error) {
    console.error('SMS send failed:', error);
    return false;
  }
}

export function formatTunisiaPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('216')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+216${cleaned.substring(1)}`;
  }
  return `+216${cleaned}`;
}