import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';

const router = Router();

const SYSTEM_PROMPT = `You are a compassionate and supportive AI assistant for Mindful Heaven, a mental health support platform. Your role is to:

1. Provide empathetic, non-judgmental support to users discussing mental health topics
2. Suggest coping strategies, relaxation techniques, and self-care practices
3. Recommend relevant mental health resources when appropriate
4. Recognize signs of crisis and immediately redirect users to professional help

IMPORTANT GUIDELINES:
- Never diagnose mental health conditions
- Never prescribe or recommend specific medications
- Always encourage users to seek professional help for serious concerns
- Be warm, supportive, and understanding
- Validate users' feelings and experiences
- If a user mentions self-harm, suicide, or immediate danger, immediately provide crisis hotline information:
  * India: iCall (9152987821), Vandrevala Foundation (1860-2662-345)
  * International: Your local emergency services

Remember: You are a supportive companion, not a replacement for professional mental health care.`;

router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({
    messages: z.array(
      z.object({ role: z.enum(['user', 'assistant']), content: z.string() })
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured. Please add OPENROUTER_API_KEY in your .env file.' });
  }

  const upstream = await fetch(
    `https://openrouter.ai/api/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Mindful Heaven'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...parsed.data.messages
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.8,
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.json().catch(() => ({} as any));
    const status = upstream.status;
    console.error('OpenRouter gateway error:', status, errorBody);
    return res.status(status).json({ error: errorBody?.error?.message || 'AI service temporarily unavailable.' });
  }

  // Stream back in OpenAI-compatible SSE format so the frontend needs no changes
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = upstream.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch (err) {
    console.error('OpenRouter stream pipe error:', err);
  } finally {
    res.end();
  }
});

export default router;
