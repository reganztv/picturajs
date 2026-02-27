class ThumbnailsPlugin {
    constructor(gallery, options = {}) {
        this.gallery = gallery;
        this.settings = {
            type: 'thumbnails', // 'thumbnails' или 'dots'
            ...options
        };
        this.thumbnailsContainer = null;
        this.images = [];
        this.currentIndex = 0;
    }

    init() {
        // Плагин инициализирован, ожидает открытия модалки.
        // CSS подгружается автоматически через pictura.js
    }

    /**
     * Вызывается галереей при открытии модального окна
     */
    onModalOpen({ overlay, content, images, currentIndex }) {
        this.images = images;
        this.currentIndex = currentIndex;

        // Если элементов меньше 2, миниатюры/точки не нужны
        if (this.images.length < 2) return;

        this.renderContainer(overlay);
        this.renderItems();
        this.updateActiveItem();
    }

    /**
     * Вызывается галереей при закрытии модального окна
     */
    onModalClose() {
        if (this.thumbnailsContainer) {
            this.thumbnailsContainer.remove();
            this.thumbnailsContainer = null;
        }
        this.images = [];
        this.currentIndex = 0;
    }

    /**
     * Вызывается галереей при смене слайда
     */
    onMediaChange({ newElement, direction }) {
        // Ищем новый индекс
        const newIndex = this.images.indexOf(newElement);
        if (newIndex !== -1) {
            this.currentIndex = newIndex;
            this.updateActiveItem();
            this.scrollToActiveItem();
        }
    }

    renderContainer(overlay) {
        this.thumbnailsContainer = document.createElement('div');
        this.thumbnailsContainer.className = `pictura-thumbnails-plugin pictura-thumbnails-${this.settings.type}`;
        overlay.appendChild(this.thumbnailsContainer);
    }

    renderItems() {
        if (!this.thumbnailsContainer) return;
        this.thumbnailsContainer.innerHTML = '';

        this.images.forEach((element, index) => {
            const item = document.createElement('div');
            item.className = 'pictura-thumbnail-item';
            if (index === this.currentIndex) {
                item.classList.add('active');
            }

            // Добавляем обработчик клика для навигации
            item.addEventListener('click', () => {
                this.goToMedia(index);
            });

            if (this.settings.type === 'thumbnails') {
                const imgUrl = this.getThumbnailUrl(element);
                const img = document.createElement('img');
                img.src = imgUrl;
                item.appendChild(img);
            } else {
                // Если тип 'dots', просто оставляем пустой div, CSS нарисует кружочек
                const dot = document.createElement('div');
                dot.className = 'pictura-dot';
                item.appendChild(dot);
            }

            this.thumbnailsContainer.appendChild(item);
        });
    }

    updateActiveItem() {
        if (!this.thumbnailsContainer) return;
        const items = this.thumbnailsContainer.querySelectorAll('.pictura-thumbnail-item');
        items.forEach((item, index) => {
            if (index === this.currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    scrollToActiveItem() {
        if (!this.thumbnailsContainer || this.settings.type !== 'thumbnails') return;
        const activeItem = this.thumbnailsContainer.querySelector('.pictura-thumbnail-item.active');
        if (activeItem) {
            const containerCenter = this.thumbnailsContainer.offsetWidth / 2;
            const itemCenter = activeItem.offsetLeft + (activeItem.offsetWidth / 2);
            this.thumbnailsContainer.scrollTo({
                left: itemCenter - containerCenter,
                behavior: 'smooth'
            });
        }
    }

    goToMedia(index) {
        if (index === this.currentIndex) return;

        const contentContainer = document.querySelector('.gallery-overlay.active .gallery-content');
        if (!contentContainer) return;

        const direction = index > this.currentIndex ? 'next' : 'prev';
        const currentElement = this.images[this.currentIndex];
        const newElement = this.images[index];

        // Используем метод ядра галереи (если доступен)
        if (typeof this.gallery.changeMedia === 'function') {
            this.gallery.changeMedia(contentContainer, currentElement, newElement, direction);
            this.currentIndex = index;
            // Обновляем счетчик
            if (typeof this.gallery.updateCounter === 'function') {
                const overlay = document.querySelector('.gallery-overlay.active');
                this.gallery.updateCounter(overlay, index + 1, this.images.length);
            }
        }
    }

    getThumbnailUrl(element) {
        // Пробуем взять thumbnail прямо из src картинки миниатюры
        if (element.tagName.toLowerCase() === 'img') {
            return element.src;
        }
        const img = element.querySelector('img');
        if (img) return img.src;

        // Fallback: возвращаем full url
        if (typeof this.gallery.getImageUrl === 'function') {
            const fullUrl = this.gallery.getImageUrl(element);
            if (fullUrl && !this.gallery.isVideoUrl(fullUrl)) {
                return fullUrl;
            }
        }

        // Если это видео без миниатюры, подставляем плейсхолдер или что-то по умолчанию
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="gray"><rect width="100" height="100"/><text x="50" y="50" fill="white" font-size="20" font-family="Arial" dominant-baseline="middle" text-anchor="middle">Video</text></svg>';
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThumbnailsPlugin;
} else if (typeof window !== 'undefined') {
    window.PicturaThumbnailsPlugin = ThumbnailsPlugin;
}
