// WhatsApp Business API integration for Tunisia
// Uses Meta WhatsApp Business API (Cloud API or On-premise)

export interface WhatsAppConfig {
  provider: 'meta-cloud' | 'twilio' | 'local' | 'console';
  metaCloud?: {
    accessToken: string;
    phoneNumberId: string;
    version?: string; // e.g., 'v18.0'
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    fromNumber: string; // whatsapp:+14155238886
  };
  local?: {
    apiUrl: string;
    apiKey: string;
  };
}

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string; policy: 'deterministic' };
    components?: Array<{
      type: 'body' | 'header' | 'button';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

class MetaCloudProvider {
  private accessToken: string;
  private phoneNumberId: string;
  private version: string;
  private baseUrl: string;

  constructor(config: { accessToken: string; phoneNumberId: string; version?: string }) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.version = config.version || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
  }

  async send(message: WhatsAppMessage): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.to,
            type: message.type,
            ...(message.type === 'text' ? { text: message.text } : { template: message.template }),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('WhatsApp Meta API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('WhatsApp Meta Cloud send error:', error);
      return false;
    }
  }
}

class TwilioWhatsAppProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: { accountSid: string; authToken: string; fromNumber: string }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
  }

  async send(message: WhatsAppMessage): Promise<boolean> {
    try {
      const to = `whatsapp:${this.formatPhone(message.to)}`;
      const from = this.fromNumber.startsWith('whatsapp:') ? this.fromNumber : `whatsapp:${this.fromNumber}`;

      const body = new URLSearchParams({
        To: to,
        From: from,
      });

      if (message.type === 'text' && message.text) {
        body.append('Body', message.text.body);
      } else if (message.type === 'template' && message.template) {
        body.append('ContentSid', message.template.name); // Twilio Content SID for templates
        // Add template variables if needed
        if (message.template.components) {
          message.template.components.forEach((comp, i) => {
            comp.parameters.forEach((param, j) => {
              body.append(`ContentVariables[${i}][${j}]`, param.text);
            });
          });
        }
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Twilio WhatsApp send error:', error);
      return false;
    }
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\+]/g, '');
    if (cleaned.startsWith('216')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
      return `+216${cleaned.substring(1)}`;
    }
    return `+216${cleaned}`;
  }
}

class ConsoleWhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<boolean> {
    console.log(`💬 [WhatsApp SIMULATION] To: ${message.to}`);
    console.log(`💬 Type: ${message.type}`);
    if (message.type === 'text' && message.text) {
      console.log(`💬 Message: ${message.text.body}`);
    } else if (message.type === 'template' && message.template) {
      console.log(`💬 Template: ${message.template.name} (${message.template.language.code})`);
    }
    return true;
  }
}

function getWhatsAppProvider() {
  const providerType = (process.env.WHATSAPP_PROVIDER || 'console') as 'meta-cloud' | 'twilio' | 'local' | 'console';
  
  switch (providerType) {
    case 'meta-cloud':
      if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        console.warn('WhatsApp Meta Cloud config missing, falling back to console');
        return new ConsoleWhatsAppProvider();
      }
      return new MetaCloudProvider({
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        version: process.env.WHATSAPP_API_VERSION,
      });
    
    case 'twilio':
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
        console.warn('Twilio WhatsApp config missing, falling back to console');
        return new ConsoleWhatsAppProvider();
      }
      return new TwilioWhatsAppProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_WHATSAPP_FROM,
      });
    
    default:
      return new ConsoleWhatsAppProvider();
  }
}

const whatsappProvider = getWhatsAppProvider();

export interface WhatsAppMessageOptions {
  to: string;
  body: string;
  templateName?: string;
  templateParams?: string[];
}

export async function sendWhatsApp(
  phone: string, 
  message: string,
  options?: { templateName?: string; templateParams?: string[] }
): Promise<boolean> {
  // Validate phone
  if (!phone || phone.trim().length === 0) {
    console.warn('sendWhatsApp: Empty phone number');
    return false;
  }

  const formattedPhone = formatPhoneForWhatsApp(phone.trim());
  
  let waMessage: WhatsAppMessage;
  
  if (options?.templateName) {
    // Template message (requires pre-approved template)
    waMessage = {
      to: formattedPhone,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: 'fr', policy: 'deterministic' }, // French for Tunisia
        components: options.templateParams ? [{
          type: 'body',
          parameters: options.templateParams.map(text => ({ type: 'text', text })),
        }] : [],
      },
    };
  } else {
    // Free-form text message (only works within 24h customer care window)
    waMessage = {
      to: formattedPhone,
      type: 'text',
      text: { body: message },
    };
  }

  try {
    return await whatsappProvider.send(waMessage);
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return false;
  }
}

function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[\s\+\-\(\)]/g, '');
  if (cleaned.startsWith('216')) {
    return cleaned; // Meta API expects without +
  }
  if (cleaned.startsWith('0')) {
    return `216${cleaned.substring(1)}`;
  }
  return `216${cleaned}`;
}

// Pre-defined template names for common use cases in Tunisia
export const WHATSAPP_TEMPLATES = {
  SERVICE_REMINDER: 'service_reminder_fr', // "Bonjour {{1}}, votre {{2}} approche de sa révision..."
  APPOINTMENT_CONFIRMATION: 'appointment_confirm_fr',
  APPOINTMENT_REMINDER: 'appointment_reminder_fr',
  VEHICLE_READY: 'vehicle_ready_fr',
  PAYMENT_REMINDER: 'payment_reminder_fr',
  WELCOME: 'welcome_fr',
} as const;

// Helper to send service reminder using template
export async function sendServiceReminderWhatsApp(
  phone: string,
  clientName: string,
  vehicleLabel: string,
  garageName: string,
  dueReason: string
): Promise<boolean> {
  return sendWhatsApp(phone, '', {
    templateName: WHATSAPP_TEMPLATES.SERVICE_REMINDER,
    templateParams: [clientName, vehicleLabel, dueReason, garageName],
  });
}

// Helper to send appointment confirmation
export async function sendAppointmentConfirmationWhatsApp(
  phone: string,
  clientName: string,
  dateTime: string,
  garageName: string,
  address: string
): Promise<boolean> {
  return sendWhatsApp(phone, '', {
    templateName: WHATSAPP_TEMPLATES.APPOINTMENT_CONFIRMATION,
    templateParams: [clientName, dateTime, garageName, address],
  });
}