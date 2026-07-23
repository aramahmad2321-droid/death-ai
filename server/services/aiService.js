/**
 * Zana AI — AI Service
 * ====================================
 * Handles all AI API calls with streaming support,
 * Zana's unique personality, and multi-language awareness.
 */

'use strict';

const OpenAI = require('openai');
const ApiLog = require('../models/ApiLog');

// ─── OpenAI client (works with any compatible API) ────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
  baseURL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  timeout: 60000,
  maxRetries: 2,
  defaultHeaders: {
    'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
    'X-Title': 'Death AI',
  },
});

// ─── Death AI Personality & System Prompt ──────────────────────────────────────
const DEATH_AI_SYSTEM_PROMPT = `You are Death AI (دەس ئەی ئای / Death AI), a powerful, highly intelligent, and culturally aware AI assistant.

## CRITICAL LANGUAGE INSTRUCTION - KURDISH SORANI FIRST
- **PRIMARY LANGUAGE: Kurdish Sorani (کوردی سۆرانی)**.
- UNLESS the user explicitly asks to speak in another language, ALWAYS respond in fluent, authentic, natural Kurdish Sorani (کوردی سۆرانی).
- Use standard Kurdish Sorani alphabet (ک، گ، ۆ، ێ، ڕ، ڵ، ڤ، پ، چ، ژ) and accurate Sorani grammar.
- Help users learn, speak, write, and understand Kurdish Sorani whenever they ask. Explain words, grammar, and sentences in clear Kurdish Sorani.

## Your Identity
- Name: Death AI
- Created by: Death AI Platform
- Personality: Extremely smart, helpful, warm, precise, and fluent in Kurdish Sorani.
- You are uniquely Death AI. Do NOT mention OpenAI, ChatGPT, Claude, Gemini, or any other assistant.

## Your Capabilities
- Answering all questions accurately in Kurdish Sorani
- Teaching Kurdish Sorani language, vocabulary, grammar, and conversation
- Translating between Kurdish Sorani (کوردی سۆرانی), Arabic, and English
- Explaining programming code, math problems, writing essays, and emails
- Writing creative stories, poetry, and summaries

## Response Style
- Respond in clear, rich Kurdish Sorani by default
- Use proper Markdown formatting (headers, bullet points, code blocks)
- Be polite, encouraging, and highly intelligent

Remember: You are Death AI — knowledgeable, fluent in Kurdish Sorani, and always ready to help!`;

const getLanguageHint = (language) => {
  if (language === 'en') return 'The user explicitly selected English. Respond in English.';
  if (language === 'ar') return 'The user explicitly selected Arabic. Respond in Arabic.';
  return 'The user language is Kurdish Sorani. Respond strictly in natural, fluent Kurdish Sorani (کوردی سۆرانی).';
};

// ─── Active requests store (for stop-generation feature) ──────────────────────
const activeRequests = new Map();

/**
 * Stream AI response via Server-Sent Events.
 *
 * @param {Object} options
 * @param {Array}  options.messages - Chat history [{role, content}]
 * @param {string} options.model    - Model identifier
 * @param {string} options.language - User language preference
 * @param {string} options.userId   - User ID for logging
 * @param {string} options.requestId - Unique request ID for abort support
 * @param {Object} options.res      - Express response object
 */
const streamResponse = async ({ messages, model, language, userId, requestId, res }) => {
  const startTime = Date.now();
  const modelToUse = process.env.OPENAI_MODEL || 'openrouter/auto';

  // Build message array with system prompt
  const systemContent = [
    DEATH_AI_SYSTEM_PROMPT,
    getLanguageHint(language),
  ].filter(Boolean).join('\n\n');

  const fullMessages = [
    { role: 'system', content: systemContent },
    ...messages.slice(-30), // Keep last 30 messages for context
  ];

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Create abort controller
  const controller = new AbortController();
  if (requestId) activeRequests.set(requestId, controller);

  let totalContent = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let status = 'success';
  let errorMessage = null;

  try {
    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: fullMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    }, { signal: controller.signal });

    // Send start event
    res.write(`data: ${JSON.stringify({ type: 'start', requestId })}\n\n`);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        totalContent += delta;
        res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
      }

      // Capture usage if provided
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    }

    // Send completion event
    const totalTokens = promptTokens + completionTokens;
    res.write(`data: ${JSON.stringify({
      type: 'done',
      content: totalContent,
      tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
      model: modelToUse,
    })}\n\n`);
    res.end();

  } catch (error) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      // User stopped generation — send what we have
      res.write(`data: ${JSON.stringify({ type: 'stopped', content: totalContent })}\n\n`);
      res.end();
      status = 'success'; // Not an error
    } else {
      status = 'error';
      errorMessage = error.message;
      console.error('[AI Service] Error:', error.message);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Zana encountered an issue. Please try again.',
      })}\n\n`);
      res.end();
    }
  } finally {
    if (requestId) activeRequests.delete(requestId);

    // Log API usage
    ApiLog.create({
      userId: userId || null,
      endpoint: '/api/ai/generate',
      method: 'POST',
      model: modelToUse,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs: Date.now() - startTime,
      status,
      errorMessage,
    }).catch(console.error);
  }

  return totalContent;
};

/**
 * Stop an active streaming request.
 */
const stopGeneration = (requestId) => {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    return true;
  }
  return false;
};

/**
 * Generate a short title for a chat from the first message.
 */
const generateChatTitle = async (firstMessage) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a very short title (max 6 words) for a chat conversation that starts with the following message. Return ONLY the title, no quotes or punctuation.',
        },
        { role: 'user', content: firstMessage.slice(0, 500) },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });
    return response.choices[0]?.message?.content?.trim() || 'New Conversation';
  } catch {
    return 'New Conversation';
  }
};

module.exports = { streamResponse, stopGeneration, generateChatTitle };
