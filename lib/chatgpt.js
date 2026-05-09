import * as cheerio from "cheerio";

let _fetch = globalThis.fetch;
if (!_fetch) {
  await import("undici").then(mod => { _fetch = mod.fetch; });
}

export class GptService {
  static async process(input, options = {}) {
    try {
      const scheme = "https:";
      const sep = "/";
      const doubleSep = sep + sep;
      const hostChat = "chateverywhere.app";
      const hostIngest = "ingest.chatanywhere.app";

      const apiChatUrl = scheme + doubleSep + hostChat + sep + "api" + sep + "chat";
      const refererUrl = scheme + doubleSep + hostChat + sep + "id#";
      const ingestBaseUrl = scheme + doubleSep + hostIngest + sep + "i" + sep + "v0" + sep + "e" + sep + "?ip=1&_=";

      const userAgent = "Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0";

      const defaultPrompt = "You are an AI language model named Chat Everywhere, designed to answer user questions as accurately and helpfully as possible. Always be aware of the current date and time, and make sure to generate responses in the exact same language as the user's query. Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. Additionally, format all responses using Markdown syntax, regardless of the input format.If the input includes text such as [lang=xxx], the response should not include this text.If the input includes math related content, you should use LaTex syntax, and wrap them in $$ symbols. Make sure you also wrap the bracket inside if needed. e.g. $$(a^2 + b^2 = c^2)$$";

      const requestPayload = {
        model: {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5",
          maxLength: 12000,
          tokenLimit: 4000,
          completionTokenLimit: 2500,
          deploymentName: "gpt-35",
        },
        messages: [
          {
            role: "user",
            content: input,
            pluginId: null, 
          },
        ],
        prompt: options.prompt || defaultPrompt,
        temperature: options.temperature || 0.5,
        enableConversationPrompt: false
      };

      const mainHeaders = {
        "Content-Type": "application/json",
        "Output-Language": "",
        "user-browser-id": "db7a9d69-c583-4875-8199-9e167cdd155a",
        "user-selected-plugin-id": "",
        "User-Agent": userAgent,
        "Referer": refererUrl
      };

      const ingestHeaders = {
        "Content-Type": "text/plain",
        "User-Agent": userAgent,
        "Referer": refererUrl
      };

      /* 1. Inisialisasi halaman awal menggunakan cheerio */
      const pageResponse = await _fetch(refererUrl, { headers: { "User-Agent": userAgent } });
      const pageHtml = await pageResponse.text();
      const $ = cheerio.load(pageHtml);

      /* 2. Menjalankan sequence ingest / tracking sebelum request utama */
      const currentTime = Date.now();
      const ingestSuffix = "&ver=1.161.3&compression=gzip-js";
      
      await _fetch(ingestBaseUrl + currentTime + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });
      await _fetch(ingestBaseUrl + (currentTime + 150) + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });
      await _fetch(ingestBaseUrl + (currentTime + 180) + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });

      /* 3. Menjalankan request utama ke API Chat menggunakan Fetch */
      const response = await _fetch(apiChatUrl, {
        method: "POST",
        headers: mainHeaders,
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status} - ${errText}`);
      }

      // PERBAIKAN: Baca respon sebagai TEKS terlebih dahulu
      const responseText = await response.text();
      
      let data;
      try {
        // Coba parse ke JSON jika memang formatnya JSON
        data = JSON.parse(responseText);
      } catch (e) {
        // Jika gagal (seperti error "Tentu, say..."), berarti API merespon dengan Plain Text
        data = responseText;
      }

      /* 4. Menjalankan request ingest penutup */
      await _fetch(ingestBaseUrl + (currentTime + 300) + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });

      return data;
    } catch (error) {
      let errorMessage = "Failed to fetch AI response: " + error.message;
      throw new Error(errorMessage);
    }
  }
}

export default async function gptFree({ message, prompt, temperature }) {
  if (!message) throw new Error("Message is required.");
  
  const result = await GptService.process(message, { prompt, temperature });
  
  let text = "";
  if (result) {
    if (typeof result === "string") {
      // Karena API merespon plain text, hasilnya akan masuk sini
      text = result;
    } else if (result.choices && result.choices[0]) {
      text = result.choices[0].message?.content || result.choices[0].text || "";
    } else if (result.text) {
      text = result.text;
    } else if (result.message) {
      text = result.message;
    }
  }

  if (!text) throw new Error("Gagal mendapatkan teks dari Chat Everywhere.");
  return text;
}
