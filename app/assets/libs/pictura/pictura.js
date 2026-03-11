class Pictura {
    constructor(options = {}) {
        // Настройки по умолчанию
        this.defaults = {
            allerySelector: '[data-gallery]',
            thumbnailSelector: '.thumbnail',
            viewAllSelector: '[data-gallery-all]',
            imageURLAttribute: 'data-full',
            animationDuration: 300,
            swipeThreshold: 50,
            keyboardNavigation: true,
            wheelNavigation: true,
            touchNavigation: true,
            counter: true,
            counterType: 'numeric', // 'numeric' или 'progress'
            preload: true,
            transitionEffect: 'fade',

            effects: {
                fade: {
                    duration: 300
                },
                slide: {
                    direction: 'horizontal',
                    duration: 400
                },
                zoom: {
                    scale: 0.8,
                    duration: 350
                }
            },
            youtube: {
                width: 853,
                height: 480,
                playerVars: {
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1
                }
            },
            plugins: {}
        };

        // в собираю все настройки в кучу
        this.settings = { ...this.defaults, ...options };
        this.scrollbarWidth = 0; // Ширина скроллбара
        this.bodyPaddingRight = 0; // Исходный padding-right body
        // Загружаем необходимые плагины
        this.loadPlugins().then(() => {
            this.init();
        });
    }

    /**
     * Загружает все плагины, указанные в опциях
     * @returns {Promise} - Promise, который резолвится, когда все плагины загружены
     */
    loadPlugins() {
        // Получаем список плагинов из настроек
        const pluginsToLoad = Object.keys(this.settings.plugins);

        if (pluginsToLoad.length === 0) {
            return Promise.resolve(); // Нет плагинов для загрузки
        }

        // Создаем массив промисов для загрузки каждого плагина
        const pluginPromises = pluginsToLoad.map(pluginName => {
            return this.loadPlugin(pluginName, this.settings.plugins[pluginName]);
        });

        // Возвращаем Promise, который будет разрешен, когда все плагины загрузятся
        return Promise.all(pluginPromises);
    }

    /**
     * Загружает один плагин
     * @param {string} pluginName - Имя плагина
     * @param {object} pluginOptions - Настройки плагина
     * @returns {Promise} - Promise, который резолвится, когда плагин загружен
     */
    loadPlugin(pluginName, pluginOptions) {
        return new Promise((resolve, reject) => {
            // Проверяем, не загружен ли уже плагин
            const pluginClassName = `Pictura${this.capitalizeFirstLetter(pluginName)}Plugin`;
            if (window[pluginClassName]) {
                this.initializePlugin(pluginName, pluginClassName, pluginOptions);
                resolve();
                return;
            }
            if (document.querySelector(`script[src*="/plugins/${pluginName}/"]`)) {
                return;
            }
            // Путь к файлу плагина
            const pluginPath = `/assets/js/plugins/${pluginName}/index.js`;

            // Создаем элемент script
            const script = document.createElement('script');
            script.src = pluginPath;
            script.async = true;

            // Обработчик успешной загрузки
            script.onload = () => {
                this.initializePlugin(pluginName, pluginClassName, pluginOptions);
                resolve();
            };

            // Обработчик ошибки
            script.onerror = () => {
                console.error(`Не удалось загрузить плагин ${pluginName} по пути ${pluginPath}`);
                reject(new Error(`Не удалось загрузить плагин ${pluginName}`));
            };

            // Добавляем script в head
            document.head.appendChild(script);

            // Пытаемся загрузить CSS плагина
            if (pluginOptions.loadCss === true) {
                const cssPath = `/assets/js/plugins/${pluginName}/index.css`;
                if (!document.querySelector(`link[href="${cssPath}"]`)) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssPath;
                    link.onerror = () => {
                        // Если CSS нет, просто игнорируем (удаляем битый линк)
                        link.remove();
                    };
                    document.head.appendChild(link);
                }
            }
        });
    }

    /**
     * Инициализирует загруженный плагин
     * @param {string} pluginName - Имя плагина
     * @param {string} pluginClassName - Имя класса плагина
     * @param {object} pluginOptions - Настройки плагина
     */
    initializePlugin(pluginName, pluginClassName, pluginOptions) {
        if (window[pluginClassName]) {
            // Создаем экземпляр плагина, передавая ему текущий экземпляр галереи и настройки
            this[`${pluginName}Plugin`] = new window[pluginClassName](this, pluginOptions);

            // Явно вызываем init(), если он существует
            if (typeof this[`${pluginName}Plugin`].init === 'function') {
                this[`${pluginName}Plugin`].init();
            }
        } else {
            console.error(`Класс плагина ${pluginClassName} не найден после загрузки`);
        }
    }

    /**
     * Делает первую букву строки заглавной
     * @param {string} string - Исходная строка
     * @returns {string} - Строка с заглавной первой буквой
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    init() {
        // Используем стандартный querySelectorAll, он уже поддерживает несколько селекторов через запятую
        this.galleries = document.querySelectorAll(this.settings.gallerySelector);

        if (!this.galleries.length) return;

        this.setupEventListeners();
    }

    // Новый метод для получения URL изображения из элемента
    getImageUrl(element) {
        // Сначала проверяем настроенный атрибут
        if (element.dataset[this.settings.imageURLAttribute]) {
            return element.dataset[this.settings.imageURLAttribute];
        }

        // Затем проверяем data-full
        if (element.dataset.full) {
            return element.dataset.full;
        }

        // Другие возможные источники
        if (element.href) {
            return element.href;
        }

        if (element.src) {
            return element.src;
        }

        // Для изображений проверяем атрибут src
        const imgElement = element.querySelector('img');
        if (imgElement && imgElement.src) {
            return imgElement.src;
        }

        console.error('Не удалось найти URL изображения для элемента:', element);
        return null;
    }

    // Hooks for plugins (overridden by VideoPlugin)
    isVideoUrl(url) {
        return false;
    }

    createVideoElement(url) {
        return null;
    }

    setupEventListeners() {
        // Используем делегирование событий через document для работы с динамически загружаемым контентом
        document.addEventListener('click', (e) => {
            // Обработка кликов по миниатюрам
            const thumb = e.target.closest(this.settings.thumbnailSelector);
            if (thumb) {
                // Ищем по всем инициированным галереям (на случай если миниатюры разбросаны по разным DOM нодам)
                const isInsideGallery = Array.from(this.galleries).some(g => g.contains(thumb));

                if (isInsideGallery) {
                    e.preventDefault();

                    const group = thumb.dataset.group || 'default';
                    let groupImages = [];

                    if (group !== 'default' && group !== 'all') {
                        // Если есть конкретная группа, ищем по ВСЕМ галереям
                        groupImages = this.getGroupImages(null, group);
                    } else {
                        // Иначе ищем только в текущей галерее
                        const gallery = thumb.closest(this.settings.gallerySelector);
                        groupImages = this.getGroupImages(gallery, group);
                    }

                    this.createModal(groupImages, thumb);
                    return;
                }
            }

            // Обработка кликов по кнопке "показать все"
            const viewAllBtn = e.target.closest(this.settings.viewAllSelector);
            if (viewAllBtn) {
                const gallery = viewAllBtn.closest(this.settings.gallerySelector);
                if (gallery) {
                    e.preventDefault();

                    let allImages;
                    const firstThumb = gallery.querySelector(this.settings.thumbnailSelector);

                    if (firstThumb && firstThumb.dataset.group) {
                        const group = firstThumb.dataset.group;
                        allImages = this.getGroupImages(gallery, group);
                    } else {
                        allImages = Array.from(gallery.querySelectorAll(this.settings.thumbnailSelector));
                    }

                    if (allImages.length) {
                        this.createModal(allImages, allImages[0]);
                    }
                    return;
                }
            }
        });

    }

    getGroupImages(gallery, group) {
        if (!gallery) {
            // Ищем по всем галереям, проинициализированным этим инстансом
            let images = [];
            this.galleries.forEach(g => {
                const thumbs = Array.from(g.querySelectorAll(`${this.settings.thumbnailSelector}[data-group="${group}"]`));
                images = images.concat(thumbs);
            });
            return images;
        }

        if (group === 'all') {
            return Array.from(gallery.querySelectorAll(this.settings.thumbnailSelector));
        }
        return Array.from(gallery.querySelectorAll(`${this.settings.thumbnailSelector}[data-group="${group}"]`));
    }
    lockBodyScroll() {
        // Запоминаем исходный padding-right
        this.bodyPaddingRight = parseInt(document.body.style.paddingRight || 0);

        // Вычисляем ширину скроллбара
        this.scrollbarWidth = this.getScrollbarWidth();

        // Если есть скроллбар, добавляем padding-right
        if (this.scrollbarWidth > 0) {
            document.body.style.paddingRight = `${this.bodyPaddingRight + this.scrollbarWidth}px`;
        }

        // Блокируем скролл
        document.body.classList.add('no-scroll');
    }

    /**
     * Разблокирует скролл страницы
     */
    unlockBodyScroll() {
        // Восстанавливаем исходный padding-right
        document.body.style.paddingRight = this.bodyPaddingRight ? `${this.bodyPaddingRight}px` : '';

        // Разблокируем скролл
        document.body.classList.remove('no-scroll');
    }

    /**
     * Вычисляет ширину скроллбара
     * @return {number} Ширина скроллбара в пикселях
     */
    getScrollbarWidth() {
        // Создаем временный элемент для измерения
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.width = '100px';
        outer.style.position = 'absolute';
        outer.style.top = '-9999px';
        document.body.appendChild(outer);

        // Внутренний элемент
        const inner = document.createElement('div');
        inner.style.width = '100%';
        outer.appendChild(inner);

        // Вычисляем разницу в ширине
        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

        // Удаляем временный элемент
        outer.parentNode.removeChild(outer);

        return scrollbarWidth;
    }
    createModal(images, initialImage) {
        if (!images.length) {
            console.error('Нет изображений для отображения в галерее');
            return;
        }

        const currentIndex = images.indexOf(initialImage);
        if (currentIndex === -1) {
            console.error('Начальное изображение не найдено в списке', initialImage);
            return;
        }
        this.lockBodyScroll();

        const overlay = document.createElement('div');
        overlay.className = 'gallery-overlay';

        const content = document.createElement('div');
        content.className = 'gallery-content';

        // Получаем URL изображения/видео
        const mediaUrl = this.getImageUrl(initialImage);
        if (!mediaUrl) {
            console.error('Невозможно получить URL медиа');
            return;
        }

        // Проверяем, является ли это видео URL (обрабатывается плагином)
        if (this.isVideoUrl(mediaUrl)) {
            const videoElement = this.createVideoElement(mediaUrl);
            if (videoElement) {
                content.appendChild(videoElement);
            } else {
                console.error('Не удалось создать видео элемент из:', mediaUrl);
                return;
            }
        } else {
            // Обычное изображение
            const img = document.createElement('img');
            img.className = 'gallery-image';
            img.src = mediaUrl;
            content.appendChild(img);
        }

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        if (images.length > 1) {
            this.addNavigation(overlay, content, images.length);
        }

        this.addCloseButton(overlay);
        this.addSwipeHint(overlay);

        if (this.settings.counter && images.length > 1) {
            this.addCounter(overlay, currentIndex + 1, images.length);
        }

        document.body.classList.add('no-scroll');

        setTimeout(() => {
            overlay.classList.add('active');
            content.classList.add('active');
        }, 10);

        this.setupModalEvents(overlay, content, content.firstChild, images, currentIndex);

        // Уведомляем плагины об открытии модального окна
        this.triggerPlugins('onModalOpen', { overlay, content, images, currentIndex });
    }

    addNavigation(overlay, content, totalImages) {
        const prevBtn = document.createElement('div');
        prevBtn.className = 'gallery-nav gallery-nav--left';
        const prevBtnInner = document.createElement('button')
        prevBtnInner.innerHTML = '<svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.00005 1L1.3536 7.64645C1.15834 7.84171 1.15834 8.15829 1.3536 8.35355L8.00005 15" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>';
        prevBtn.appendChild(prevBtnInner);
        overlay.appendChild(prevBtn);

        const nextBtn = document.createElement('div');
        nextBtn.className = 'gallery-nav gallery-nav--right';
        const nextBtnInner = document.createElement('button')
        nextBtnInner.innerHTML = '<svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L7.64645 7.64645C7.84171 7.84171 7.84171 8.15829 7.64645 8.35355L1 15" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>';
        nextBtn.appendChild(nextBtnInner);
        overlay.appendChild(nextBtn);
    }

    addCloseButton(overlay) {
        const closeBtn = document.createElement('div');

        closeBtn.className = 'gallery-close';
        const closeBtnInner = document.createElement('button')
        closeBtnInner.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 1.5L1.5 12.5M1.5 1.5L12.5 12.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>';
        closeBtn.appendChild(closeBtnInner);
        overlay.appendChild(closeBtn);
    }

    addCounter(overlay, current, total) {
        if (!this.settings.counter) return;

        // Удаляем все старые счетчики
        const oldCounters = overlay.querySelectorAll('.gallery-counter, .gallery-counter--numeric, .gallery-counter--progress');
        oldCounters.forEach(counter => overlay.removeChild(counter));

        if (this.settings.counterType === 'progress') {
            this.addProgressCounter(overlay, current, total);
        } else {
            this.addNumericCounter(overlay, current, total);
        }
    }

    addNumericCounter(overlay, current, total) {
        const counter = document.createElement('div');
        counter.className = 'gallery-counter gallery-counter--numeric';
        counter.textContent = `${current} / ${total}`;
        overlay.appendChild(counter);
    }

    addProgressCounter(overlay, current, total) {
        const counter = document.createElement('div');
        counter.className = 'gallery-counter gallery-counter--progress';

        const progressBar = document.createElement('div');
        progressBar.className = 'gallery-counter__progress';

        const progressFill = document.createElement('div');
        progressFill.className = 'gallery-counter__progress-fill';
        progressFill.style.width = `${(current / total) * 100}%`;

        progressBar.appendChild(progressFill);
        counter.appendChild(progressBar);


        overlay.appendChild(counter);
    }

    updateCounter(overlay, current, total) {
        if (!this.settings.counter) return;

        // Находим существующий счетчик
        const existingCounter = overlay.querySelector('.gallery-counter');

        if (!existingCounter) {
            // Если счетчика нет, создаем новый
            this.addCounter(overlay, current, total);
            return;
        }

        if (this.settings.counterType === 'progress') {
            // Обновляем прогрессбар
            const progressFill = overlay.querySelector('.gallery-counter__progress-fill');
            const counterText = overlay.querySelector('.gallery-counter__text');

            if (progressFill) {
                progressFill.style.width = `${(current / total) * 100}%`;
            }

            if (counterText) {
                counterText.textContent = `${current} / ${total}`;
            }

            // Если вдруг был числовой счетчик, заменяем его на прогрессбар
            if (existingCounter.classList.contains('gallery-counter--numeric')) {
                this.addCounter(overlay, current, total);
            }
        } else {
            // Обновляем числовой счетчик
            if (existingCounter.classList.contains('gallery-counter--numeric')) {
                existingCounter.textContent = `${current} / ${total}`;
            } else {
                // Если вдруг был прогрессбар, заменяем его на числовой счетчик
                this.addCounter(overlay, current, total);
            }
        }
    }


    addSwipeHint(overlay) {
        if (window.innerWidth >= 592) {
            return;
        }
        const swipeHint = document.createElement('div')
        swipeHint.className = 'menu-indicator'
        swipeHint.innerHTML = '<div class="indicator-wrapper"><div class="box-wrapper"><div class="box-outer"><div class="box"></div><div class="box"></div><div class="box"></div><div class="box"></div></div></div><div class="indicator-cursor"><svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 47.619 68.23"><title>noun_692985</title><path d="M59.773,79.1l0.033-.176c2.062-9.136,9.688-20.832,8.023-31.685-0.45-2.583-.877-3.861-1.383-4.527-0.33-.435-0.807-0.769-2.285-0.769a4.6,4.6,0,0,0-1.063.116L63.041,47.7a1.875,1.875,0,0,1-3.749-.035l0.061-6.554c0.071-2.036-.252-2.656-0.443-2.862-0.169-.181-0.651-0.485-2.388-0.485a2.962,2.962,0,0,0-2.436.915l-0.07,5.843a1.875,1.875,0,1,1-3.749-.035l0.062-6.553c0.071-2.036-.252-2.657-0.443-2.864-0.169-.181-0.653-0.485-2.389-0.485a3.423,3.423,0,0,0-2.054.551l-0.177.17-0.025,9.4a1.875,1.875,0,0,1-3.749-.011L41.554,21.73c0.071-2.042-.25-2.66-0.443-2.869-0.169-.181-0.652-0.485-2.389-0.485a3.225,3.225,0,0,0-2.223.688,2.533,2.533,0,0,0-.654,2.17l0,0.116V54.614a1.875,1.875,0,0,1-3.75,0V47.837l-0.875.232a4.476,4.476,0,0,0-3.115,3.319A10.042,10.042,0,0,0,29.864,58.8c3.487,5.315,8.108,11.265,9.58,18.686l0.251,1.521Z" transform="translate(-24.187 -14.626)" style="fill:#fff"/><path d="M61.32,82.856l-23.33-.1a1.875,1.875,0,0,1-1.863-1.759c-0.476-7.733-5.126-13.62-9.4-20.132-2.013-3.068-3.083-6.96-2.266-10.351,0.766-3.185,3.113-5.585,7-6.378l0.64-.087V21.35l-0.011-.659a6.017,6.017,0,0,1,1.865-4.38,6.923,6.923,0,0,1,4.769-1.685c1.871,0,3.817.263,5.136,1.683,1.293,1.391,1.519,3.4,1.445,5.492l-0.026,9.37,0.724-.2a8.546,8.546,0,0,1,1.5-.129,10.564,10.564,0,0,1,2.776.309,4.92,4.92,0,0,1,2.36,1.374,4.7,4.7,0,0,1,.782,1.153L53.7,34.519l1.325-.374a8.535,8.535,0,0,1,1.495-.129,10.564,10.564,0,0,1,2.776.309A4.922,4.922,0,0,1,61.657,35.7a5.227,5.227,0,0,1,1.235,2.486l0.015,0.11,0.288-.049a8.892,8.892,0,0,1,.966-0.052,6.109,6.109,0,0,1,5.272,2.251c1.127,1.485,1.653,3.64,2.1,6.188,1.965,12.813-7.146,26.223-8.345,34.614A1.875,1.875,0,0,1,61.32,82.856ZM59.773,79.1l0.033-.176c2.062-9.136,9.688-20.832,8.023-31.685-0.45-2.583-.877-3.861-1.383-4.527-0.33-.435-0.807-0.769-2.285-0.769a4.6,4.6,0,0,0-1.063.116L63.041,47.7a1.875,1.875,0,0,1-3.749-.035l0.061-6.554c0.071-2.036-.252-2.656-0.443-2.862-0.169-.181-0.651-0.485-2.388-0.485a2.962,2.962,0,0,0-2.436.915l-0.07,5.843a1.875,1.875,0,1,1-3.749-.035l0.062-6.553c0.071-2.036-.252-2.657-0.443-2.864-0.169-.181-0.653-0.485-2.389-0.485a3.423,3.423,0,0,0-2.054.551l-0.177.17-0.025,9.4a1.875,1.875,0,0,1-3.749-.011L41.554,21.73c0.071-2.042-.25-2.66-0.443-2.869-0.169-.181-0.652-0.485-2.389-0.485a3.225,3.225,0,0,0-2.223.688,2.533,2.533,0,0,0-.654,2.17l0,0.116V54.614a1.875,1.875,0,0,1-3.75,0V47.837l-0.875.232a4.476,4.476,0,0,0-3.115,3.319A10.042,10.042,0,0,0,29.864,58.8c3.487,5.315,8.108,11.265,9.58,18.686l0.251,1.521Z" transform="translate(-24.187 -14.626)"/></svg></div></div>'
        overlay.appendChild(swipeHint);
        setTimeout(() => {
            if (swipeHint.parentNode === overlay) {
                swipeHint.style.opacity = '0';
                setTimeout(() => overlay.removeChild(swipeHint), 300); // Удалить после завершения анимации
            }
        }, 5700);
    }

    setupModalEvents(overlay, content, mediaElement, images, initialIndex) {
        let currentIndex = initialIndex;
        const totalImages = images.length;
        this.unlockBodyScroll();
        const next = () => {
            if (currentIndex < totalImages - 1) {
                currentIndex++;
                this.changeMedia(content, images[currentIndex - 1], images[currentIndex], 'next');
                this.updateCounter(overlay, currentIndex + 1, totalImages);
            }
        };

        const prev = () => {
            if (currentIndex > 0) {
                currentIndex--;
                this.changeMedia(content, images[currentIndex + 1], images[currentIndex], 'prev');
                this.updateCounter(overlay, currentIndex + 1, totalImages);
            }
        };

        const close = () => {
            overlay.classList.remove('active');
            content.classList.remove('active');

            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('no-scroll');
                this.removeEventListeners();

                // Уведомляем плагины о закрытии
                this.triggerPlugins('onModalClose');
            }, this.settings.animationDuration);
        };

        const nextBtn = overlay.querySelector('.gallery-nav--right');
        const prevBtn = overlay.querySelector('.gallery-nav--left');
        const closeBtn = overlay.querySelector('.gallery-close');

        if (nextBtn) nextBtn.addEventListener('click', next);
        if (prevBtn) prevBtn.addEventListener('click', prev);
        if (closeBtn) closeBtn.addEventListener('click', close);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const handleKeydown = (e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };

        if (this.settings.keyboardNavigation) {
            document.addEventListener('keydown', handleKeydown);
        }

        // Колесо мыши
        const handleWheel = (e) => {
            e.preventDefault();
            if (e.deltaY > 0) next();
            else if (e.deltaY < 0) prev();
        };

        if (this.settings.wheelNavigation) {
            document.addEventListener('wheel', handleWheel, { passive: false });
        }

        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchEndX = touchStartX;
        };

        const handleTouchMove = (e) => {
            touchEndX = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            const swipeDistance = touchEndX - touchStartX;
            if (swipeDistance > this.settings.swipeThreshold) {
                prev();
            } else if (swipeDistance < -this.settings.swipeThreshold) {
                next();
            }
        };

        if (this.settings.touchNavigation) {
            overlay.addEventListener('touchstart', handleTouchStart);
            overlay.addEventListener('touchmove', handleTouchMove);
            overlay.addEventListener('touchend', handleTouchEnd);
        }

        this.eventHandlers = {
            handleKeydown,
            handleWheel,
            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
            nextBtn,
            prevBtn,
            closeBtn
        };
    }

    removeEventListeners() {
        if (this.eventHandlers) {
            document.removeEventListener('keydown', this.eventHandlers.handleKeydown);
            document.removeEventListener('wheel', this.eventHandlers.handleWheel);
        }
    }


    changeMedia(contentContainer, currentElement, newElement, direction) {
        // Получаем URL медиа
        const mediaUrl = this.getImageUrl(newElement);
        if (!mediaUrl) {
            console.error('Невозможно получить URL медиа для', newElement);
            return;
        }

        // Проверяем, видео это или изображение
        const isVideo = this.isVideoUrl(mediaUrl);

        const currentUrl = this.getImageUrl(currentElement);
        if (!currentUrl) {
            console.error('Невозможно получить URL медиа для', currentElement);
            return;
        }
        // Проверяем, видео это или изображение
        const isCurrentVideo = this.isVideoUrl(currentUrl);

        // Очищаем контейнер
        if (isVideo || isCurrentVideo) {
            this.clearContent(contentContainer);
        }

        if (isVideo) {
            // Для видео создаем iframe
            const videoElement = this.createVideoElement(mediaUrl);
            if (videoElement) {
                contentContainer.appendChild(videoElement);
            }
        } else {
            // Для изображений
            this.loadImage(contentContainer, mediaUrl, direction);
        }

        // Уведомляем плагины о смене медиа
        this.triggerPlugins('onMediaChange', { currentElement, newElement, direction });
    }

    // Очистка содержимого контейнера
    clearContent(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    // Загрузка изображения с эффектами
    loadImage(container, imageSrc, direction) {
        const img = document.createElement('img');
        img.className = 'gallery-image';

        const preload = new Image();
        preload.src = imageSrc;

        preload.onload = () => {
            switch (this.settings.transitionEffect) {
                case 'fade':
                    this.applyFadeEffect(container, preload.src);
                    break;
                case 'slide':
                    this.applySlideEffect(container, preload.src, direction);
                    break;
                case 'zoom':
                    this.applyZoomEffect(container, preload.src);
                    break;
                // case 'flip':
                //     this.apply3DFlipEffect(container, preload.src);
                //     break;
                default:
                    img.src = preload.src;
                    container.appendChild(img);
            }
        };

        preload.onerror = () => {
            console.error('Ошибка загрузки изображения:', imageSrc);
            img.src = imageSrc;
            container.appendChild(img);
        };
    }

    applyFadeEffect(container, newSrc) {
        const duration = this.settings.effects.fade.duration;

        container.style.transition = `opacity ${duration}ms ease-out`;
        container.style.opacity = '0';

        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.src = newSrc;

        // Ждём завершения анимации ухода
        setTimeout(() => {
            // Меняем изображение, очищаем контейнер
            this.clearContent(container);
            container.appendChild(img);
        }, duration);

        setTimeout(() => {
            container.style.opacity = '1';
        }, duration);
    }

    applySlideEffect(container, newSrc, direction) {
        const duration = this.settings.effects.slide.duration;

        // Установка базовых стилей контейнера
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.width = '100%';
        container.style.transition = `transform ${duration}ms ease-out`;
        container.style.willChange = 'transform';

        // Смещение контейнера в нужную сторону
        const offset = direction === 'next' ? '-100vw' : '100vw';
        container.style.transition = `transform ${duration}ms ease-out`;
        container.style.transform = `translateX(${offset})`;

        // Ждём завершения анимации ухода
        setTimeout(() => {
            // Меняем изображение, очищаем контейнер
            this.clearContent(container);

            const newImg = document.createElement('img');
            newImg.className = 'gallery-image';
            newImg.src = newSrc;

            container.appendChild(newImg);

            // Устанавливаем контейнер в противоположную сторону мгновенно
            container.style.transition = 'none';
            container.style.transform = `translateX(${direction === 'next' ? '100vw' : '-100vw'})`;

            // Позволяем браузеру отрисовать
            setTimeout(() => {
                requestAnimationFrame(() => {
                    // Возвращаем контейнер в центр с анимацией
                    container.style.transition = `transform ${duration}ms ease-out`;
                    container.style.transform = 'translateX(0)';
                });
            }, 10);
        }, duration);

        // Очищаем временные стили после завершения второй анимации
        setTimeout(() => {
            container.style.transition = '';
            container.style.transform = '';
            container.style.minHeight = '';
        }, duration * 2 + 50);
    }


    applyZoomEffect(container, newSrc) {
        const duration = this.settings.effects.zoom.duration;

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.width = '100%';
        container.style.transition = `
            transform ${duration}ms ease-out,
            opacity ${duration}ms ease-out
        `;
        container.style.willChange = 'transform';
        container.style.transform = `scale(0.5)`;
        container.style.opacity = '0';


        // Ждём завершения анимации ухода
        setTimeout(() => {
            // Меняем изображение, очищаем контейнер
            this.clearContent(container);

            const newImg = document.createElement('img');
            newImg.className = 'gallery-image';
            newImg.src = newSrc;

            container.appendChild(newImg);


            // Позволяем браузеру отрисовать
            setTimeout(() => {
                requestAnimationFrame(() => {
                    // Возвращаем контейнер в центр с анимацией
                    container.style.transform = 'scale(1)';
                    container.style.opacity = '1';
                });
            }, 10);
        }, duration);

        // Очищаем временные стили после завершения второй анимации
        setTimeout(() => {
            container.style.transition = '';
            container.style.transform = '';
            container.style.minHeight = '';
        }, duration * 2 + 50);
    }

    // Вызывает метод у всех инициализированных плагинов
    triggerPlugins(methodName, args) {
        Object.keys(this.settings.plugins).forEach(pluginName => {
            const pluginInstance = this[`${pluginName}Plugin`];
            if (pluginInstance && typeof pluginInstance[methodName] === 'function') {
                pluginInstance[methodName](args);
            }
        });
    }
}

