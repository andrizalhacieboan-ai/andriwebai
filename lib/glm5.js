import axios from 'axios';
import crypto from 'crypto';

const USER_AGENT = 'Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0';
const BASE_URL = 'https://chat.z.ai';
const RUM_URL = 'https://j2c03hoppk-default-cn.rum.aliyuncs.com/';
const BEARER_TOKEN = process.env.GLM5_TOKEN || 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFlYWVjNWI4LTg1YmEtNDNhOC1iM2Q3LTQ5ZDBiYzcwYjcyOCIsImVtYWlsIjoiYW5kcml6YWxoYWNpZWJvYW5AZ21haWwuY29tIn0.soo6rkMQJo_2wWAwgD9RR0IFZSLJgV213bw5HY1kp9yjv1hRs1jgzrKsUNrp0QxYHFjsGJtZ1OMyZlDeF34xlg';

function extractUserIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded.id;
  } catch (e) {
    return null;
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildSignatureUrlParams(token, user_id, chatId) {
  const timestamp = Date.now();
  const requestId = generateUUID();
  const encodedUA = encodeURIComponent(USER_AGENT);
  const currentUrl = `${BASE_URL}/c/${chatId}`;
  const pathname = `/c/${chatId}`;
  const encodedTitle = encodeURIComponent('Z.ai - Free AI Chatbot & Agent powered by GLM-5.1 & GLM-5');
  const now = new Date();
  const localTime = now.toISOString().replace('Z', '');
  const utcTime = now.toUTCString();
  const timezoneOffset = -now.getTimezoneOffset();
  return `timestamp=${timestamp}&requestId=${requestId}&user_id=${user_id}&version=0.0.1&platform=web&token=${token}&user_agent=${encodedUA}&language=id-ID&languages=id-ID&timezone=Asia/Jakarta&cookie_enabled=true&screen_width=396&screen_height=893&screen_resolution=396x893&viewport_height=752&viewport_width=396&viewport_size=396x752&color_depth=24&pixel_ratio=2.727272727272727&current_url=${encodeURIComponent(currentUrl)}&pathname=${encodeURIComponent(pathname)}&search=&hash=&host=chat.z.ai&hostname=chat.z.ai&protocol=https:&referrer=&title=${encodedTitle}&timezone_offset=${timezoneOffset}&local_time=${encodeURIComponent(localTime)}&utc_time=${encodeURIComponent(utcTime)}&is_mobile=true&is_touch=true&max_touch_points=5&browser_name=Firefox&os_name=Android&signature_timestamp=${timestamp}`;
}

function calculateSignature(signatureTimestamp) {
  return crypto.createHash('sha256').update(String(signatureTimestamp)).digest('hex');
}

async function sendTelemetry() {
  const rumPayload = {
    app: { id: "j2c03hoppk@9a8be198b65ba4b", env: "prod", type: "browser" },
    user: { id: `uid_${Math.random().toString(36).substring(2, 15)}`, name: generateUUID() },
    session: { id: crypto.randomBytes(16).toString('hex') },
    net: { model: "" },
    view: { id: generateUUID(), loading_type: "route_change", name: "/" },
    events: [],
    _retry: 0,
    _v: "cdn-0.1.8"
  };
  await axios.post(RUM_URL, rumPayload, {
    headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT, 'Referer': `${BASE_URL}/` },
    timeout: 5000,
  }).catch(() => {});
}

