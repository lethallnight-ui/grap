// Vercel Serverless Function (Node.js) - CORS DESTEKLI
export default async function handler(req, res) {
    // CORS Ayarları: Firebase veya herhangi bir dış siteden gelen isteklere izin veriyoruz
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Tarayıcılar ön kontrol (preflight) için OPTIONS isteği atarsa doğrudan 200 dön
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Yöntem izin verilmedi' });
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parametresi eksik' });
    }

    try {
        // Hedef web sayfasının kaynak kodunu (HTML) sunucu üzerinden çekiyoruz
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Hedef siteye erişilemedi veya site engelledi.' });
        }

        const html = await response.text();

        // Link Çözme Algoritması (Gelişmiş Regex Yapısı)
        // HTML içindeki video_url, og:video ve klasik video kaynak linklerini tarar
        const mp4Regex = /"video_url":"(https:[^"]+)"|property="og:video" content="(https:[^"]+)"/i;
        const match = html.match(mp4Regex);

        let directVideoUrl = null;

        if (match) {
            directVideoUrl = match[1] || match[2];
            directVideoUrl = JSON.parse(`"${directVideoUrl}"`); // Unicode ve kaçış karakterlerini temizler
        }

        // Fallback: Klasik <video src="..."> etiketlerini yakala
        if (!directVideoUrl) {
            const videoTagRegex = /<video[^>]*src="([^"]+)"/i;
            const videoMatch = html.match(videoTagRegex);
            if (videoMatch) directVideoUrl = videoMatch[1];
        }

        // Fallback 2: Kaynak etiketlerini yakala <source src="...">
        if (!directVideoUrl) {
            const sourceTagRegex = /<source[^>]*src="([^"]+)"/i;
            const sourceMatch = html.match(sourceTagRegex);
            if (sourceMatch) directVideoUrl = sourceMatch[1];
        }

        if (!directVideoUrl) {
            return res.status(404).json({ error: 'Bu adreste doğrudan indirilebilir video kaynağı yakalanamadı. Site korumalı olabilir.' });
        }

        // Bulunan video adresini Firebase'deki ön yüzümüze geri teslim ediyoruz
        return res.status(200).json({ videoUrl: directVideoUrl });

    } catch (error) {
        return res.status(500).json({ error: `Vercel API Hatası: ${error.message}` });
    }
}
