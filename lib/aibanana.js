import crypto from "crypto";

// Gunakan globalThis.fetch (bawaan Node 18+ / Vercel)
let _fetch = globalThis.fetch;
if (!_fetch) {
  await import("undici").then(mod => { _fetch = mod.fetch; });
}

class TurnstileSolver {
    constructor() {
        this.solverURL = "https://cf-solver-renofc.my.id/api/solvebeta";
    }

    async solve(url, siteKey, mode = "turnstile-min") {
        const response = await _fetch(this.solverURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: url,
                siteKey: siteKey,
                mode: mode
            })
        });
        const data = await response.json();
        return data.token.result.token;
    }
}

class AIBanana {
    constructor() {
        this.baseURL = "https://aibanana.net";
        this.siteKey = "0x4AAAAAAB2-fh9F_EBQqG2_";
        this.solver = new TurnstileSolver();
    }

    generateFingerprint() {
        return crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex");
    }

    generateDeviceId() {
        return crypto.randomBytes(8).toString("hex");
    }

    generateRandomUserAgent() {
        const osList = ["Windows NT 10.0; Win64; x64", "Macintosh; Intel Mac OS X 10_15_7", "X11; Linux x86_64", "Windows NT 6.1; Win64; x64", "Windows NT 6.3; Win64; x64"];
        const os = osList[Math.floor(Math.random() * osList.length)];
        const chromeVersion = Math.floor(Math.random() * 40) + 100;
        return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
    }

    generateRandomViewport() {
        const resolutions = [
            { w: 1366, h: 768 }, { w: 1920, h: 1080 }, { w: 1440, h: 900 },
            { w: 1536, h: 864 }, { w: 1280, h: 720 }, { w: 1600, h: 900 },
            { w: 2560, h: 1440 }, { w: 1680, h: 1050 }, { w: 1024, h: 768 }
        ];
        return resolutions[Math.floor(Math.random() * resolutions.length)];
    }

    generateRandomPlatform() {
        return ["Windows", "Linux", "macOS", "Chrome OS"][Math.floor(Math.random() * 4)];
    }

    generateRandomLanguage() {
        return ["en-US,en;q=0.9", "id-ID,id;q=0.9,en-US;q=0.8", "en-GB,en;q=0.9", "es-ES,es;q=0.9"][Math.floor(Math.random() * 4)];
    }

    async generateImage(prompt) {
        const turnstileToken = await this.solver.solve(this.baseURL, this.siteKey, "turnstile-min");
        const fingerprint = this.generateFingerprint();
        const deviceId = this.generateDeviceId();
        const userAgent = this.generateRandomUserAgent();
        const viewport = this.generateRandomViewport();
        const platform = this.generateRandomPlatform();
        const language = this.generateRandomLanguage();
        const chromeVersion = Math.floor(Math.random() * 30) + 110;

        const body = {
            prompt: prompt,
            model: "nano-banana-2",
            mode: "text-to-image",
            numImages: 1,
            aspectRatio: "1:1",
            clientFingerprint: fingerprint,
            turnstileToken: turnstileToken,
            deviceId: deviceId
        };

        const headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Accept-Language": language,
            "Origin": this.baseURL,
            "Referer": `${this.baseURL}/`,
            "User-Agent": userAgent,
            "Sec-Ch-Ua": `"Chromium";v="${chromeVersion}", "Not-A.Brand";v="24", "Google Chrome";v="${chromeVersion}"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"${platform}"`,
            "Viewport-Width": viewport.w.toString(),
            "Viewport-Height": viewport.h.toString(),
            "X-Forwarded-For": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        };

        const response = await _fetch(`${this.baseURL}/api/image-generation`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `AI Banana request failed with status ${response.status}`);
        }

        return response.json();
    }
}

const banana = new AIBanana();

export default async function aibanana(prompt) {
    if (!prompt) throw new Error("Prompt is required.");
    const result = await banana.generateImage(prompt);
    return result;
}
