// ==UserScript==
// @name         Image Black to Transparent Converter Pro
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Ubah area hitam pada gambar menjadi 100% transparan agar background terlihat penuh
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
            width: 340px;
            padding: 16px;
            background: rgba(10, 10, 10, .96);
            border: 1.5px solid rgba(244, 201, 93, .5);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .7);
            color: #fffdf5;
            font-family: 'Rajdhani', Arial, sans-serif;
            display: none;
            animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-height: 70vh;
            overflow-y: auto;
        }

        #img-transparency-panel::-webkit-scrollbar {
            width: 6px;
        }

        #img-transparency-panel::-webkit-scrollbar-track {
            background: rgba(244, 201, 93, .05);
            border-radius: 10px;
        }

        #img-transparency-panel::-webkit-scrollbar-thumb {
            background: rgba(244, 201, 93, .3);
            border-radius: 10px;
        }

        #img-transparency-panel::-webkit-scrollbar-thumb:hover {
            background: rgba(244, 201, 93, .5);
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

        .img-panel-close {
            position: absolute;
            top: 10px;
            right: 12px;
            width: 28px;
            height: 28px;
            border: 0;
            background: rgba(244, 201, 93, .15);
            color: #ffe9a3;
            font-size: 20px;
            font-weight: 700;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .img-panel-close:hover {
            background: rgba(244, 201, 93, .3);
            transform: rotate(90deg);
        }

        .img-panel-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffe9a3;
            margin-bottom: 12px;
            margin-top: 0;
            border-bottom: 1px solid rgba(244, 201, 93, .3);
            padding-bottom: 8px;
            font-family: 'Cinzel', Georgia, serif;
            letter-spacing: 1px;
        }

        .img-panel-row {
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .img-panel-row-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .img-panel-row label {
            font-size: 12px;
            color: #ffe9a3;
            font-weight: 600;
        }

        .img-panel-value {
            font-size: 12px;
            color: #f4c95d;
            font-weight: 700;
        }

        .img-panel-row input[type="range"] {
            width: 100%;
            height: 5px;
            accent-color: #f4c95d;
            background: rgba(244, 201, 93, .15);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .img-panel-row input[type="range"]:hover {
            background: rgba(244, 201, 93, .25);
        }

        .img-preview-container {
            margin-bottom: 12px;
            padding: 10px;
            background: rgba(0, 0, 0, .4);
            border: 1px solid rgba(244, 201, 93, .3);
            border-radius: 6px;
            text-align: center;
        }

        #img-preview {
            max-width: 100%;
            max-height: 120px;
            object-fit: contain;
            border-radius: 4px;
        }

        .img-preview-label {
            font-size: 11px;
            color: rgba(255, 253, 245, .5);
            margin-top: 6px;
        }

        .img-panel-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
        }

        .img-panel-buttons button {
            padding: 10px 12px;
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

        .img-panel-buttons button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .img-panel-info {
            font-size: 11px;
            color: rgba(255, 253, 245, .6);
            padding: 10px;
            background: rgba(244, 201, 93, .05);
            border-radius: 4px;
            border-left: 2px solid rgba(244, 201, 93, .3);
            line-height: 1.5;
        }

        .img-status {
            font-size: 11px;
            color: #a8f5b1;
            text-align: center;
            margin-top: 8px;
            padding: 6px;
            background: rgba(100, 200, 100, .1);
            border-radius: 4px;
            border-left: 2px solid rgba(100, 200, 100, .3);
            display: none;
        }

        .img-status.show {
            display: block;
        }

        #img-transparency-toggle {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 2147483646;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #f4c95d;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(244, 201, 93, .9), #f4c95d);
            color: #0a0a0a;
            cursor: pointer;
            font-size: 24px;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(244, 201, 93, .4);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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

    function showStatus(message) {
        const status = document.getElementById('img-status');
        if (status) {
            status.textContent = message;
            status.classList.add('show');
            setTimeout(() => status.classList.remove('show'), 3000);
        }
    }

    function createPanel() {
        let panel = document.getElementById('img-transparency-panel');
        let toggle = document.getElementById('img-transparency-toggle');

        if (panel) panel.remove();
        if (toggle) toggle.remove();

        panel = document.createElement('div');
        panel.id = 'img-transparency-panel';
        panel.innerHTML = `
            <button class="img-panel-close" type="button" title="Tutup">×</button>
            <div class="img-panel-title">🎨 Black to Transparent</div>

            <div class="img-preview-container" id="preview-container" style="display: none;">
                <img id="img-preview" alt="Preview">
                <div class="img-preview-label">Preview Hasil</div>
            </div>

            <div class="img-panel-row">
                <div class="img-panel-row-header">
                    <label for="threshold-slider">Threshold (Sensitivitas)</label>
                    <div class="img-panel-value" id="threshold-value">50</div>
                </div>
                <input id="threshold-slider" type="range" min="0" max="255" value="50">
                <div style="font-size: 10px; color: rgba(255, 253, 245, .4);">Semakin tinggi = area yang dihilangkan lebih banyak</div>
            </div>

            <div class="img-panel-row">
                <div class="img-panel-row-header">
                    <label for="tolerance-slider">Tolerance (Smoothing)</label>
                    <div class="img-panel-value" id="tolerance-value">20</div>
                </div>
                <input id="tolerance-slider" type="range" min="0" max="100" value="20">
                <div style="font-size: 10px; color: rgba(255, 253, 245, .4);">Untuk smooth edge hasil transparan</div>
            </div>

            <div class="img-panel-buttons">
                <button id="preview-transparency">👁 Preview</button>
                <button id="apply-transparency">✓ Terapkan</button>
            </div>

            <div class="img-panel-buttons">
                <button id="reset-image">⟲ Reset</button>
                <button id="download-image">💾 Unduh PNG</button>
            </div>

            <div id="img-status" class="img-status"></div>

            <div class="img-panel-info">
                💡 <strong>Cara Pakai:</strong><br>
                1. Klik gambar di halaman<br>
                2. Atur Threshold & Tolerance<br>
                3. Klik Preview untuk lihat<br>
                4. Klik Terapkan untuk simpan<br>
                5. Klik Unduh untuk export PNG
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

        document.getElementById('preview-transparency').addEventListener('click', () => {
            previewTransparency();
        });

        document.getElementById('apply-transparency').addEventListener('click', () => {
            applyTransparency();
        });

        document.getElementById('reset-image').addEventListener('click', () => {
            resetImage();
        });

        document.getElementById('download-image').addEventListener('click', () => {
            downloadImage();
        });

        document.querySelector('.img-panel-close').addEventListener('click', () => {
            panel.classList.remove('active');
            toggle.classList.remove('hidden');
        });

        toggle.addEventListener('click', () => {
            panel.classList.add('active');
            toggle.classList.add('hidden');
        });

        // Add click handler untuk images
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG' && !e.target.id.includes('img-')) {
                e.preventDefault();
                window.selectedImage = e.target;
                window.originalImageSrc = e.target.src;
                panel.classList.add('active');
                toggle.classList.add('hidden');
                showStatus('✓ Gambar dipilih. Atur pengaturan dan klik Preview.');
                document.getElementById('preview-container').style.display = 'none';
            }
        });
    }

    function previewTransparency() {
        const image = window.selectedImage;
        if (!image) {
            showStatus('✗ Silakan pilih gambar terlebih dahulu');
            return;
        }

        const threshold = parseInt(document.getElementById('threshold-slider').value);
        const tolerance = parseInt(document.getElementById('tolerance-slider').value);

        processImage(threshold, tolerance, (canvas) => {
            const preview = document.getElementById('img-preview');
            preview.src = canvas.toDataURL();
            document.getElementById('preview-container').style.display = 'block';
            window.previewCanvas = canvas;
            showStatus('✓ Preview siap. Klik Terapkan untuk simpan.');
        });
    }

    function applyTransparency() {
        const image = window.selectedImage;
        if (!image) {
            showStatus('✗ Silakan pilih gambar terlebih dahulu');
            return;
        }

        const threshold = parseInt(document.getElementById('threshold-slider').value);
        const tolerance = parseInt(document.getElementById('tolerance-slider').value);

        processImage(threshold, tolerance, (canvas) => {
            image.src = canvas.toDataURL();
            window.processedCanvas = canvas;
            showStatus('✓ Transparansi diterapkan! Background terlihat penuh.');
        });
    }

    function processImage(threshold, tolerance, callback) {
        const image = window.selectedImage;
        if (!image) return;

        showStatus('⏳ Memproses gambar...');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

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

            // Process pixels - ubah area hitam menjadi 100% transparan
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Hitung brightness
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

                // Jika pixel gelap (< threshold), buat 100% transparan
                if (brightness < threshold) {
                    data[i + 3] = 0; // Alpha = 0 (100% transparan)
                } else if (brightness < threshold + tolerance) {
                    // Smooth edge dengan gradient
                    const factor = (brightness - threshold) / tolerance;
                    data[i + 3] = Math.round(255 * factor);
                }
                // Else: keep original alpha
            }

            // Put modified image data back
            ctx.putImageData(imageData, 0, 0);

            callback(canvas);
        };

        img.onerror = () => {
            showStatus('✗ Gagal memuat gambar. Coba gambar lain.');
        };

        img.src = image.src;
    }

    function resetImage() {
        const image = window.selectedImage;
        if (!image || !window.originalImageSrc) {
            showStatus('✗ Tidak ada gambar untuk direset');
            return;
        }

        image.src = window.originalImageSrc;
        document.getElementById('preview-container').style.display = 'none';
        showStatus('✓ Gambar direset ke asli.');
    }

    function downloadImage() {
        const canvas = window.processedCanvas;
        if (!canvas) {
            showStatus('✗ Terapkan transparansi terlebih dahulu');
            return;
        }

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `image-transparent-${Date.now()}.png`;
        link.click();
        showStatus('✓ Gambar PNG transparan telah diunduh!');
    }

    function initialize() {
        addStyle();
        createPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
