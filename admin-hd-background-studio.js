// ==UserScript==
// @name         Admin HD Background Studio Pro
// @namespace    http://tampermonkey.net/
// @version      24.0
// @description  Background HD (gambar & video) full transparan dengan warna teks adaptif, dukungan file besar, IndexedDB, sinkronisasi lintas panel, mode stretch, dan pilihan tema elegan
// @author       You
// @match        https://masakanrumah.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_BACKGROUND =
        'https://BLANK OF NARNIA.jpg';

    const DATABASE_NAME = 'admin-hd-background-database';
    const STORE_NAME = 'backgrounds';
    const IMAGE_KEY = 'active-background';
    const SETTINGS_KEY = 'active-settings';
    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;
    const MAX_IMAGE_DIMENSION = 4096;
    const CHANNEL_NAME = 'admin-hd-background-channel';

    const DEFAULT_SETTINGS = {
        theme: 'gold',
        position: 'center top',
        size: 'cover',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
    };

    const THEMES = {
        gold: {
            label: 'Royal Gold',
            primary: '#f4c95d',
            primaryRgb: '244, 201, 93',
            light: '#ffe9a3',
            dark: '#3d3d3d',
            darkRgb: '61, 61, 61',
            headingFont: "'Cinzel', Georgia, serif"
        },
        silver: {
            label: 'Platinum Silver',
            primary: '#c9d3dc',
            primaryRgb: '201, 211, 220',
            light: '#eef3f7',
            dark: '#2a2d32',
            darkRgb: '42, 45, 50',
            headingFont: "'Cormorant Garamond', Georgia, serif"
        },
        emerald: {
            label: 'Emerald Noir',
            primary: '#4fb987',
            primaryRgb: '79, 185, 135',
            light: '#a9f0cf',
            dark: '#1a3d2a',
            darkRgb: '26, 61, 42',
            headingFont: "'Playfair Display', Georgia, serif"
        },
        sapphire: {
            label: 'Sapphire Midnight',
            primary: '#6f92ff',
            primaryRgb: '111, 146, 255',
            light: '#c3d2ff',
            dark: '#1a2850',
            darkRgb: '26, 40, 80',
            headingFont: "'Playfair Display', Georgia, serif"
        },
        crimson: {
            label: 'Crimson Imperial',
            primary: '#d94a54',
            primaryRgb: '217, 74, 84',
            light: '#ffb3b8',
            dark: '#3d1a20',
            darkRgb: '61, 26, 32',
            headingFont: "'Cinzel', Georgia, serif"
        },
        rose: {
            label: 'Rose Quartz',
            primary: '#e3a9b4',
            primaryRgb: '227, 169, 180',
            light: '#ffdee5',
            dark: '#3d2a30',
            darkRgb: '61, 42, 48',
            headingFont: "'Cormorant Garamond', Georgia, serif"
        }
    };

    let currentObjectUrl = null;
    let currentSettings = { ...DEFAULT_SETTINGS };
    let saveSettingsTimer = null;
    let brightnessSampleTimer = null;
    const BRIGHTNESS_SAMPLE_INTERVAL_MS = 1200;
    const BRIGHTNESS_SAMPLE_SIZE = 24;
    const BRIGHTNESS_THRESHOLD = 140;

    const syncChannel =
        typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel(CHANNEL_NAME)
            : null;

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&family=Playfair+Display:wght@500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

        :root {
            --primary: #f4c95d;
            --primary-rgb: 244, 201, 93;
            --primary-light: #ffe9a3;
            --dark-bg: #3d3d3d;
            --dark-bg-rgb: 61, 61, 61;
            --white: #fffdf5;
            --text-color: var(--white);
            --outline-color: rgba(0, 0, 0, .5);
            --accent-text-color: var(--primary-light);
            --heading-font: 'Cinzel', Georgia, serif;
            --admin-background: url("${DEFAULT_BACKGROUND}");
            --background-position: center top;
            --background-size: cover;
            --background-object-fit: cover;
            --background-brightness: 100%;
            --background-contrast: 100%;
            --background-saturation: 100%;
            --background-blur: 0px;
        }

        html,
        body {
            min-height: 100%;
            background:
                linear-gradient(
                    rgba(0, 0, 0, .35),
                    rgba(0, 0, 0, .50)
                ),
                var(--admin-background)
                var(--background-position)
                / var(--background-size)
                fixed
                no-repeat !important;
            background-color: #0a0a0a !important;
            color: var(--text-color) !important;
            font-family: 'Rajdhani', Arial, sans-serif !important;
        }

        body {
            letter-spacing: .2px !important;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            background:
                linear-gradient(
                    rgba(0, 0, 0, .04),
                    rgba(0, 0, 0, .04)
                );
            filter:
                brightness(var(--background-brightness))
                contrast(var(--background-contrast))
                saturate(var(--background-saturation))
                blur(var(--background-blur));
            transform: scale(1.01);
        }

        table,
        tbody,
        tr,
        td,
        th,
        div,
        form {
            background-color: transparent !important;
        }

        body > table:first-child,
        body > div:first-child,
        td[colspan],
        td[width="180"],
        td[width="200"],
        td[width="15%"] {
            background: rgba(var(--dark-bg-rgb), .4) !important;
            border-color: rgba(var(--primary-rgb), .4) !important;
            backdrop-filter: blur(8px) !important;
            border-radius: 6px !important;
        }

        body,
        body font,
        body span,
        body td,
        body th,
        body label,
        body p {
            color: var(--text-color) !important;
            text-shadow:
                -0.5px -0.5px 1px var(--outline-color),
                0.5px -0.5px 1px var(--outline-color),
                -0.5px 0.5px 1px var(--outline-color),
                0.5px 0.5px 1px var(--outline-color),
                0 0 3px var(--outline-color) !important;
        }

        body a,
        body a:visited,
        body font a {
            color: var(--accent-text-color) !important;
            font-weight: 700 !important;
            text-shadow:
                -0.5px -0.5px 1px var(--outline-color),
                0.5px -0.5px 1px var(--outline-color),
                -0.5px 0.5px 1px var(--outline-color),
                0.5px 0.5px 1px var(--outline-color) !important;
            text-decoration: none !important;
            transition: color 0.3s ease !important;
        }

        body a:hover {
            color: #ffffff !important;
            text-decoration: underline !important;
        }

        table[border="1"],
        table.search,
        .content,
        #main-content,
        table[cellspacing],
        table[cellpadding] {
            background: rgba(var(--dark-bg-rgb), .35) !important;
            border: 1px solid rgba(var(--primary-rgb), .4) !important;
            border-radius: 8px !important;
            backdrop-filter: blur(8px) !important;
        }

        th,
        tr:first-child td {
            background: rgba(var(--primary-rgb), .15) !important;
            color: var(--accent-text-color) !important;
            font-family: var(--heading-font) !important;
            font-weight: 700 !important;
        }

        td,
        th {
            border-color: rgba(var(--primary-rgb), .25) !important;
        }

        tr:hover,
        tr:hover td {
            background: rgba(var(--primary-rgb), .12) !important;
            transition: background 0.2s ease !important;
        }

        input,
        select,
        textarea,
        button {
            box-sizing: border-box !important;
            color: var(--white) !important;
            background: rgba(10, 10, 10, .7) !important;
            border: 1.5px solid rgba(var(--primary-rgb), .5) !important;
            border-radius: 6px !important;
            font-family: 'Rajdhani', Arial, sans-serif !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
        }

        input:focus,
        select:focus,
        textarea:focus {
            outline: none !important;
            border-color: var(--primary) !important;
            box-shadow: 0 0 12px rgba(var(--primary-rgb), .3) !important;
            background: rgba(10, 10, 10, .9) !important;
        }

        button,
        input[type="submit"],
        input[type="button"] {
            background: linear-gradient(135deg, rgba(var(--primary-rgb), .8), var(--primary)) !important;
            color: #0a0a0a !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(var(--primary-rgb), .3) !important;
        }

        button:hover,
        input[type="submit"]:hover,
        input[type="button"]:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 16px rgba(var(--primary-rgb), .4) !important;
        }

        button:active,
        input[type="submit"]:active,
        input[type="button"]:active {
            transform: translateY(0) !important;
        }

        img,
        video,
        canvas {
            max-width: 100% !important;
            height: auto !important;
        }

        #admin-hd-panel,
        #admin-hd-panel * {
            box-sizing: border-box;
            font-family: 'Rajdhani', Arial, sans-serif;
        }

        #admin-hd-panel {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 2147483647;
            width: 360px;
            color: var(--white);
            background: rgba(10, 10, 10, .96);
            border: 1.5px solid rgba(var(--primary-rgb), .5);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .7);
            overflow: hidden;
            animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
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

        #admin-hd-panel .title {
            padding: 16px 18px;
            color: var(--primary-light);
            background: linear-gradient(135deg, rgba(var(--primary-rgb), .15), rgba(var(--primary-rgb), .05));
            border-bottom: 1.5px solid rgba(var(--primary-rgb), .3);
            font-family: var(--heading-font);
            font-weight: 700;
            font-size: 16px;
            letter-spacing: 1px;
        }

        #admin-hd-panel .content {
            padding: 16px;
            max-height: 65vh;
            overflow-y: auto;
        }

        #admin-hd-panel .content::-webkit-scrollbar {
            width: 6px;
        }

        #admin-hd-panel .content::-webkit-scrollbar-track {
            background: rgba(var(--primary-rgb), .05);
            border-radius: 10px;
        }

        #admin-hd-panel .content::-webkit-scrollbar-thumb {
            background: rgba(var(--primary-rgb), .3);
            border-radius: 10px;
        }

        #admin-hd-panel .content::-webkit-scrollbar-thumb:hover {
            background: rgba(var(--primary-rgb), .5);
        }

        #admin-hd-panel .drop-zone {
            display: block;
            padding: 24px 12px;
            border: 2px dashed rgba(var(--primary-rgb), .5);
            border-radius: 8px;
            color: var(--primary-light);
            text-align: center;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s ease;
            background: rgba(var(--primary-rgb), .05);
        }

        #admin-hd-panel .drop-zone.active,
        #admin-hd-panel .drop-zone:hover {
            background: rgba(var(--primary-rgb), .15);
            border-color: var(--primary);
            box-shadow: 0 0 16px rgba(var(--primary-rgb), .2);
        }

        #admin-hd-panel .drop-zone small {
            display: block;
            margin-top: 6px;
            font-size: 11px;
            color: rgba(255, 253, 245, .6);
        }

        #admin-hd-panel input[type="file"] {
            display: none;
        }

        #admin-hd-preview,
        #admin-hd-preview-video {
            display: none;
            width: 100%;
            max-height: 140px;
            margin-top: 12px;
            object-fit: contain;
            background: rgba(0, 0, 0, .4);
            border: 1px solid rgba(var(--primary-rgb), .3);
            border-radius: 6px;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        #admin-hd-bg-video {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            display: none;
            pointer-events: none;
            object-fit: var(--background-object-fit);
            object-position: var(--background-position);
            filter:
                brightness(var(--background-brightness))
                contrast(var(--background-contrast))
                saturate(var(--background-saturation))
                blur(var(--background-blur));
        }

        #admin-hd-panel .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
            gap: 10px;
            margin-top: 12px;
            font-size: 13px;
        }

        #admin-hd-panel label {
            color: var(--primary-light);
            font-weight: 600;
        }

        #admin-hd-panel input[type="range"] {
            width: 100%;
            height: 5px;
            accent-color: var(--primary);
            background: rgba(var(--primary-rgb), .15);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        #admin-hd-panel input[type="range"]:hover {
            background: rgba(var(--primary-rgb), .25);
        }

        #admin-hd-panel select,
        #admin-hd-panel input[type="range"] {
            padding: 6px 8px;
        }

        #admin-hd-panel .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
        }

        #admin-hd-panel .actions button {
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
        }

        #admin-hd-panel #admin-hd-reset {
            background: linear-gradient(135deg, rgba(200, 100, 100, .8), rgba(220, 120, 120, 1)) !important;
        }

        #admin-hd-panel #admin-hd-reset:hover {
            box-shadow: 0 6px 16px rgba(220, 120, 120, .4) !important;
        }

        #admin-hd-panel .status {
            min-height: 20px;
            margin-top: 12px;
            padding: 8px 10px;
            color: #a8f5b1;
            font-size: 12px;
            text-align: center;
            background: rgba(100, 200, 100, .1);
            border-radius: 4px;
            border-left: 2px solid rgba(100, 200, 100, .3);
            animation: fadeIn 0.3s ease;
        }

        #admin-hd-panel .sync-note {
            margin-top: 8px;
            color: rgba(255, 253, 245, .5);
            font-size: 11px;
            text-align: center;
        }

        #admin-hd-panel .close {
            position: absolute;
            top: 10px;
            right: 12px;
            width: 28px;
            height: 28px;
            border: 0 !important;
            background: rgba(var(--primary-rgb), .15) !important;
            color: var(--primary-light) !important;
            font-size: 20px;
            font-weight: 700;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.3s ease !important;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #admin-hd-panel .close:hover {
            background: rgba(var(--primary-rgb), .3) !important;
            transform: rotate(90deg) !important;
        }

        #admin-hd-panel {
            display: none;
        }

        #admin-hd-panel.is-open {
            display: block;
        }

        #admin-hd-toggle {
            position: fixed;
            right: 18px;
            bottom: 18px;
            z-index: 2147483646;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 52px;
            height: 52px;
            border: 2px solid var(--primary);
            border-radius: 50%;
            color: #0a0a0a;
            background: linear-gradient(135deg, rgba(var(--primary-rgb), .9), var(--primary));
            cursor: pointer;
            font-size: 24px;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(var(--primary-rgb), .4);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: pulse 2s infinite;
        }

        #admin-hd-toggle:hover {
            transform: scale(1.12);
            box-shadow: 0 12px 32px rgba(var(--primary-rgb), .5);
        }

        #admin-hd-toggle:active {
            transform: scale(0.95);
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(var(--primary-rgb), .4);
            }
            50% {
                box-shadow: 0 8px 32px rgba(var(--primary-rgb), .6);
            }
        }

        @media (max-width: 520px) {
            #admin-hd-panel {
                right: 8px;
                bottom: 8px;
                width: calc(100vw - 16px);
            }

            #admin-hd-toggle {
                right: 8px;
                bottom: 8px;
            }
        }
    `;

    function addStyle() {
        GM_addStyle(css);
    }

    function setStatus(message) {
        const element = document.querySelector('#admin-hd-status');

        if (element) {
            element.textContent = message;
        }
    }

    // ---------------------------------------------------------------
    // IndexedDB
    // ---------------------------------------------------------------

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, 1);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function putValue(key, value) {
        const database = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                'readwrite'
            );

            transaction.objectStore(STORE_NAME).put(value, key);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async function getValue(key) {
        const database = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                'readonly'
            );

            const request = transaction.objectStore(STORE_NAME).get(key);

            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteValue(key) {
        const database = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                'readwrite'
            );

            transaction.objectStore(STORE_NAME).delete(key);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    }

    const saveImage = blob => putValue(IMAGE_KEY, blob);
    const loadImage = () => getValue(IMAGE_KEY);
    const deleteImage = () => deleteValue(IMAGE_KEY);

    const saveSettings = settings => putValue(SETTINGS_KEY, settings);
    const loadSettings = () => getValue(SETTINGS_KEY);
    const deleteSettings = () => deleteValue(SETTINGS_KEY);

    // ---------------------------------------------------------------
    // Applying state to the page
    // ---------------------------------------------------------------

    function computeAverageBrightness(source) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = BRIGHTNESS_SAMPLE_SIZE;
            canvas.height = BRIGHTNESS_SAMPLE_SIZE;

            const context = canvas.getContext('2d', {
                willReadFrequently: true
            });

            if (!context) {
                return null;
            }

            context.drawImage(
                source,
                0,
                0,
                BRIGHTNESS_SAMPLE_SIZE,
                BRIGHTNESS_SAMPLE_SIZE
            );

            const { data } = context.getImageData(
                0,
                0,
                BRIGHTNESS_SAMPLE_SIZE,
                BRIGHTNESS_SAMPLE_SIZE
            );

            let total = 0;
            let count = 0;

            for (let i = 0; i < data.length; i += 4) {
                total += 0.299 * data[i] +
                    0.587 * data[i + 1] +
                    0.114 * data[i + 2];
                count += 1;
            }

            return count ? total / count : null;
        } catch (error) {
            return null;
        }
    }

    function updateAdaptiveTextColor(brightness) {
        if (brightness === null || Number.isNaN(brightness)) {
            return;
        }

        const isBright = brightness > BRIGHTNESS_THRESHOLD;

        document.documentElement.style.setProperty(
            '--text-color',
            isBright ? '#0a0a0a' : '#fffdf5'
        );

        document.documentElement.style.setProperty(
            '--outline-color',
            isBright ? 'rgba(255, 255, 255, .5)' : 'rgba(0, 0, 0, .5)'
        );

        document.documentElement.style.setProperty(
            '--accent-text-color',
            isBright ? '#5a4000' : 'var(--primary-light)'
        );
    }

    function stopBrightnessSampling() {
        if (brightnessSampleTimer) {
            clearInterval(brightnessSampleTimer);
            brightnessSampleTimer = null;
        }
    }

    function sampleImageBrightness(objectUrl) {
        const probe = new Image();

        probe.onload = () => {
            updateAdaptiveTextColor(computeAverageBrightness(probe));
        };

        probe.src = objectUrl;
    }

    function startVideoBrightnessSampling(video) {
        stopBrightnessSampling();

        brightnessSampleTimer = setInterval(() => {
            if (video.readyState >= 2) {
                updateAdaptiveTextColor(computeAverageBrightness(video));
            }
        }, BRIGHTNESS_SAMPLE_INTERVAL_MS);
    }

    function getBackgroundVideoElement() {
        let video = document.querySelector('#admin-hd-bg-video');

        if (!video) {
            video = document.createElement('video');
            video.id = 'admin-hd-bg-video';
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            document.body.appendChild(video);
        }

        return video;
    }

    function applyMedia(blob) {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        const isVideo = blob.type && blob.type.startsWith('video/');
        const video = getBackgroundVideoElement();

        if (isVideo) {
            currentObjectUrl = URL.createObjectURL(blob);

            document.documentElement.style.setProperty(
                '--admin-background',
                'none'
            );

            video.src = currentObjectUrl;
            video.style.display = 'block';
            video.play().catch(() => {
                // Autoplay blocked
            });

            video.addEventListener(
                'loadeddata',
                () => startVideoBrightnessSampling(video),
                { once: true }
            );
        } else {
            stopBrightnessSampling();
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.style.display = 'none';

            currentObjectUrl = URL.createObjectURL(blob);

            document.documentElement.style.setProperty(
                '--admin-background',
                `url("${currentObjectUrl}")`
            );

            sampleImageBrightness(currentObjectUrl);
        }

        return currentObjectUrl;
    }

    function resetMediaToDefault() {
        stopBrightnessSampling();

        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        const video = document.querySelector('#admin-hd-bg-video');

        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.style.display = 'none';
        }

        document.documentElement.style.setProperty(
            '--admin-background',
            `url("${DEFAULT_BACKGROUND}")`
        );

        sampleImageBrightness(DEFAULT_BACKGROUND);
    }

    const SIZE_MODES = {
        cover: { backgroundSize: 'cover', objectFit: 'cover' },
        contain: { backgroundSize: 'contain', objectFit: 'contain' },
        stretch: { backgroundSize: '100% 100%', objectFit: 'fill' }
    };

    function applySizeMode(sizeKey) {
        const mode = SIZE_MODES[sizeKey] || SIZE_MODES.cover;

        document.documentElement.style.setProperty(
            '--background-size',
            mode.backgroundSize
        );

        document.documentElement.style.setProperty(
            '--background-object-fit',
            mode.objectFit
        );
    }

    function applyTheme(themeKey) {
        const theme = THEMES[themeKey] || THEMES.gold;

        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty(
            '--primary-rgb',
            theme.primaryRgb
        );
        document.documentElement.style.setProperty(
            '--primary-light',
            theme.light
        );
        document.documentElement.style.setProperty(
            '--dark-bg',
            theme.dark
        );
        document.documentElement.style.setProperty(
            '--dark-bg-rgb',
            theme.darkRgb
        );
        document.documentElement.style.setProperty(
            '--heading-font',
            theme.headingFont
        );
    }

    function applySettings(settings) {
        currentSettings = { ...DEFAULT_SETTINGS, ...settings };

        applyTheme(currentSettings.theme);

        document.documentElement.style.setProperty(
            '--background-position',
            currentSettings.position
        );

        applySizeMode(currentSettings.size);

        document.documentElement.style.setProperty(
            '--background-brightness',
            `${currentSettings.brightness}%`
        );

        document.documentElement.style.setProperty(
            '--background-contrast',
            `${currentSettings.contrast}%`
        );

        document.documentElement.style.setProperty(
            '--background-saturation',
            `${currentSettings.saturation}%`
        );

        document.documentElement.style.setProperty(
            '--background-blur',
            `${currentSettings.blur}px`
        );

        syncControlsToSettings();
    }

    function syncControlsToSettings() {
        const panel = document.querySelector('#admin-hd-panel');

        if (!panel) {
            return;
        }

        const theme = panel.querySelector('#admin-hd-theme');
        const position = panel.querySelector('#admin-hd-position');
        const size = panel.querySelector('#admin-hd-size');
        const brightness = panel.querySelector('#admin-hd-brightness');
        const contrast = panel.querySelector('#admin-hd-contrast');
        const saturation = panel.querySelector('#admin-hd-saturation');
        const blur = panel.querySelector('#admin-hd-blur');

        if (theme) theme.value = currentSettings.theme;
        if (position) position.value = currentSettings.position;
        if (size) size.value = currentSettings.size;
        if (brightness) brightness.value = currentSettings.brightness;
        if (contrast) contrast.value = currentSettings.contrast;
        if (saturation) saturation.value = currentSettings.saturation;
        if (blur) blur.value = currentSettings.blur;
    }

    // ---------------------------------------------------------------
    // Broadcast sync
    // ---------------------------------------------------------------

    function broadcast(message) {
        if (syncChannel) {
            syncChannel.postMessage(message);
        }
    }

    function showPreview(blob) {
        const imagePreview = document.querySelector('#admin-hd-preview');
        const videoPreview = document.querySelector(
            '#admin-hd-preview-video'
        );
        const isVideo = blob.type && blob.type.startsWith('video/');

        if (isVideo) {
            if (imagePreview) imagePreview.style.display = 'none';
            if (videoPreview) {
                videoPreview.src = URL.createObjectURL(blob);
                videoPreview.style.display = 'block';
            }
        } else {
            if (videoPreview) {
                videoPreview.pause();
                videoPreview.removeAttribute('src');
                videoPreview.style.display = 'none';
            }
            if (imagePreview) {
                imagePreview.src = URL.createObjectURL(blob);
                imagePreview.style.display = 'block';
            }
        }
    }

    function hidePreview() {
        const imagePreview = document.querySelector('#admin-hd-preview');
        const videoPreview = document.querySelector(
            '#admin-hd-preview-video'
        );

        if (imagePreview) imagePreview.style.display = 'none';
        if (videoPreview) {
            videoPreview.pause();
            videoPreview.removeAttribute('src');
            videoPreview.style.display = 'none';
        }
    }

    if (syncChannel) {
        syncChannel.onmessage = event => {
            const message = event.data || {};

            if (message.type === 'image-updated' && message.blob) {
                applyMedia(message.blob);
                showPreview(message.blob);
                setStatus('Background diperbarui dari panel lain.');
            } else if (message.type === 'settings-updated' && message.settings) {
                applySettings(message.settings);
            } else if (message.type === 'reset') {
                resetMediaToDefault();
                applySettings(DEFAULT_SETTINGS);
                hidePreview();
                setStatus('Direset dari panel lain.');
            }
        };
    }

    function readImage(file) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Gambar tidak dapat dibaca.'));
            };

            image.src = objectUrl;
        });
    }

    async function processLargeImage(file) {
        setStatus('Memproses gambar besar...');

        const image = await readImage(file);
        const originalWidth = image.naturalWidth;
        const originalHeight = image.naturalHeight;
        const largestSide = Math.max(originalWidth, originalHeight);

        const scale = Math.min(
            1,
            MAX_IMAGE_DIMENSION / largestSide
        );

        const width = Math.max(1, Math.round(originalWidth * scale));
        const height = Math.max(1, Math.round(originalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d', {
            alpha: false,
            colorSpace: 'srgb'
        });

        if (!context) {
            throw new Error('Canvas tidak tersedia.');
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Gagal menghasilkan gambar.'));
                    }
                },
                'image/jpeg',
                0.95
            );
        });
    }

    async function handleMediaUpload(file) {
        if (!file) {
            setStatus('Pilih file gambar atau video yang valid.');
            return;
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            setStatus('Pilih file gambar atau video yang valid.');
            return;
        }

        if (isVideo) {
            if (file.size > MAX_VIDEO_FILE_SIZE) {
                setStatus('Ukuran video melebihi batas 500 MB.');
                return;
            }

            try {
                await saveImage(file);
                applyMedia(file);
                broadcast({ type: 'image-updated', blob: file });
                showPreview(file);
                setStatus('Video berhasil diterapkan dan disimpan ke semua panel.');
            } catch (error) {
                console.error('Gagal menyimpan video:', error);
                setStatus('Browser tidak dapat menyimpan video ini.');
            }

            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setStatus('Ukuran file melebihi batas 250 MB.');
            return;
        }

        try {
            const processedBlob = await processLargeImage(file);

            await saveImage(processedBlob);
            applyMedia(processedBlob);
            broadcast({ type: 'image-updated', blob: processedBlob });
            showPreview(processedBlob);

            setStatus('Gambar berhasil diterapkan dan disimpan ke semua panel.');
        } catch (error) {
            console.error('Gagal memproses gambar:', error);

            try {
                await saveImage(file);
                applyMedia(file);
                broadcast({ type: 'image-updated', blob: file });
                showPreview(file);

                setStatus('Gambar diterapkan tanpa konversi tambahan.');
            } catch (fallbackError) {
                console.error('Fallback gagal:', fallbackError);
                setStatus('Browser tidak dapat membaca file ini.');
            }
        }
    }

    function updateVisualSettings(panel) {
        const settings = {
            theme: panel.querySelector('#admin-hd-theme').value,
            position: panel.querySelector('#admin-hd-position').value,
            size: panel.querySelector('#admin-hd-size').value,
            brightness: Number(
                panel.querySelector('#admin-hd-brightness').value
            ),
            contrast: Number(
                panel.querySelector('#admin-hd-contrast').value
            ),
            saturation: Number(
                panel.querySelector('#admin-hd-saturation').value
            ),
            blur: Number(panel.querySelector('#admin-hd-blur').value)
        };

        currentSettings = settings;

        applyTheme(settings.theme);

        document.documentElement.style.setProperty(
            '--background-position',
            settings.position
        );
        applySizeMode(settings.size);
        document.documentElement.style.setProperty(
            '--background-brightness',
            `${settings.brightness}%`
        );
        document.documentElement.style.setProperty(
            '--background-contrast',
            `${settings.contrast}%`
        );
        document.documentElement.style.setProperty(
            '--background-saturation',
            `${settings.saturation}%`
        );
        document.documentElement.style.setProperty(
            '--background-blur',
            `${settings.blur}px`
        );

        broadcast({ type: 'settings-updated', settings });

        clearTimeout(saveSettingsTimer);
        saveSettingsTimer = setTimeout(() => {
            saveSettings(settings).catch(error => {
                console.error('Gagal menyimpan pengaturan:', error);
            });
        }, 250);
    }

    async function createPanel() {
        document.querySelectorAll(
            '#admin-hd-panel, #admin-hd-toggle, #ai-hd-panel, #ai-hd-toggle'
        ).forEach(element => element.remove());

        const panel = document.createElement('section');
        panel.id = 'admin-hd-panel';

        panel.innerHTML = `
            <div class="title">HD Background Studio Pro</div>

            <button class="close" type="button" title="Tutup">×</button>

            <div class="content">
                <label class="drop-zone" for="admin-hd-file">
                    📁 Klik atau seret gambar/video ke sini
                    <small>JPG, PNG, WEBP, GIF, MP4, WEBM</small>
                </label>

                <input id="admin-hd-file" type="file" accept="image/*,video/*">

                <img id="admin-hd-preview" alt="Preview background">
                <video id="admin-hd-preview-video" muted loop autoplay playsinline></video>

                <div class="row">
                    <label for="admin-hd-theme">Tema</label>
                    <select id="admin-hd-theme">
                        <option value="gold">Royal Gold</option>
                        <option value="silver">Platinum Silver</option>
                        <option value="emerald">Emerald Noir</option>
                        <option value="sapphire">Sapphire Midnight</option>
                        <option value="crimson">Crimson Imperial</option>
                        <option value="rose">Rose Quartz</option>
                    </select>
                </div>

                <div class="row">
                    <label for="admin-hd-position">Posisi</label>
                    <select id="admin-hd-position">
                        <option value="center top">Atas tengah</option>
                        <option value="center center">Tengah</option>
                        <option value="center bottom">Bawah tengah</option>
                        <option value="left top">Kiri atas</option>
                        <option value="right top">Kanan atas</option>
                    </select>
                </div>

                <div class="row">
                    <label for="admin-hd-size">Mode</label>
                    <select id="admin-hd-size">
                        <option value="cover">Cover (penuh, bisa terpotong)</option>
                        <option value="contain">Contain (utuh, bisa ada celah)</option>
                        <option value="stretch">Stretch (penuh &amp; utuh)</option>
                    </select>
                </div>

                <div class="row">
                    <label for="admin-hd-brightness">Kecerahan</label>
                    <input id="admin-hd-brightness"
                        type="range" min="50" max="150" value="100">
                </div>

                <div class="row">
                    <label for="admin-hd-contrast">Kontras</label>
                    <input id="admin-hd-contrast"
                        type="range" min="80" max="150" value="100">
                </div>

                <div class="row">
                    <label for="admin-hd-saturation">Warna</label>
                    <input id="admin-hd-saturation"
                        type="range" min="0" max="180" value="100">
                </div>

                <div class="row">
                    <label for="admin-hd-blur">Blur</label>
                    <input id="admin-hd-blur"
                        type="range" min="0" max="8" value="0">
                </div>

                <div class="actions">
                    <button id="admin-hd-reset" type="button">⟲ Reset</button>
                    <button id="admin-hd-save" type="button">💾 Simpan</button>
                </div>

                <div id="admin-hd-status" class="status">
                    ✓ Siap digunakan.
                </div>
                <div class="sync-note">
                    ⚡ Pengaturan tersinkron otomatis ke semua panel
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const toggle = document.createElement('button');
        toggle.id = 'admin-hd-toggle';
        toggle.type = 'button';
        toggle.textContent = '✦';
        toggle.title = 'Buka HD Background Studio Pro';
        document.body.appendChild(toggle);

        const fileInput = panel.querySelector('#admin-hd-file');
        const dropZone = panel.querySelector('.drop-zone');

        fileInput.addEventListener('change', event => {
            handleMediaUpload(event.target.files[0]);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.add('active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.remove('active');
            });
        });

        dropZone.addEventListener('drop', event => {
            handleMediaUpload(event.dataTransfer.files[0]);
        });

        panel.querySelectorAll(
            'select, input[type="range"]'
        ).forEach(element => {
            element.addEventListener('input', () => {
                updateVisualSettings(panel);
            });
        });

        panel.querySelector('#admin-hd-save').addEventListener(
            'click',
            () => {
                saveSettings(currentSettings)
                    .then(() => {
                        setStatus('✓ Pengaturan tampilan disimpan permanen ke semua panel.');
                    })
                    .catch(error => {
                        console.error('Gagal menyimpan pengaturan:', error);
                        setStatus('✗ Gagal menyimpan pengaturan.');
                    });
            }
        );

        panel.querySelector('#admin-hd-reset').addEventListener(
            'click',
            async () => {
                await deleteImage();
                await deleteSettings();

                resetMediaToDefault();
                applySettings(DEFAULT_SETTINGS);

                hidePreview();

                broadcast({ type: 'reset' });

                setStatus('⟲ Direset. Menyegarkan halaman...');
                setTimeout(() => location.reload(), 800);
            }
        );

        panel.querySelector('.close').addEventListener('click', () => {
            panel.classList.remove('is-open');
            toggle.style.display = 'flex';
        });

        toggle.addEventListener('click', () => {
            panel.classList.add('is-open');
            toggle.style.display = 'none';
        });

        try {
            const [savedMedia, savedSettings] = await Promise.all([
                loadImage(),
                loadSettings()
            ]);

            if (savedMedia) {
                applyMedia(savedMedia);
                showPreview(savedMedia);
            }

            applySettings(savedSettings || DEFAULT_SETTINGS);

            setStatus(
                savedMedia
                    ? '✓ Background tersimpan berhasil dimuat.'
                    : '✓ Siap digunakan.'
            );
        } catch (error) {
            console.error('Gagal memuat data tersimpan:', error);
        }
    }

    function initialize() {
        addStyle();

        if (document.body) {
            createPanel();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }
})();