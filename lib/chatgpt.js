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

            // SYSTEM PROMPT YANG SUDAH DIOPTIMALKAN UNTUK KODE
            const defaultPrompt = `Anda adalah seorang pakar pemrograman dan analis kode senior. Tugas Anda adalah menganalisis, memperbaiki bug, dan menulis kode (JavaScript, HTML, CSS, Python, PHP, dll) dengan sangat profesional.

ATURAN FORMAT WAJIB:
1. Selalu gunakan blok kode Markdown standar dengan penanda bahasa untuk menulis kode agar tampilan web bisa mewarnainya. Contoh: \`\`\`javascript atau \`\`\`html.
2. Jelaskan kesalahan pada kode user dan berikan solusi perbaikan dengan rapi.
3. Jika memberikan contoh kode, WAJIB bungkus dengan blok Markdown.
4. Jangan pernah mengirimkan kode mentah tanpa blok Markdown.
5. Selalu jawab menggunakan bahasa yang sama dengan bahasa yang digunakan user.
6. Analisis kode tersebut dan temukan potensi masalah atau perbaikan`;

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

            const pageResponse = await _fetch(refererUrl, { headers: { "User-Agent": userAgent } });
            const pageHtml = await pageResponse.text();
            const $ = cheerio.load(pageHtml);

            const currentTime = Date.now();
            const ingestSuffix = "&ver=1.161.3&compression=gzip-js";
            
            await _fetch(ingestBaseUrl + currentTime + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });
            await _fetch(ingestBaseUrl + (currentTime + 150) + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });
            await _fetch(ingestBaseUrl + (currentTime + 180) + ingestSuffix, { method: "POST", headers: ingestHeaders, body: "" });

            const response = await _fetch(apiChatUrl, {
                method: "POST",
                headers: mainHeaders,
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Status ${response.status} - ${errText}`);
            }

            const responseText = await response.text();
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                data = responseText;
            }

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