// apply3DFlipEffect(container, newSrc) {
//     var duration = this.settings.effects.flip.duration;

//     // Создаем перспективу для 3D-эффекта
//     container.style.position = 'relative';
//     container.style.perspective = '1000px';
//     container.style.transformStyle = 'preserve-3d';
//     container.style.transition = `transform ${duration}ms ease-out`;

//     // Начинаем анимацию переворота (первая половина)
//     container.style.transform = 'rotateY(90deg)';

//     // В середине анимации меняем изображение
//     setTimeout(() => {
//         // Очищаем содержимое
//         this.clearContent(container);

//         // Добавляем новое изображение
//         var newImg = document.createElement('img');
//         newImg.className = 'gallery-image';
//         newImg.src = newSrc;

//         container.appendChild(newImg);


//         // Устанавливаем контейнер в противоположную сторону мгновенно
//         container.style.transition = 'none';
//         container.style.transform = 'rotateY(270deg)';

//         // Позволяем браузеру отрисовать
//         setTimeout(() => {
//             requestAnimationFrame(() => {
//                 // Возвращаем контейнер в центр с анимацией
//                 container.style.transition = `transform ${duration}ms ease-out`;
//                 // Возвращаем контейнер в центр с анимацией
//                 container.style.perspective = '';
//                 container.style.transform = '';
//             });
//         }, 10);
//     }, duration / 2);
// }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pictura;
} else if (typeof window !== 'undefined') {
    window.Pictura = Pictura;
}