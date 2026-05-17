const express = require('express');
const cors = require('cors');
const ytDlp = require('yt-dlp-exec');
const app = express();
const PORT = process.env.PORT || 3000;

// GitHub Pages'ten gelecek istekleri engellememesi için CORS açıyoruz
app.use(cors());

app.get('/api/grab', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parametresi eksik.' });
    }

    try {
        // Dünyanın en güçlü çözücü motoru (yt-dlp) devreye giriyor.
        // Gelişmiş şifreleri çözer, en yüksek kaliteli doğrudan video linkini (mp4) ayıklar.
        const output = await ytDlp(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });

        // Kütüphaneden dönen ham verinin içindeki gerçek, doğrudan oynatılabilir URL'i yakalıyoruz
        const videoUrl = output.url || (output.formats && output.formats[0].url);

        if (!videoUrl) {
            return res.status(404).json({ error: 'Video kaynağı şifre çözücü kütüphane tarafından da ayıklanamadı.' });
        }

        // Bulunan gerçek mp4 linkini senin ön yüzüne (GitHub Pages) fırlatır
        return res.status(200).json({ videoUrl: videoUrl });

    } catch (error) {
        return res.status(500).json({ error: `Çözücü Sistem Hatası: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Profesyonel Motor ${PORT} portunda aktif.`);
});