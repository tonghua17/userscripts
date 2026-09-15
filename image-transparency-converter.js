// ==UserScript==
// @name         Image Black to Transparent Converter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ubah area hitam pada gambar menjadi transparan untuk melihat background dengan jelas
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const css = `
        #img-transparency-panel {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 2147483647;
            width: 320px;
            padding: 16px;
            background: rgba(10, 10, 10, .96);
            border: 1.5px solid rgba(244, 201, 93, .5);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .7);
            color: #fffdf5;
            font-family: 'Rajdhani', Arial, sans-serif;
            display: none;
            animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        #img-transparency-panel.active {
            display: block;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px) translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0) translateX(0);
            }
        }

        .img-panel-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffe9a3;
            margin-bottom: 12px;
            border-bottom: 1px solid rgba(244, 201, 93, .3);
            padding-bottom: 8px;
            font-family: 'Cinzel', Georgia, serif;
            letter-spacing: 1px;
        }

        .img-panel-row {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .img-panel-row label {
            font-size: 12px;
            color: #ffe9a3;
            font-weight: 600;
            min-width: 80px;
        }

        .img-panel-row input[type="range"] {
            flex: 1;
            height: 5px;
            accent-color: #f4c95d;
            background: rgba(244, 201, 93, .15);
            border-radius: 5px;
            cursor: pointer;
        }

        .img-panel-row input[type="range"]:hover {
            background: rgba(244, 201, 93, .25);
        }

        .img-panel-value {
            min-width: 35px;
            text-align: right;
            font-size: 12px;
            color: #f4c95d;
            font-weight: 700;
        }

        .img-panel-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
        }

        .img-panel-buttons button {
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            border: 1px solid rgba(244, 201, 93, .5);
            border-radius: 6px;
            background: linear-gradient(135deg, rgba(244, 201, 93, .8), #f4c95d);
            color: #0a0a0a;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .img-panel-buttons button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(244, 201, 93, .4);
        }

        .img-panel-buttons button:active {
            transform: translateY(0);
        }

        .img-panel-info {
            font-size: 11px;
            color: rgba(255, 253, 245, .5);
            margin-top: 10px;
            text-align: center;
        }

        #img-transparency-toggle {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 2147483646;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #f4c95d;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(244, 201, 93, .9), #f4c95d);
            color: #0a0a0a;
            cursor: pointer;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(244, 201, 93, .4);
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        }

        #img-transparency-toggle:hover {
            transform: scale(1.12);
            box-shadow: 0 12px 32px rgba(244, 201, 93, .5);
        }

        #img-transparency-toggle:active {
            transform: scale(0.95);
        }

        #img-transparency-toggle.hidden {
            display: none;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(244, 201, 93, .4);
            }
            50% {
                box-shadow: 0 8px 32px rgba(244, 201, 93, .6);
            }
        }

        @media (max-width: 520px) {
            #img-transparency-panel {
                right: 8px;
                bottom: 8px;
                width: calc(100vw - 16px);
            }

            #img-transparency-toggle {
                right: 8px;
                bottom: 8px;
            }
        }
    `;

    function addStyle() {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createPanel() {
        let panel = document.getElementById('img-transparency-panel');
        let toggle = document.getElementById('img-transparency-toggle');

        if (panel) panel.remove();
        if (toggle) toggle.remove();

        panel = document.createElement('div');
        panel.id = 'img-transparency-panel';
        panel.innerHTML = `
            <div class="img-panel-title">🎨 Image Transparency</div>

            <div class="img-panel-row">
                <label for="threshold-slider">Threshold</label>
                <input id="threshold-slider" type="range" min="0" max="255" value="50">
                <div class="img-panel-value" id="threshold-value">50</div>
            </div>

            <div class="img-panel-row">
                <label for="tolerance-slider">Tolerance</label>
                <input id="tolerance-slider" type="range" min="0" max="100" value="20">
                <div class="img-panel-value" id="tolerance-value">20</div>
            </div>

            <div class="img-panel-row">
                <label for="opacity-slider">Opacity</label>
                <input id="opacity-slider" type="range" min="0" max="100" value="100">
                <div class="img-panel-value" id="opacity-value">100%</div>
            </div>

            <div class="img-panel-buttons">
                <button id="apply-transparency">✓ Terapkan</button>
                <button id="reset-image">⟲ Reset</button>
            </div>

            <div class="img-panel-info">
                Pilih gambar untuk mengubah area hitam menjadi transparan
            </div>
        `;
        document.body.appendChild(panel);

        toggle = document.createElement('button');
        toggle.id = 'img-transparency-toggle';
        toggle.type = 'button';
        toggle.textContent = '🎨';
        toggle.title = 'Buka Image Transparency Tool';
        document.body.appendChild(toggle);

        // Event listeners
        document.getElementById('threshold-slider').addEventListener('input', (e) => {
            document.getElementById('threshold-value').textContent = e.target.value;
        });

        document.getElementById('tolerance-slider').addEventListener('input', (e) => {
            document.getElementById('tolerance-value').textContent = e.target.value;
        });

        document.getElementById('opacity-slider').addEventListener('input', (e) => {
            document.getElementById('opacity-value').textContent = e.target.value + '%';
        });

        document.getElementById('apply-transparency').addEventListener('click', () => {
            applyTransparency();
        });

        document.getElementById('reset-image').addEventListener('click', () => {
            resetImage();
        });

        toggle.addEventListener('click', () => {
            panel.classList.add('active');
            toggle.classList.add('hidden');
        });

        // Add click handler untuk images
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                window.selectedImage = e.target;
                panel.classList.add('active');
                toggle.classList.add('hidden');
            }
        });
    }

    function applyTransparency() {
        const image = window.selectedImage;
        if (!image) {
            alert('Silakan pilih gambar terlebih dahulu dengan mengkliknya');
            return;
        }

        const threshold = parseInt(document.getElementById('threshold-slider').value);
        const tolerance = parseInt(document.getElementById('tolerance-slider').value);
        const opacity = parseInt(document.getElementById('opacity-slider').value) / 100;

        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Process pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Calculate brightness
                const brightness = (r + g + b) / 3;

                // Jika pixel gelap (mendekati hitam), buat transparan
                if (brightness < threshold) {
                    // Dengan tolerance untuk edge smoothing
                    const alpha = Math.max(0, (brightness - threshold) / (tolerance || 1));
                    data[i + 3] = Math.round(a * alpha * opacity);
                } else {
                    data[i + 3] = Math.round(a * opacity);
                }
            }

            // Put modified image data back
            ctx.putImageData(imageData, 0, 0);

            // Replace image source
            image.src = canvas.toDataURL();

            // Store original for reset
            window.originalImageSrc = img.src;
            window.processedCanvas = canvas;
        };

        img.src = image.src;
    }

    function resetImage() {
        const image = window.selectedImage;
        if (!image || !window.originalImageSrc) {
            return;
        }

        image.src = window.originalImageSrc;
    }

    function initialize() {
        addStyle();
        createPanel();

        // Add export functionality
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG' && window.processedCanvas) {
                e.preventDefault();
                const menu = confirm('Unduh gambar transparan ini?');
                if (menu) {
                    const link = document.createElement('a');
                    link.href = window.processedCanvas.toDataURL();
                    link.download = 'image-transparent.png';
                    link.click();
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
