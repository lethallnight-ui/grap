export default async function handler(req, res) {
    // CORS Başlıkları
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL parametresi eksik.' });
    }

    try {
        // Hedef siteye gerçek bir tarayıcı gibi istek atıyoruz (Bot engeline takılmamak için)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Hedef siteye erişim sağlanamadı. Sunucu engelliyor olabilir.' });
        }

        const html = await response.text();
        let directVideoUrl = null;

        // --- ALGORİTMA 1: Profesyonel Oynatıcı Fonksiyonlarını Yakalama ---
        // Sitenin JavaScript içine gömdüğü yüksek ve düşük kalite video fonksiyonlarını avlar
        const highQualityRegex = /setVideoUrlHigh\s*\(\s*['"]([^'"]+)['"]\s*\)/i;
        const lowQualityRegex = /setVideoUrlLow\s*\(\s*['"]([^'"]+)['"]\s*\)/i;
        const hlsServerRegex = /setVideoHLS\s*\(\s*['"]([^'"]+)['"]\s*\)/i;

        const matchHigh = html.match(highQualityRegex);
        const matchLow = html.match(lowQualityRegex);
        const matchHls = html.match(hlsServerRegex);

        if (matchHigh && matchHigh[1]) {
            directVideoUrl = matchHigh[1];
        } else if (matchLow && matchLow[1]) {
            directVideoUrl = matchLow[1];
        } else if (matchHls && matchHls[1]) {
            directVideoUrl = matchHls[1]; // Bu bir .m3u8 linkidir, VLC veya tarayıcı doğrudan oynatabilir
        }

        // --- ALGORİTMA 2: Flashvars / Config Objesi Taraması ---
        if (!directVideoUrl) {
            const flashvarsRegex = /flashvars\s*=\s*({[^}]+})/i;
            const flashMatch = html.match(flashvarsRegex);
            if (flashMatch && flashMatch[1]) {
                try {
                    // Objeyi temizleyip içindeki video url parametrelerini arıyoruz
                    const configText = flashMatch[1].replace(/'/g, '"');
                    const config = JSON.parse(configText);
                    directVideoUrl = config.video_url || config.video_alt_url || config.url;
                } catch (e) {
                    // JSON parse başarısız olursa düz metin olarak içinden link cımbızla
                    const urlInsideFlash = flashMatch[1].match(/video_url"\s*:\s*"([^"]+)"/i);
                    if (urlInsideFlash) directVideoUrl = urlInsideFlash[1];
                }
            }
        }

        // --- ALGORİTMA 3: Klasik / Standart HTML5 Etiketleri (Fallback) ---
        if (!directVideoUrl) {
            const mp4Regex = /"video_url":"(https:[^"]+)"|property="og:video" content="(https:[^"]+)"/i;
            const match = html.match(mp4Regex);
            if (match) {
                directVideoUrl = match[1] || match[2];
                directVideoUrl = JSON.parse(`"${directVideoUrl}"`); 
            }
        }

        if (!directVideoUrl) {
            return res.status(404).json({ 
                error: 'Sitenin şifreli oynatıcı kodları çözülemedi. Bu spesifik sayfa gelişmiş token koruması kullanıyor olabilir.' 
            });
        }

        // Linki GitHub Pages'e geri gönder
        return res.status(200).json({ videoUrl: directVideoUrl });

    } catch (error) {
        return res.status(500).json({ error: `Sistem Hatası: ${error.message}` });
    }
}
