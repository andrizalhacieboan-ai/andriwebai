import axios from 'axios';
import crypto from 'crypto';

const USER_AGENT = 'Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0';
const BASE_URL = 'https://chat.z.ai';
const RUM_URL = 'https://j2c03hoppk-default-cn.rum.aliyuncs.com/';
const BEARER_TOKEN = '"eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFlYWVjNWI4LTg1YmEtNDNhOC1iM2Q3LTQ5ZDBiYzcwYjcyOCIsImVtYWlsIjoiYW5kcml6YWxoYWNpZWJvYW5AZ21haWwuY29tIn0.DN1NITSaL0SvpEIfznaI8bnSvc8OJuIJDlR1odG3nfz6sGHL_S_e-kX_2696QQmCLt9ef4Dm4EcdtA6mv0vEkQ"';

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

function buildSignatureUrlParams(token, user_id, chatId) {
  const timestamp = Date.now();
  const requestId = generateUUID();
  const encodedUA = encodeURIComponent(USER_AGENT);
  const currentUrl = `${BASE_URL}/c/${chatId}`;
  const pathname = `/c/${chatId}`;
  const encodedTitle = encodeURIComponent('Z.ai - Free AI Chatbot & Agent powered by GLM-5.1 & GLM-5');
  const now = new Date();
  const isoTime = now.toISOString();
  const localTime = isoTime.replace('Z', '');
  const utcTime = now.toUTCString();
  const offset = now.getTimezoneOffset();
  const timezoneOffset = -offset;
  return `timestamp=${timestamp}&requestId=${requestId}&user_id=${user_id}&version=0.0.1&platform=web&token=${token}&user_agent=${encodedUA}&language=id-ID&languages=id-ID&timezone=Asia/Jakarta&cookie_enabled=true&screen_width=396&screen_height=893&screen_resolution=396x893&viewport_height=752&viewport_width=396&viewport_size=396x752&color_depth=24&pixel_ratio=2.727272727272727&current_url=${encodeURIComponent(currentUrl)}&pathname=${encodeURIComponent(pathname)}&search=&hash=&host=chat.z.ai&hostname=chat.z.ai&protocol=https:&referrer=&title=${encodedTitle}&timezone_offset=${timezoneOffset}&local_time=${encodeURIComponent(localTime)}&utc_time=${encodeURIComponent(utcTime)}&is_mobile=true&is_touch=true&max_touch_points=5&browser_name=Firefox&os_name=Android&signature_timestamp=${timestamp}`;
}

function calculateSignature(signatureTimestamp) {
  return crypto.createHash('sha256').update(String(signatureTimestamp)).digest('hex');
}

async function sendTelemetry() {
  const rumPayload = {
    app: {
      id: "j2c03hoppk@9a8be198b65ba4b",
      env: "prod",
      type: "browser"
    },
    user: {
      id: `uid_${Math.random().toString(36).substring(2, 15)}`,
      name: generateUUID()
    },
    session: {
      id: crypto.randomBytes(16).toString('hex')
    },
    net: {
      model: ""
    },
    view: {
      id: generateUUID(),
      loading_type: "route_change",
      name: "/"
    },
    events: [],
    _retry: 0,
    _v: "cdn-0.1.8"
  };
  await axios.post(RUM_URL, rumPayload, {
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': USER_AGENT,
      'Referer': `${BASE_URL}/`,
    },
    decompress: true,
    timeout: 5000,
  }).catch(() => {});
}

async function getExistingChatId(authHeaders) {
  try {
    const chatsResponse = await axios.get(`${BASE_URL}/api/v1/chats/?page=1&type=default`, {
      headers: authHeaders,
      decompress: true,
      timeout: 10000,
    });
    if (chatsResponse.data && chatsResponse.data.data && chatsResponse.data.data.length > 0) {
      return chatsResponse.data.data[0].id;
    }
  } catch (e) {
  }
  return null;
}

export default async function glm5(prompt) {
  if (!BEARER_TOKEN) {
    throw new Error('GLM5_TOKEN belum diatur di environment variable');
  }

  const token = BEARER_TOKEN;
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    throw new Error('Gagal mengekstrak user_id dari token');
  }

  await sendTelemetry();

  const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US',
    'authorization': `Bearer ${token}`,
    'User-Agent': USER_AGENT,
  };

  const existingChatId = await getExistingChatId(authHeaders);
  const chatId = existingChatId || generateUUID();
  const userMessageId = generateUUID();
  const currentTimestamp = Date.now();

  const newChatPayload = {
    chat: {
      id: existingChatId || "",
      title: existingChatId ? "Continue Chat" : "New Chat",
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
      features: [
        {
          type: "tool_selector",
          server: "tool_selector_h",
          status: "hidden"
        }
      ],
      mcp_servers: [],
      enable_thinking: true,
      auto_web_search: false,
      message_version: 1,
      extra: {},
      timestamp: currentTimestamp,
      type: "default"
    }
  };

  await axios.post(`${BASE_URL}/api/v1/chats/new`, newChatPayload, {
    headers: {
      ...authHeaders,
      'Referer': `${BASE_URL}/c/${chatId}`,
    },
    decompress: true,
    timeout: 15000,
  });

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
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
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

  const streamResponse = await axios.post(
    `${BASE_URL}/api/v2/chat/completions?${queryString}`,
    completionPayload,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US',
        'X-FE-Version': 'prod-fe-1.1.22',
        'X-Signature': signature,
        'User-Agent': USER_AGENT,
        'Referer': `${BASE_URL}/c/${chatId}`,
      },
      responseType: 'stream',
      decompress: true,
      timeout: 60000,
    }
  );

  let fullText = '';

  await new Promise((resolve, reject) => {
    streamResponse.data.on('data', (chunk) => {
      const str = chunk.toString();
      const lines = str.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              fullText += parsed.choices[0].delta.content;
            }
          } catch (e) {
          }
        }
      }
    });
    streamResponse.data.on('end', resolve);
    streamResponse.data.on('error', reject);
  });

  return fullText;
}
