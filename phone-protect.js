/*  phone-protect.js — Anti-scraping téléphone
 *  ─────────────────────────────────────────────
 *  Inclure sur chaque page :
 *    <script src="phone-protect.js" defer></script>
 *
 *  Le script détecte AUTOMATIQUEMENT tous les liens tel:
 *  et les éléments avec data-phone="protect" puis les
 *  remplace par un bouton « Afficher le numéro ».
 *  Un mini-captcha mathématique est demandé une seule fois,
 *  puis tous les numéros de la page se révèlent.
 *
 *  Le numéro n'apparaît jamais en clair dans le HTML source.
 */
(function () {
    'use strict';

    /* ── Numéro fragmenté (anti-grep) ── */
    const _f = ['\x30\x37', '\x36\x30', '\x32\x39', '\x31\x39', '\x36\x30'];
    const _getDisplay = () => _f.join(' ');
    const _getHref    = () => 'tel:+33' + _f.join('').substring(1);

    let _unlocked = false;
    const _containers = [];

    /* ── CSS injecté ── */
    const css = document.createElement('style');
    css.textContent = `
        .pp-btn{display:inline-flex;align-items:center;gap:.45rem;background:var(--cream,#faf8f5);border:1px dashed var(--sky-dark,#4a90b8);color:var(--sky-dark,#4a90b8);padding:.4rem 1rem;border-radius:8px;font-size:.9rem;font-weight:500;cursor:pointer;transition:all .2s;font-family:inherit;line-height:1.4}
        .pp-btn:hover{background:var(--sky-dark,#4a90b8);color:#fff;border-style:solid}
        .pp-btn.pp-sm{font-size:.8rem;padding:.25rem .7rem}
        .pp-captcha{display:inline-flex;align-items:center;gap:.45rem;background:#fff;border:1px solid #e0d8cf;border-radius:8px;padding:.35rem .7rem;font-size:.88rem;color:#555;animation:ppFade .3s ease}
        .pp-captcha input{width:48px;text-align:center;border:1px solid #ccc;border-radius:4px;padding:.2rem;font-size:.9rem;font-weight:600;font-family:inherit}
        .pp-captcha input:focus{outline:2px solid var(--sky-dark,#4a90b8);border-color:var(--sky-dark,#4a90b8)}
        .pp-captcha button{background:var(--sky-dark,#4a90b8);color:#fff;border:none;border-radius:4px;padding:.25rem .6rem;font-size:.82rem;cursor:pointer;font-family:inherit}
        .pp-err{color:#c0392b;font-size:.78rem;margin-top:.2rem;display:block}
        .pp-revealed a{color:var(--sky-dark,#4a90b8);text-decoration:none;font-weight:500;font-size:inherit}
        .pp-revealed a:hover{text-decoration:underline}
        @keyframes ppFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(css);

    /* ── Captcha aléatoire ── */
    function _gen() {
        const ops = [
            () => { const a = 2 + (Math.random() * 7 | 0), b = 1 + (Math.random() * 7 | 0); return { q: a + ' + ' + b, r: a + b }; },
            () => { const a = 5 + (Math.random() * 10 | 0), b = 1 + (Math.random() * 5 | 0); return { q: a + ' − ' + b, r: a - b }; },
            () => { const a = 2 + (Math.random() * 4 | 0), b = 2 + (Math.random() * 4 | 0); return { q: a + ' × ' + b, r: a * b }; }
        ];
        return ops[Math.random() * ops.length | 0]();
    }

    /* ── Révéler le numéro dans un container ── */
    function _reveal(el) {
        if (!el) return;
        const isSmall = el.classList.contains('pp-zone-sm');
        el.innerHTML = '<span class="pp-revealed"><a href="' + _getHref() + '">'
            + '<i class="fas fa-phone-volume me-1" aria-hidden="true"></i>'
            + _getDisplay() + '</a></span>';
    }

    function _revealAll() {
        _unlocked = true;
        _containers.forEach(_reveal);
    }

    /* ── Afficher le captcha ── */
    function _showCaptcha(el) {
        if (_unlocked) { _reveal(el); return; }

        const c = _gen();
        const uid = 'pp' + (Math.random() * 1e6 | 0);

        el.innerHTML =
            '<span class="pp-captcha">'
            + '<i class="fas fa-robot" aria-hidden="true" style="color:var(--sky-dark,#4a90b8)"></i>'
            + '<span>' + c.q + ' =</span>'
            + '<input type="text" id="' + uid + '" maxlength="3" inputmode="numeric" autocomplete="off" aria-label="Résultat du calcul">'
            + '<button id="' + uid + 'b">OK</button>'
            + '</span>'
            + '<span id="' + uid + 'e" class="pp-err"></span>';

        const inp = document.getElementById(uid);
        const btn = document.getElementById(uid + 'b');
        const err = document.getElementById(uid + 'e');

        function check() {
            if (parseInt(inp.value, 10) === c.r) {
                _revealAll();
            } else {
                err.textContent = 'Mauvaise réponse, réessayez.';
                inp.value = '';
                inp.focus();
            }
        }

        btn.addEventListener('click', check);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
        setTimeout(function () { inp.focus(); }, 80);
    }

    /* ── Initialisation au chargement ── */
    function _init() {
        /*  1) Chercher tous les <a href="tel:...760291960"> et les remplacer  */
        document.querySelectorAll('a[href*="760291960"]').forEach(function (a) {
            const wrap = document.createElement('span');
            wrap.className = 'pp-zone';
            // Détecter si c'est dans un contexte compact (footer, warning-box…)
            const parent = a.closest('.footer, .footer-list, .warning-box, [class*="small"], small');
            if (parent) wrap.classList.add('pp-zone-sm');
            a.parentNode.replaceChild(wrap, a);
            _containers.push(wrap);
        });

        /*  2) Chercher les éléments explicites data-phone="protect"  */
        document.querySelectorAll('[data-phone="protect"]').forEach(function (el) {
            _containers.push(el);
        });

        /*  3) Injecter les boutons  */
        _containers.forEach(function (el) {
            const sm = el.classList.contains('pp-zone-sm');
            el.innerHTML = '<button class="pp-btn' + (sm ? ' pp-sm' : '') + '">'
                + '<i class="fas fa-lock" aria-hidden="true"></i>'
                + (sm ? 'Afficher' : 'Afficher le numéro')
                + '</button>';
            el.querySelector('.pp-btn').addEventListener('click', function () {
                _showCaptcha(el);
            });
        });
    }

    /* ── Lancer ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
