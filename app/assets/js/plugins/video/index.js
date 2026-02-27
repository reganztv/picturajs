/**
 * Video Plugin for Pictura.js
 * Adds support for YouTube, VK Video, Rutube, and Dzen videos.
 */
class VideoPlugin {
    constructor(gallery, options = {}) {
        this.gallery = gallery;
        this.settings = {
            youtube: {
                playerVars: {
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1
                }
            },
            vk: {
                playerVars: {
                    autoplay: 1
                }
            },
            rutube: {
                playerVars: {}
            },
            dzen: {
                playerVars: {
                    autoplay: 1
                }
            },
            ...options
        };
    }

    init() {
        this.wrapGalleryMethods();
    }

    wrapGalleryMethods() {
        if (!this.gallery) return;

        // Переопределяем метод isVideoUrl
        this.gallery.isVideoUrl = (url) => {
            return this.isYouTubeUrl(url) ||
                this.isVkUrl(url) ||
                this.isRutubeUrl(url) ||
                this.isDzenUrl(url);
        };

        // Переопределяем метод createVideoElement
        this.gallery.createVideoElement = (url) => {
            if (this.isYouTubeUrl(url)) {
                const videoId = this.getYouTubeVideoId(url);
                return this.createYouTubeEmbed(videoId);
            } else if (this.isVkUrl(url)) {
                const { oid, id, hash } = this.getVkVideoInfo(url);
                return this.createVkEmbed(oid, id, hash);
            } else if (this.isRutubeUrl(url)) {
                const videoId = this.getRutubeVideoId(url);
                return this.createRutubeEmbed(videoId);
            } else if (this.isDzenUrl(url)) {
                const videoId = this.getDzenVideoId(url);
                return this.createDzenEmbed(videoId);
            }
            return null;
        };
    }

    // --- YouTube ---
    isYouTubeUrl(url) {
        return url && (
            url.includes('youtube.com/watch') ||
            url.includes('youtu.be/') ||
            url.includes('youtube.com/embed/')
        );
    }

    getYouTubeVideoId(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&]+)/i,
            /youtube\.com\/watch\?.*v=([^&]+)/i
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    createYouTubeEmbed(videoId) {
        const { playerVars } = this.settings.youtube;
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(playerVars)) {
            params.append(key, value);
        }
        const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        return this.createIframe(embedUrl);
    }

    // --- VK Video ---
    isVkUrl(url) {
        return url && (url.includes('vk.com/video') || url.includes('vkvideo.ru/video'));
    }

    getVkVideoInfo(url) {
        if (!url) return null;

        // Попытка распарсить как iframe ссылку (video_ext.php)
        if (url.includes('video_ext.php')) {
            const oidMatch = url.match(/[?&]oid=(-?\d+)/i);
            const idMatch = url.match(/[?&]id=(\d+)/i);
            const hashMatch = url.match(/[?&]hash=([^&]+)/i);

            if (oidMatch && idMatch) {
                return {
                    oid: oidMatch[1],
                    id: idMatch[1],
                    hash: hashMatch ? hashMatch[1] : ''
                };
            }
        }

        // Попытка распарсить как обычную ссылку например: https://vk.com/video-123456_7890?hash=abcdef
        const match = url.match(/video(-?\d+)_(\d+)(?:\?.*hash=([^&]+))?/i);
        if (match) {
            return {
                oid: match[1],
                id: match[2],
                hash: match[3] || ''
            };
        }
        return { oid: '', id: '', hash: '' };
    }

    createVkEmbed(oid, id, hash) {
        if (!oid || !id) return null;
        let url = `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
        if (hash) {
            url += `&hash=${hash}`;
        }
        if (this.settings.vk?.playerVars?.autoplay) {
            url += `&autoplay=1`;
        }
        return this.createIframe(url);
    }

    // --- Rutube ---
    isRutubeUrl(url) {
        return url && url.includes('rutube.ru/video/');
    }

    getRutubeVideoId(url) {
        if (!url) return null;
        // Пример: https://rutube.ru/video/12345abcdef/
        const match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)\/?/i);
        return match ? match[1] : null;
    }

    createRutubeEmbed(videoId) {
        if (!videoId) return null;
        const embedUrl = `https://rutube.ru/play/embed/${videoId}`;
        return this.createIframe(embedUrl);
    }

    // --- Dzen ---
    isDzenUrl(url) {
        return url && (url.includes('dzen.ru/video/watch/') || url.includes('dzen.ru/embed/'));
    }

    getDzenVideoId(url) {
        if (!url) return null;
        // Пример 1: https://dzen.ru/embed/vCrhUuBBxYWM?from_block=partner...
        // Пример 2: https://dzen.ru/video/watch/671baaa03dee994f801f78a5
        const match = url.match(/dzen\.ru\/(?:video\/watch|embed)\/([a-zA-Z0-9]+)\/?/i);
        return match ? match[1] : null;
    }

    createDzenEmbed(videoId) {
        if (!videoId) return null;
        let embedUrl = `https://dzen.ru/embed/${videoId}`;
        if (this.settings.dzen?.playerVars?.autoplay) {
            embedUrl += `?autoplay=1`;
        }
        return this.createIframe(embedUrl);
    }

    // Общая функция создания iframe
    createIframe(src) {
        const iframe = document.createElement('iframe');
        iframe.className = 'gallery-video';
        iframe.src = src;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
        return iframe;
    }
}

// Экспорт плагина для браузера и модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoPlugin;
} else if (typeof window !== 'undefined') {
    window.PicturaVideoPlugin = VideoPlugin;
}