export default async function glm5(prompt) {
  if (!BEARER_TOKEN) {
    throw new Error('GLM5_TOKEN belum diatur');
  }

  const token = BEARER_TOKEN;
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    throw new Error('Format token tidak valid');
  }

  await sendTelemetry();

  const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US',
    'authorization': `Bearer ${token}`,
    'User-Agent': USER_AGENT,
  };

  const chatId = generateUUID();
  const userMessageId = generateUUID();
  const currentTimestamp = Date.now();

  const newChatPayload = {
    chat: {
      id: "",
      title: "New Chat",
      models: ["GLM-5-Turbo"],
      params: {},
      history: {
        messages: {
          [userMessageId]: {
            id: userMessageId,
            parentId: null,
            childrenIds: [],
            role: "user",
            content: prompt,
            timestamp: Math.floor(currentTimestamp / 1000),
            models: ["GLM-5-Turbo"]
          }
        },
        currentId: userMessageId
      },
      tags: [],
      flags: [],
      features: [{ type: "tool_selector", server: "tool_selector_h", status: "hidden" }],
      mcp_servers: [],
      enable_thinking: true,
      auto_web_search: false,
      message_version: 1,
      extra: {},
      timestamp: currentTimestamp,
      type: "default"
    }
  };

  try {
    await axios.post(`${BASE_URL}/api/v1/chats/new`, newChatPayload, {
      headers: { ...authHeaders, 'Referer': `${BASE_URL}/c/${chatId}` },
      timeout: 15000,
    });
  } catch (e) {
    if (e.response && e.response.status === 401) {
      throw new Error('Token sudah kadaluarsa atau tidak valid');
    }
    throw new Error('Gagal membuat chat baru: ' + (e.response?.data?.message || e.message));
  }

  await delay(1000);

  const signatureTimestamp = Date.now();
  const queryString = buildSignatureUrlParams(token, userId, chatId);
  const signature = calculateSignature(signatureTimestamp);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const fullDateTime = `${dateStr} ${timeStr}`;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = days[now.getDay()];

  const completionPayload = {
    stream: true,
    model: "GLM-5-Turbo",
    messages: [{ role: "user", content: prompt }],
    signature_prompt: prompt,
    params: {},
    extra: {},
    features: {
      image_generation: false,
      web_search: false,
      auto_web_search: false,
      preview_mode: true,
      flags: [],
      vlm_tools_enable: false,
      vlm_web_search_enable: false,
      vlm_website_mode: false,
      enable_thinking: true
    },
    variables: {
      "{{USER_NAME}}": "ANDRIZAL",
      "{{USER_LOCATION}}": "Unknown",
      "{{CURRENT_DATETIME}}": fullDateTime,
      "{{CURRENT_DATE}}": dateStr,
      "{{CURRENT_TIME}}": timeStr,
      "{{CURRENT_WEEKDAY}}": weekday,
      "{{CURRENT_TIMEZONE}}": "Asia/Jakarta",
      "{{USER_LANGUAGE}}": "en-US"
    },
    chat_id: chatId,
    id: generateUUID(),
    current_user_message_id: userMessageId,
    current_user_message_parent_id: null,
    background_tasks: {
      title_generation: true,
      tags_generation: true
    }
  };

  const res = await fetch(
    `${BASE_URL}/api/v2/chat/completions?${queryString}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US',
        'X-FE-Version': 'prod-fe-1.1.22',
        'X-Signature': signature,
        'User-Agent': USER_AGENT,
        'Referer': `${BASE_URL}/c/${chatId}`,
      },
      body: JSON.stringify(completionPayload),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.substring(0, 200)}`);
  }

  const rawText = await res.text();

  if (!rawText.trim()) {
    throw new Error('Server mengembalikan body kosong');
  }

  let fullText = '';
  let reasoningText = '';

  const lines = rawText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) continue;
    const jsonStr = trimmed.substring(6);
    if (jsonStr === '[DONE]' || jsonStr === '"[DONE]"') continue;

    try {
      const parsed = JSON.parse(jsonStr);

      if (parsed.data && typeof parsed.data === 'object' && parsed.data !== null) {
        if (parsed.data.error && parsed.data.error.code) {
          throw new Error(parsed.data.error.detail || parsed.data.error.code);
        }
        if (typeof parsed.data.content === 'string' && parsed.data.content) {
          fullText += parsed.data.content;
        }
        if (typeof parsed.data.reasoning_content === 'string' && parsed.data.reasoning_content) {
          reasoningText += parsed.data.reasoning_content;
        }
      }
      
      if (!parsed.data && parsed.choices) {
        const choice = parsed.choices[0];
        if (choice) {
          const delta = choice.delta || choice.message || {};
          if (typeof delta.content === 'string' && delta.content) fullText += delta.content;
          if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) reasoningText += delta.reasoning_content;
        }
      }
      
      if (typeof parsed.text === 'string' && parsed.text) fullText += parsed.text;
      if (typeof parsed.content === 'string' && parsed.content) fullText += parsed.content;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }

  if (!fullText.trim() && reasoningText.trim()) {
    fullText = reasoningText;
  }

  if (!fullText.trim()) {
    throw new Error('Server tidak mengembalikan teks respons');
  }

  return fullText.trim();
}
