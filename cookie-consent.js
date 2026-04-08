/*  cookie-consent.js — Bandeau RGPD léger
 *  ────────────────────────────────────────
 *  Inclure sur chaque page :
 *    <script src="cookie-consent.js" defer></script>
 *
 *  Fonctionnement :
 *  - Affiche un bandeau en bas si le visiteur n'a pas encore consenti
 *  - Bloque les iframes Google Maps (data-consent-src) jusqu'au consentement
 *  - Stocke le choix dans localStorage (pas de cookie tiers)
 *  - Bouton « Accepter » et « Refuser » (fonctionnalités essentielles uniquement)
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'conta74_consent';
    const CONSENT_DURATION_DAYS = 180; // 6 mois

    /* ── CSS ── */
    const css = document.createElement('style');
    css.textContent = `
        .cc-banner {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: #2c2520; color: #e8e0d8;
            padding: 1rem 1.5rem;
            z-index: 99999;
            font-size: .88rem; line-height: 1.6;
            box-shadow: 0 -4px 20px rgba(0,0,0,.3);
            animation: ccSlide .4s ease;
            display: flex; flex-wrap: wrap;
            align-items: center; gap: 1rem;
            font-family: 'Raleway', system-ui, sans-serif;
        }
        .cc-banner a { color: #a8cfe0; }
        .cc-text { flex: 1; min-width: 260px; }
        .cc-buttons { display: flex; gap: .5rem; flex-shrink: 0; }
        .cc-btn {
            padding: .45rem 1.2rem; border-radius: 6px;
            font-size: .85rem; font-weight: 600; cursor: pointer;
            border: none; font-family: inherit; transition: all .2s;
        }
        .cc-accept { background: #6aaa64; color: #fff; }
        .cc-accept:hover { background: #5a9a54; }
        .cc-refuse { background: transparent; color: #ccc; border: 1px solid #666; }
        .cc-refuse:hover { background: #444; color: #fff; }
        .cc-map-placeholder {
            background: #f5f0eb; border: 2px dashed #ccc;
            border-radius: 10px; padding: 2rem 1rem;
            text-align: center; color: #888;
            font-size: .9rem; line-height: 1.6;
            min-height: 200px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: .5rem;
        }
        .cc-map-placeholder i { font-size: 2rem; color: #bbb; }
        .cc-map-placeholder button {
            background: var(--sky-dark, #4a90b8); color: #fff;
            border: none; padding: .4rem 1rem; border-radius: 6px;
            font-size: .85rem; cursor: pointer; margin-top: .5rem;
            font-family: inherit;
        }
        .cc-map-placeholder button:hover { opacity: .85; }
        @keyframes ccSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (max-width: 576px) {
            .cc-banner { flex-direction: column; text-align: center; padding: 1rem; }
            .cc-buttons { justify-content: center; width: 100%; }
        }
    `;
    document.head.appendChild(css);

    /* ── Utilitaires ── */
    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() > data.expires) { localStorage.removeItem(STORAGE_KEY); return null; }
            return data.value; // 'accepted' ou 'refused'
        } catch { return null; }
    }

    function setConsent(value) {
        const expires = Date.now() + CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, expires }));
    }

    /* ── Gestion des iframes Google Maps ── */
    function blockMaps() {
        document.querySelectorAll('iframe[src*="google.com/maps"]').forEach(function (iframe) {
            iframe.setAttribute('data-consent-src', iframe.src);
            iframe.removeAttribute('src');
            // Créer un placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'cc-map-placeholder';
            placeholder.innerHTML =
                '<i class="fas fa-map-marked-alt" aria-hidden="true"></i>' +
                '<span>La carte Google Maps est désactivée car elle nécessite votre consentement.</span>' +
                '<button onclick="window._ccAcceptAndLoad()"><i class="fas fa-check me-1"></i>Accepter et afficher la carte</button>' +
                '<a href="https://www.google.com/maps/dir//130+Impasse+du+Bonnant+Les+Contamines-Montjoie" target="_blank" rel="noopener" style="font-size:.82rem;color:var(--sky-dark,#4a90b8);">' +
                '<i class="fas fa-external-link-alt me-1"></i>Ouvrir dans Google Maps</a>';
            iframe.parentNode.insertBefore(placeholder, iframe);
            iframe.style.display = 'none';
        });
    }

    function unblockMaps() {
        document.querySelectorAll('iframe[data-consent-src]').forEach(function (iframe) {
            iframe.src = iframe.getAttribute('data-consent-src');
            iframe.removeAttribute('data-consent-src');
            iframe.style.display = '';
            // Supprimer le placeholder
            const prev = iframe.previousElementSibling;
            if (prev && prev.classList.contains('cc-map-placeholder')) prev.remove();
        });
        // Supprimer les placeholders orphelins
        document.querySelectorAll('.cc-map-placeholder').forEach(el => el.remove());
    }

    /* ── Bandeau ── */
    function showBanner() {
        const banner = document.createElement('div');
        banner.className = 'cc-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Bandeau de consentement aux cookies');
        banner.innerHTML =
            '<div class="cc-text">' +
                '<strong>🍪 Respect de votre vie privée</strong><br>' +
                'Ce site utilise Google Maps pour afficher la localisation du studio. ' +
                'Ce service peut déposer des cookies et transmettre votre adresse IP à Google. ' +
                '<a href="mentions.html#confidentialite">En savoir plus</a>' +
            '</div>' +
            '<div class="cc-buttons">' +
                '<button class="cc-btn cc-accept" id="ccAccept"><i class="fas fa-check me-1"></i>Accepter</button>' +
                '<button class="cc-btn cc-refuse" id="ccRefuse">Refuser</button>' +
            '</div>';
        document.body.appendChild(banner);

        document.getElementById('ccAccept').addEventListener('click', function () {
            setConsent('accepted');
            banner.remove();
            unblockMaps();
        });
        document.getElementById('ccRefuse').addEventListener('click', function () {
            setConsent('refused');
            banner.remove();
        });
    }

    /* ── Bouton "Accepter" depuis le placeholder maps ── */
    window._ccAcceptAndLoad = function () {
        setConsent('accepted');
        unblockMaps();
        // Supprimer le bandeau s'il est encore visible
        const banner = document.querySelector('.cc-banner');
        if (banner) banner.remove();
    };

    /* ── Init ── */
    function init() {
        const consent = getConsent();

        if (consent === 'accepted') {
            // Tout OK, ne rien bloquer
            return;
        }

        // Bloquer les maps
        blockMaps();

        if (consent === null) {
            // Pas encore de choix → afficher le bandeau
            showBanner();
        }
        // Si 'refused', les maps restent bloquées, pas de bandeau
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
