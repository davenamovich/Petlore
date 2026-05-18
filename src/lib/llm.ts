export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

export async function callChaosLLM({ messages, temperature = 0.85, max_tokens = 500 }: LLMOptions): Promise<string> {
  const chutesKey = process.env.CHUTES_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!chutesKey && !nvidiaKey) {
    throw new Error('Neither CHUTES_API_KEY nor NVIDIA_API_KEY is configured');
  }

  // 1. Attempt Chutes AI
  if (chutesKey) {
    try {
      const res = await fetch('https://api.chutes.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chutesKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages,
          temperature,
          max_tokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        console.warn(`[callChaosLLM] Chutes AI returned status ${res.status}, falling back to Nvidia NIM`);
      }
    } catch (err) {
      console.warn(`[callChaosLLM] Chutes AI call failed:`, err, `falling back to Nvidia NIM`);
    }
  }

  // 2. Fallback to Nvidia NIM
  if (nvidiaKey) {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Nvidia NIM call failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Nvidia NIM returned empty content');
    }

    return content;
  }

  throw new Error('Failed to get completion from both Chutes AI and Nvidia NIM');
}
