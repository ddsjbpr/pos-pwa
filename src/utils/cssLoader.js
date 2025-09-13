// File: src/utils/cssLoader.js
export function loadCSS(href) {
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => {
            console.error(`Failed to load CSS: ${href}`);
            resolve(); // Still resolve to prevent the app from hanging
        };
        document.head.appendChild(link);
    });
}