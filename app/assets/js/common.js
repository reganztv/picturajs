document.addEventListener('DOMContentLoaded', () => {
  const gallery = new Pictura({
    gallerySelector: '.gallery-page, [data-gallery-two], .video',
    transitionEffect: 'fade',
    counterType: 'numeric',
    plugins: {
      zoom: {
        maxScale: 3,
        step: 1,
        controlsEnabled: true,
      },
      video: {
      },
      thumbnails: {
        type: 'dots', // можно также поменять на 'dots'
        loadCss: true
      }
    },
  });
});