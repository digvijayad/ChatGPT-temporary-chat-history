// ==UserScript==
// @name         ChatGPT Temporary Chat History
// @namespace    https://github.com/digvijayad/ChatGPT-temporary-chat-history
// @version      2.3.1
// @description  Saves ChatGPT Temporary Chat IDs/URLs locally so closed temporary chats can be recovered.
// @author       Digvijay
// @license      MIT
// @homepageURL  https://github.com/digvijayad/ChatGPT-temporary-chat-history
// @supportURL   https://github.com/digvijayad/ChatGPT-temporary-chat-history/issues
// @downloadURL  https://raw.githubusercontent.com/digvijayad/ChatGPT-temporary-chat-history/main/chatgpt-temporary-chat-history.user.js
// @updateURL    https://raw.githubusercontent.com/digvijayad/ChatGPT-temporary-chat-history/main/chatgpt-temporary-chat-history.meta.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const win =
        typeof unsafeWindow !== 'undefined'
            ? unsafeWindow
            : window;

    // ============================================================
    // CONFIG
    // ============================================================

    const STORAGE_KEY = 'chatgpt_temp_chat_history_v2';

    const MAX_HISTORY = 500;

    // Only store Temporary Chats.
    const TEMP_ONLY = true;

    // Position the history button immediately to the left
    // of ChatGPT's native Temporary Chat button.
    const TEMP_HISTORY_GAP = 8;
    const HEADER_TOP_LIMIT = 110;

    // ============================================================
    // STATE
    // ============================================================

    let currentConversationId = null;
    let currentIsTemporary = false;
    let firstPrompt = null;

    let panel = null;
    let historyModal = null;

    let lastKnownLocation =
        location.pathname + location.search;

    const UUID_PATTERN =
        '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

    // ============================================================
    // STORAGE
    // ============================================================

    function getHistory() {
        try {
            const history =
                GM_getValue(
                    STORAGE_KEY,
                    []
                );

            return Array.isArray(history)
                ? history
                : [];

        } catch (error) {
            console.error(
                '[Temp History] Read error:',
                error
            );

            return [];
        }
    }

    function saveHistory(history) {
        try {
            const limited =
                history.slice(
                    0,
                    MAX_HISTORY
                );

            GM_setValue(
                STORAGE_KEY,
                limited
            );

        } catch (error) {
            console.error(
                '[Temp History] Save error:',
                error
            );
        }
    }

    // ============================================================
    // CONVERSATION STATE
    // ============================================================

    function resetConversationState() {
        console.log(
            '[Temp History] Resetting conversation state'
        );

        currentConversationId = null;
        firstPrompt = null;
        currentIsTemporary = false;

        detectTemporaryFromLocation();
    }

    // ============================================================
    // TEMPORARY CHAT DETECTION
    // ============================================================

    function detectTemporaryFromLocation() {
        try {
            const url =
                new URL(location.href);

            const values = [
                url.searchParams.get(
                    'temporary-chat'
                ),
                url.searchParams.get(
                    'temporary_chat'
                ),
                url.searchParams.get(
                    'temporaryChat'
                )
            ];

            if (
                values.some(
                    value =>
                        value === 'true' ||
                        value === '1'
                )
            ) {
                currentIsTemporary = true;

                return true;
            }

        } catch (_) {}

        return currentIsTemporary;
    }

    function detectTemporaryUI() {
        if (currentIsTemporary) {
            return true;
        }

        try {
            const elements =
                document.querySelectorAll(
                    'button, [role="button"], span'
                );

            for (const element of elements) {
                const text =
                    element.textContent
                        ?.trim()
                        .toLowerCase();

                if (
                    text === 'temporary chat' ||
                    text === 'temporary'
                ) {
                    currentIsTemporary = true;

                    return true;
                }
            }

        } catch (_) {}

        return false;
    }

    // ============================================================
    // CURRENT URL INSPECTION
    // ============================================================

    function inspectCurrentUrl() {
        try {
            const currentLocation =
                location.pathname +
                location.search;

            if (
                currentLocation !==
                lastKnownLocation
            ) {
                console.log(
                    '[Temp History] Navigation:',
                    lastKnownLocation,
                    '→',
                    currentLocation
                );

                lastKnownLocation =
                    currentLocation;

                resetConversationState();
            }

            detectTemporaryFromLocation();

            const url =
                new URL(location.href);

            // Normal /c/<UUID>
            const pathMatch =
                url.pathname.match(
                    new RegExp(
                        `/c/(${UUID_PATTERN})`
                    )
                );

            if (pathMatch?.[1]) {
                captureConversation(
                    pathMatch[1],
                    'browser URL'
                );

                return;
            }

            // Conversation ID query parameters.
            const params = [
                'conversationId',
                'conversation_id'
            ];

            for (const param of params) {
                const id =
                    url.searchParams.get(
                        param
                    );

                if (
                    isConversationId(id)
                ) {
                    captureConversation(
                        id,
                        `URL ${param}`
                    );

                    return;
                }
            }

        } catch (_) {}
    }

    // ============================================================
    // NETWORK URL INSPECTION
    // ============================================================

    function inspectNetworkUrl(url) {
        if (
            !url ||
            typeof url !== 'string'
        ) {
            return;
        }

        try {
            const patterns = [
                new RegExp(
                    `/backend-api/conversation/(${UUID_PATTERN})`
                ),

                new RegExp(
                    `/conversation/(${UUID_PATTERN})`
                ),

                new RegExp(
                    `/c/(${UUID_PATTERN})`
                )
            ];

            for (const pattern of patterns) {
                const match =
                    url.match(pattern);

                if (match?.[1]) {
                    captureConversation(
                        match[1],
                        'network request'
                    );

                    return;
                }
            }

        } catch (_) {}
    }

    // ============================================================
    // PAYLOAD INSPECTION
    // ============================================================

    function inspectPayload(
        payload,
        source
    ) {
        if (!payload) {
            return;
        }

        let text;

        if (
            typeof payload ===
            'string'
        ) {
            text = payload;

        } else {
            try {
                text =
                    JSON.stringify(
                        payload
                    );

            } catch (_) {
                return;
            }
        }

        // Temporary Chat flags.
        if (
            /"is_temporary"\s*:\s*true/i.test(text) ||
            /"temporary"\s*:\s*true/i.test(text) ||
            /"temporary_chat"\s*:\s*true/i.test(text)
        ) {
            currentIsTemporary = true;
        }

        // Conversation ID patterns.
        const patterns = [
            new RegExp(
                `"conversation_id"\\s*:\\s*"(${UUID_PATTERN})"`,
                'i'
            ),

            new RegExp(
                `"conversationId"\\s*:\\s*"(${UUID_PATTERN})"`,
                'i'
            ),

            new RegExp(
                `"conversation"\\s*:\\s*"(${UUID_PATTERN})"`,
                'i'
            )
        ];

        for (const pattern of patterns) {
            const match =
                text.match(pattern);

            if (match?.[1]) {
                captureConversation(
                    match[1],
                    source
                );

                return;
            }
        }
    }

    function isConversationId(value) {
        if (!value) {
            return false;
        }

        return new RegExp(
            `^${UUID_PATTERN}$`
        ).test(value);
    }

    // ============================================================
    // FIRST PROMPT / TITLE DETECTION
    // ============================================================

    function detectFirstPrompt() {
        try {
            if (
                !currentConversationId
            ) {
                return null;
            }

            const nodes =
                document.querySelectorAll(
                    '[data-message-author-role="user"]'
                );

            if (!nodes.length) {
                return null;
            }

            const text =
                nodes[0]
                    .innerText
                    ?.trim()
                    .replace(
                        /\s+/g,
                        ' '
                    );

            if (!text) {
                return null;
            }

            const newPrompt =
                text.length > 180
                    ? text.substring(
                        0,
                        180
                    ) + '…'
                    : text;

            if (
                newPrompt !==
                firstPrompt
            ) {
                firstPrompt =
                    newPrompt;

                console.log(
                    '[Temp History] First prompt:',
                    firstPrompt
                );

                updateCurrentHistoryEntry();
            }

            return firstPrompt;

        } catch (_) {
            return null;
        }
    }

    function startPromptObserver() {
        const observer =
            new MutationObserver(
                () => {
                    detectTemporaryUI();

                    if (
                        currentConversationId &&
                        !firstPrompt
                    ) {
                        detectFirstPrompt();
                    }
                }
            );

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );
    }

    // ============================================================
    // SAVE / UPDATE CONVERSATION
    // ============================================================

    function captureConversation(
        id,
        source
    ) {
        if (
            !isConversationId(id)
        ) {
            return;
        }

        // If backend suddenly switches IDs,
        // clear the previous title immediately.
        if (
            currentConversationId &&
            currentConversationId !== id
        ) {
            console.log(
                '[Temp History] Conversation changed:',
                currentConversationId,
                '→',
                id
            );

            firstPrompt = null;
        }

        currentConversationId =
            id;

        detectTemporaryFromLocation();
        detectTemporaryUI();

        if (
            TEMP_ONLY &&
            !currentIsTemporary
        ) {
            return;
        }

        const history =
            getHistory();

        const now =
            new Date().toISOString();

        const existing =
            history.find(
                item =>
                    item.id === id
            );

        const canonicalUrl =
            `${location.origin}/c/${id}`;

        if (existing) {
            existing.lastSeen =
                now;

            existing.url =
                canonicalUrl;

            existing.originalUrl =
                existing.originalUrl ||
                location.href;

            existing.source =
                source;

            existing.detectCount =
                (
                    existing.detectCount ||
                    0
                ) + 1;

            existing.temporary =
                true;

            // IMPORTANT:
            // Only assign title if we have
            // positively detected a new prompt.
            if (firstPrompt) {
                existing.title =
                    firstPrompt;
            }

        } else {
            history.unshift({
                id,

                title:
                    firstPrompt ||
                    'Temporary Chat',

                url:
                    canonicalUrl,

                originalUrl:
                    location.href,

                created:
                    now,

                lastSeen:
                    now,

                temporary:
                    true,

                source,

                detectCount:
                    1
            });
        }

        history.sort(
            (a, b) =>
                new Date(
                    b.lastSeen
                ) -
                new Date(
                    a.lastSeen
                )
        );

        saveHistory(history);

        updateMiniPanel();

        // Wait for the NEW chat DOM.
        setTimeout(
            detectFirstPrompt,
            500
        );

        setTimeout(
            detectFirstPrompt,
            1200
        );

        setTimeout(
            detectFirstPrompt,
            2500
        );
    }

    function updateCurrentHistoryEntry() {
        if (
            !currentConversationId ||
            !firstPrompt
        ) {
            return;
        }

        const history =
            getHistory();

        const entry =
            history.find(
                item =>
                    item.id ===
                    currentConversationId
            );

        if (!entry) {
            return;
        }

        entry.title =
            firstPrompt;

        entry.lastSeen =
            new Date().toISOString();

        saveHistory(history);

        renderHistory();
        updateMiniPanel();
    }

    // ============================================================
    // FETCH INTERCEPTION
    // ============================================================

    const originalFetch =
        win.fetch;

    if (originalFetch) {
        win.fetch =
            async function (...args) {
                try {
                    const input =
                        args[0];

                    const requestUrl =
                        typeof input ===
                        'string'
                            ? input
                            : input?.url;

                    inspectNetworkUrl(
                        requestUrl
                    );

                    if (
                        args[1]?.body
                    ) {
                        inspectPayload(
                            args[1].body,
                            'fetch request'
                        );
                    }

                } catch (_) {}

                const response =
                    await originalFetch.apply(
                        this,
                        args
                    );

                try {
                    inspectNetworkUrl(
                        response.url
                    );

                    const contentType =
                        response.headers
                            ?.get(
                                'content-type'
                            ) || '';

                    if (
                        contentType.includes(
                            'json'
                        ) ||
                        contentType.includes(
                            'text/event-stream'
                        )
                    ) {
                        response
                            .clone()
                            .text()
                            .then(
                                text => {
                                    inspectPayload(
                                        text,
                                        'fetch response'
                                    );
                                }
                            )
                            .catch(
                                () => {}
                            );
                    }

                } catch (_) {}

                return response;
            };
    }

    // ============================================================
    // XHR INTERCEPTION
    // ============================================================

    const originalOpen =
        win.XMLHttpRequest
            .prototype
            .open;

    const originalSend =
        win.XMLHttpRequest
            .prototype
            .send;

    win.XMLHttpRequest
        .prototype
        .open =
        function (
            method,
            url,
            ...args
        ) {
            this.__tempHistoryUrl =
                url;

            inspectNetworkUrl(url);

            return originalOpen.call(
                this,
                method,
                url,
                ...args
            );
        };

    win.XMLHttpRequest
        .prototype
        .send =
        function (body) {
            try {
                if (body) {
                    inspectPayload(
                        body,
                        'XHR request'
                    );
                }

                this.addEventListener(
                    'load',
                    () => {
                        try {
                            inspectNetworkUrl(
                                this.responseURL
                            );

                            if (
                                typeof this
                                    .responseText ===
                                'string'
                            ) {
                                inspectPayload(
                                    this.responseText,
                                    'XHR response'
                                );
                            }

                        } catch (_) {}
                    }
                );

            } catch (_) {}

            return originalSend.call(
                this,
                body
            );
        };

    // ============================================================
    // SPA NAVIGATION DETECTION
    // ============================================================

    const originalPushState =
        win.history
            .pushState;

    const originalReplaceState =
        win.history
            .replaceState;

    win.history.pushState =
        function (...args) {
            const result =
                originalPushState.apply(
                    this,
                    args
                );

            resetConversationState();

            lastKnownLocation =
                location.pathname +
                location.search;

            setTimeout(
                inspectCurrentUrl,
                100
            );

            setTimeout(
                detectFirstPrompt,
                800
            );

            return result;
        };

    win.history.replaceState =
        function (...args) {
            const result =
                originalReplaceState.apply(
                    this,
                    args
                );

            resetConversationState();

            lastKnownLocation =
                location.pathname +
                location.search;

            setTimeout(
                inspectCurrentUrl,
                100
            );

            setTimeout(
                detectFirstPrompt,
                800
            );

            return result;
        };

    win.addEventListener(
        'popstate',
        () => {
            resetConversationState();

            lastKnownLocation =
                location.pathname +
                location.search;

            setTimeout(
                inspectCurrentUrl,
                100
            );

            setTimeout(
                detectFirstPrompt,
                800
            );
        }
    );

    // ============================================================
    // HEADER HISTORY BUTTON
    // ============================================================

    function createMiniPanel() {
        if (panel || !document.body) {
            return;
        }

        panel = document.createElement('button');
        panel.id = 'chatgpt-temp-history-button';
        panel.type = 'button';
        panel.title = 'Temporary Chat History';
        panel.setAttribute('aria-label', 'Temporary Chat History');

        Object.assign(panel.style, {
            position: 'fixed',
            width: '36px',
            height: '36px',
            zIndex: '2147483000',
            background: 'transparent',
            color: 'inherit',
            border: 'none',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '0',
            margin: '0',
            boxSizing: 'border-box',
            userSelect: 'none',
            transition: 'background .15s ease',
        });

        panel.addEventListener('mouseenter', () => {
            panel.style.background = 'rgba(128,128,128,.15)';
        });

        panel.addEventListener('mouseleave', () => {
            panel.style.background = 'transparent';
        });

        panel.addEventListener('click', showHistory);
        document.body.appendChild(panel);

        updateMiniPanel();
        positionHistoryButton();
    }

    function isVisibleHeaderControl(element) {
        if (!element || element === panel || panel?.contains(element)) {
            return false;
        }

        try {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);

            return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.top >= 0 &&
                rect.top < HEADER_TOP_LIMIT &&
                rect.right > window.innerWidth * 0.45 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden'
            );
        } catch (_) {
            return false;
        }
    }

    function getControlText(element) {
        const text = element.textContent?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
        const aria = element.getAttribute('aria-label')?.trim().toLowerCase() || '';
        const title = element.getAttribute('title')?.trim().toLowerCase() || '';
        const testId = element.getAttribute('data-testid')?.trim().toLowerCase() || '';

        return `${text} ${aria} ${title} ${testId}`.trim();
    }

    function getHeaderAnchor() {
        const controls = Array.from(
            document.querySelectorAll('button, [role="button"], a[role="button"]')
        ).filter(isVisibleHeaderControl);

        if (!controls.length) {
            return null;
        }

        const known = controls.filter(element => {
            const value = getControlText(element);

            return (
                value.includes('personalized') ||
                value.includes('temporary chat') ||
                value.includes('temporary mode') ||
                value.includes('share') ||
                value.includes('bookmark') ||
                value.includes('save conversation') ||
                value.includes('save chat') ||
                value.includes('more options') ||
                value.includes('more actions')
            );
        });

        const candidates = known.length ? known : controls;

        return candidates
            .map(element => ({
                element,
                rect: element.getBoundingClientRect(),
            }))
            .sort((a, b) => {
                const topDelta = Math.abs(a.rect.top - b.rect.top);

                if (topDelta > 12) {
                    return a.rect.top - b.rect.top;
                }

                return a.rect.left - b.rect.left;
            })[0]?.element || null;
    }

    function positionHistoryButton() {
        if (!panel) {
            return;
        }

        const anchor = getHeaderAnchor();

        if (!anchor) {
            panel.style.top = '12px';
            panel.style.right = '190px';
            panel.style.left = 'auto';
            panel.style.bottom = 'auto';
            return;
        }

        const rect = anchor.getBoundingClientRect();
        const panelWidth = panel.offsetWidth || 36;
        const panelHeight = panel.offsetHeight || 36;

        const left = Math.max(4, rect.left - panelWidth - TEMP_HISTORY_GAP);
        const top = Math.max(4, rect.top + (rect.height - panelHeight) / 2);

        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    function startButtonPositionObserver() {
        let scheduled = false;

        const update = () => {
            if (scheduled) {
                return;
            }

            scheduled = true;

            requestAnimationFrame(() => {
                scheduled = false;
                positionHistoryButton();
            });
        };

        const observer = new MutationObserver(update);

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-label', 'title', 'data-state'],
        });

        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);

        setInterval(positionHistoryButton, 750);
    }

    function updateMiniPanel() {
        if (!panel) {
            return;
        }

        const history = getHistory();

        panel.innerHTML = `
            <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                style="pointer-events:none;display:block;"
            >
                <circle cx="12" cy="12" r="9"></circle>
                <polyline points="12 7 12 12 15 14"></polyline>
                <path d="M4 4v5h5"></path>
            </svg>

            ${
                history.length
                    ? `
                    <span
                        style="
                            position:absolute;
                            top:-5px;
                            right:-5px;
                            min-width:17px;
                            height:17px;
                            padding:0 4px;
                            border-radius:9px;
                            background:#10a37f;
                            color:white;
                            font-size:10px;
                            line-height:17px;
                            text-align:center;
                            font-family:system-ui,sans-serif;
                            box-sizing:border-box;
                            pointer-events:none;
                        "
                    >
                        ${history.length > 99 ? '99+' : history.length}
                    </span>
                    `
                    : ''
            }
        `;
    }

    // ============================================================
    // HISTORY MODAL
    // ============================================================

    function showHistory() {
        if (!historyModal) {
            createHistoryModal();
        }

        renderHistory();

        historyModal.style.display =
            'flex';

        setTimeout(
            () => {
                historyModal
                    .querySelector(
                        '#temp-history-search'
                    )
                    ?.focus();
            },
            50
        );
    }

    function closeHistory() {
        if (historyModal) {
            historyModal.style.display =
                'none';
        }
    }

    function createHistoryModal() {
        historyModal =
            document.createElement(
                'div'
            );

        Object.assign(
            historyModal.style,
            {
                position:
                    'fixed',

                inset:
                    '0',

                zIndex:
                    '2147483647',

                background:
                    'rgba(0,0,0,.60)',

                display:
                    'none',

                alignItems:
                    'center',

                justifyContent:
                    'center',

                fontFamily:
                    'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
            }
        );

        historyModal.innerHTML = `
            <div
                style="
                    background:#202123;
                    color:#fff;
                    width:min(920px,92vw);
                    height:min(720px,88vh);
                    border-radius:14px;
                    display:flex;
                    flex-direction:column;
                    box-shadow:0 20px 70px rgba(0,0,0,.5);
                    overflow:hidden;
                "
            >

                <div
                    style="
                        padding:16px 18px;
                        border-bottom:1px solid rgba(255,255,255,.12);
                        display:flex;
                        align-items:center;
                        gap:8px;
                    "
                >

                    <div
                        style="
                            font-size:18px;
                            font-weight:650;
                            flex:1;
                        "
                    >
                        Temporary Chat History
                    </div>

                    <button
                        id="temp-export"
                        title="Export history"
                    >
                        Export
                    </button>

                    <button
                        id="temp-import"
                        title="Import history"
                    >
                        Import
                    </button>

                    <button
                        id="temp-close"
                        title="Close"
                        style="
                            width:34px;
                        "
                    >
                        ✕
                    </button>

                </div>

                <div
                    style="
                        padding:10px 18px;
                        border-bottom:1px solid rgba(255,255,255,.10);
                    "
                >

                    <input
                        id="temp-history-search"
                        placeholder="Search temporary chats..."
                        style="
                            box-sizing:border-box;
                            width:100%;
                            padding:10px 11px;
                            border-radius:7px;
                            border:1px solid rgba(255,255,255,.15);
                            background:#2b2c2f;
                            color:white;
                            outline:none;
                        "
                    >

                </div>

                <div
                    id="temp-history-list"
                    style="
                        flex:1;
                        overflow:auto;
                        padding:8px 18px 18px;
                    "
                ></div>

                <div
                    style="
                        border-top:1px solid rgba(255,255,255,.10);
                        padding:10px 18px;
                        color:#888;
                        font-size:11px;
                    "
                >
                    History is stored locally by Tampermonkey.
                </div>

            </div>
        `;

        document.body.appendChild(
            historyModal
        );

        historyModal
            .querySelector(
                '#temp-close'
            )
            .onclick =
            closeHistory;

        historyModal
            .querySelector(
                '#temp-export'
            )
            .onclick =
            exportHistory;

        historyModal
            .querySelector(
                '#temp-import'
            )
            .onclick =
            importHistory;

        historyModal
            .querySelector(
                '#temp-history-search'
            )
            .addEventListener(
                'input',
                renderHistory
            );

        historyModal.addEventListener(
            'click',
            event => {
                if (
                    event.target ===
                    historyModal
                ) {
                    closeHistory();
                }
            }
        );

        document.addEventListener(
            'keydown',
            event => {
                if (
                    event.key ===
                    'Escape'
                ) {
                    closeHistory();
                }
            }
        );

        styleModalButtons();
    }

    function styleModalButtons() {
        historyModal
            ?.querySelectorAll(
                'button'
            )
            .forEach(
                button => {
                    Object.assign(
                        button.style,
                        {
                            background:
                                '#343541',

                            color:
                                '#fff',

                            border:
                                '1px solid rgba(255,255,255,.15)',

                            padding:
                                '7px 10px',

                            borderRadius:
                                '6px',

                            cursor:
                                'pointer'
                        }
                    );
                }
            );
    }

    // ============================================================
    // HISTORY RENDER
    // ============================================================

    function renderHistory() {
        if (!historyModal) {
            return;
        }

        const list =
            historyModal.querySelector(
                '#temp-history-list'
            );

        if (!list) {
            return;
        }

        let history =
            getHistory();

        const search =
            historyModal
                .querySelector(
                    '#temp-history-search'
                )
                ?.value
                ?.toLowerCase()
                ?.trim();

        if (search) {
            history =
                history.filter(
                    item =>
                        (
                            (
                                item.title ||
                                ''
                            ) +
                            ' ' +
                            (
                                item.id ||
                                ''
                            ) +
                            ' ' +
                            (
                                item.url ||
                                ''
                            )
                        )
                            .toLowerCase()
                            .includes(
                                search
                            )
                );
        }

        if (!history.length) {
            list.innerHTML = `
                <div
                    style="
                        color:#999;
                        padding:40px 20px;
                        text-align:center;
                    "
                >
                    No temporary chats saved yet.
                </div>
            `;

            return;
        }

        list.innerHTML =
            history
                .map(
                    item => {
                        const created =
                            formatDate(
                                item.created
                            );

                        const lastSeen =
                            formatDate(
                                item.lastSeen
                            );

                        return `
                            <div
                                data-id="${escapeHtml(
                                    item.id
                                )}"
                                style="
                                    padding:14px 4px;
                                    border-bottom:1px solid rgba(255,255,255,.10);
                                "
                            >

                                <div
                                    style="
                                        display:flex;
                                        align-items:flex-start;
                                        gap:12px;
                                    "
                                >

                                    <div
                                        style="
                                            flex:1;
                                            min-width:0;
                                        "
                                    >

                                        <div
                                            style="
                                                font-size:14px;
                                                font-weight:600;
                                                margin-bottom:5px;
                                                overflow:hidden;
                                                text-overflow:ellipsis;
                                                white-space:nowrap;
                                            "
                                            title="${escapeHtml(
                                                item.title ||
                                                'Temporary Chat'
                                            )}"
                                        >
                                            ${escapeHtml(
                                                item.title ||
                                                'Temporary Chat'
                                            )}
                                        </div>

                                        <div
                                            style="
                                                color:#aaa;
                                                font-size:11px;
                                                word-break:break-all;
                                                margin-bottom:4px;
                                            "
                                        >
                                            ${escapeHtml(
                                                item.id
                                            )}
                                        </div>

                                        <div
                                            style="
                                                color:#777;
                                                font-size:11px;
                                            "
                                        >
                                            Created ${created}
                                            · Last seen ${lastSeen}
                                        </div>

                                    </div>

                                    <div
                                        style="
                                            display:flex;
                                            flex-wrap:wrap;
                                            gap:5px;
                                            justify-content:flex-end;
                                        "
                                    >

                                        ${smallButton(
                                            'Open',
                                            'open'
                                        )}

                                        ${smallButton(
                                            'Copy URL',
                                            'copy-url'
                                        )}

                                        ${smallButton(
                                            'Copy ID',
                                            'copy-id'
                                        )}

                                        ${smallButton(
                                            'Delete',
                                            'delete'
                                        )}

                                    </div>

                                </div>

                            </div>
                        `;
                    }
                )
                .join('');

        list
            .querySelectorAll(
                '[data-action]'
            )
            .forEach(
                button => {
                    button.addEventListener(
                        'click',
                        event => {
                            const action =
                                event
                                    .currentTarget
                                    .dataset
                                    .action;

                            const row =
                                event
                                    .currentTarget
                                    .closest(
                                        '[data-id]'
                                    );

                            const id =
                                row?.dataset
                                    ?.id;

                            if (id) {
                                handleHistoryAction(
                                    action,
                                    id
                                );
                            }
                        }
                    );
                }
            );
    }

    function smallButton(
        label,
        action
    ) {
        return `
            <button
                data-action="${action}"
                style="
                    padding:5px 8px;
                    border-radius:5px;
                    border:1px solid rgba(255,255,255,.15);
                    background:#343541;
                    color:white;
                    cursor:pointer;
                    font-size:11px;
                "
            >
                ${label}
            </button>
        `;
    }

    // ============================================================
    // HISTORY ACTIONS
    // ============================================================

    function handleHistoryAction(
        action,
        id
    ) {
        const history =
            getHistory();

        const item =
            history.find(
                entry =>
                    entry.id === id
            );

        if (!item) {
            return;
        }

        switch (action) {
            case 'open':
                window.open(
                    item.url,
                    '_blank'
                );
                break;

            case 'copy-url':
                copyText(
                    item.url
                );
                break;

            case 'copy-id':
                copyText(
                    item.id
                );
                break;

            case 'delete':
                if (
                    confirm(
                        'Delete this temporary chat from local history?'
                    )
                ) {
                    const updated =
                        history.filter(
                            entry =>
                                entry.id !==
                                id
                        );

                    saveHistory(
                        updated
                    );

                    renderHistory();
                    updateMiniPanel();
                }

                break;
        }
    }

    // ============================================================
    // EXPORT
    // ============================================================

    function exportHistory() {
        const history =
            getHistory();

        const exportData = {
            version:
                '2.1',

            exported:
                new Date()
                    .toISOString(),

            count:
                history.length,

            chats:
                history
        };

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        exportData,
                        null,
                        2
                    )
                ],
                {
                    type:
                        'application/json'
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                'a'
            );

        a.href =
            url;

        a.download =
            `chatgpt-temporary-history-${
                new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    )
            }.json`;

        a.click();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );
    }

    // ============================================================
    // IMPORT
    // ============================================================

    function importHistory() {
        const input =
            document.createElement(
                'input'
            );

        input.type =
            'file';

        input.accept =
            '.json';

        input.onchange =
            async event => {
                const file =
                    event.target
                        .files?.[0];

                if (!file) {
                    return;
                }

                try {
                    const text =
                        await file.text();

                    const data =
                        JSON.parse(
                            text
                        );

                    const imported =
                        Array.isArray(data)
                            ? data
                            : data.chats;

                    if (
                        !Array.isArray(
                            imported
                        )
                    ) {
                        throw new Error(
                            'Invalid history file'
                        );
                    }

                    const existing =
                        getHistory();

                    const merged =
                        new Map();

                    [
                        ...existing,
                        ...imported
                    ].forEach(
                        item => {
                            if (
                                !item ||
                                !item.id
                            ) {
                                return;
                            }

                            const previous =
                                merged.get(
                                    item.id
                                );

                            if (
                                !previous
                            ) {
                                merged.set(
                                    item.id,
                                    item
                                );

                                return;
                            }

                            const currentTime =
                                new Date(
                                    item.lastSeen ||
                                    item.created ||
                                    0
                                ).getTime();

                            const previousTime =
                                new Date(
                                    previous.lastSeen ||
                                    previous.created ||
                                    0
                                ).getTime();

                            if (
                                currentTime >
                                previousTime
                            ) {
                                merged.set(
                                    item.id,
                                    item
                                );
                            }
                        }
                    );

                    const result =
                        Array.from(
                            merged.values()
                        ).sort(
                            (a, b) =>
                                new Date(
                                    b.lastSeen ||
                                    b.created
                                ) -
                                new Date(
                                    a.lastSeen ||
                                    a.created
                                )
                        );

                    saveHistory(
                        result
                    );

                    renderHistory();
                    updateMiniPanel();

                    alert(
                        `${imported.length} record(s) imported.`
                    );

                } catch (error) {
                    alert(
                        'Unable to import history file:\n' +
                        error.message
                    );
                }
            };

        input.click();
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function copyText(text) {
        try {
            GM_setClipboard(
                text
            );

        } catch (_) {
            navigator
                .clipboard
                ?.writeText(
                    text
                );
        }
    }

    function formatDate(value) {
        if (!value) {
            return '';
        }

        try {
            return new Date(
                value
            ).toLocaleString();

        } catch (_) {
            return value;
        }
    }

    function escapeHtml(value) {
        return String(
            value ?? ''
        )
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function initialize() {
        inspectCurrentUrl();

        detectTemporaryFromLocation();

        startPromptObserver();

        const waitForBody =
            setInterval(
                () => {
                    if (
                        document.body
                    ) {
                        clearInterval(
                            waitForBody
                        );

                        createMiniPanel();
                        startButtonPositionObserver();

                        inspectCurrentUrl();

                        setTimeout(
                            detectTemporaryUI,
                            500
                        );

                        setTimeout(
                            detectFirstPrompt,
                            1000
                        );
                    }
                },
                100
            );
    }

    initialize();

})();
