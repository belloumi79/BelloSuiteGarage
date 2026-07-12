const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function geminiCompletion(messages: Message[]): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const systemInstruction = systemMsg
    ? { systemInstruction: { parts: [{ text: systemMsg.content }] } }
    : {};

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...systemInstruction,
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new QuotaError('Gemini');
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function groqCompletion(messages: Message[]): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new QuotaError('Groq');
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

class QuotaError extends Error {
  provider: string;
  constructor(provider: string) {
    super(`Quota dépassé pour ${provider}`);
    this.provider = provider;
    this.name = 'QuotaError';
  }
}

export async function aiChat(messages: Message[]): Promise<string> {
  const errors: string[] = [];

  if (GROQ_API_KEY) {
    try {
      return await groqCompletion(messages);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Groq error');
    }
  }

  if (GEMINI_API_KEY) {
    try {
      return await geminiCompletion(messages);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Gemini error');
    }
  }

  if (errors.length === 0) {
    throw new Error('Aucune clé API IA configurée. Ajoutez GROQ_API_KEY (recommandé) ou GEMINI_API_KEY dans votre fichier .env ou les variables d\'environnement Vercel.');
  }

  throw new Error(errors.join(' / '));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function aiChatWithRetry(messages: Message[], retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await aiChat(messages);
    } catch (e) {
      if (e instanceof QuotaError && i < retries) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Tentatives épuisées');
}
