// ══════════════════════════════════════════════════════════
// CONFIGURATION — conta74.fr
// ══════════════════════════════════════════════════════════
// Le token Airtable n'est PAS ici — il est stocké en secret
// dans le Cloudflare Worker. Seule l'URL du proxy est nécessaire.
// Voir SETUP.md pour les instructions de configuration.
// ══════════════════════════════════════════════════════════

const SITE_CONFIG = {

    // ─────────── CLOUDFLARE WORKER (proxy Airtable) ───────────
    // URL de votre Worker déployé sur Cloudflare
    // Format : https://https://conta74-api.conta74fr.workers.dev
    // Remplacer après le déploiement du Worker
    worker_url: 'https://conta74-api.conta74fr.workers.dev',

    // ─────────── WEB3FORMS ───────────
    // Créer une clé sur https://web3forms.com
    web3forms_key: 'VOTRE_CLE_WEB3FORMS',

    // ─────────── PROPRIÉTAIRE ───────────
    owner_phone: '07 60 29 19 60',
};

// ══════════════════════════════════════════════════════════
// API via Cloudflare Worker — Ne pas modifier
// ══════════════════════════════════════════════════════════

const WorkerAPI = {

    // Lire des enregistrements depuis une table
    async read(table, params = {}) {
        const url = new URL(`${SITE_CONFIG.worker_url}/api/${table}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        try {
            const res = await fetch(url.toString());
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error(`API read error (${res.status}):`, err);
                return [];
            }
            const data = await res.json();
            return data.records || [];
        } catch (err) {
            console.error('API read error:', err);
            return [];
        }
    },

    // Lire avec pagination (Airtable pagine à 100 records)
    async readAll(table, params = {}) {
        let allRecords = [];
        let offset = null;
        do {
            const url = new URL(`${SITE_CONFIG.worker_url}/api/${table}`);
            Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
            if (offset) url.searchParams.append('offset', offset);
            try {
                const res = await fetch(url.toString());
                if (!res.ok) break;
                const data = await res.json();
                allRecords = allRecords.concat(data.records || []);
                offset = data.offset || null;
            } catch (err) {
                console.error('API pagination error:', err);
                break;
            }
        } while (offset);
        return allRecords;
    },

    // Créer un enregistrement
    async create(table, fields) {
        try {
            const res = await fetch(`${SITE_CONFIG.worker_url}/api/${table}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error(`API create error (${res.status}):`, err);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error('API create error:', err);
            return null;
        }
    },

    // Health check
    async ping() {
        try {
            const res = await fetch(`${SITE_CONFIG.worker_url}/api/health`);
            return res.ok;
        } catch {
            return false;
        }
    }
};

// Envoi formulaire via Web3Forms
async function sendWeb3Form(formData) {
    formData.append('access_key', SITE_CONFIG.web3forms_key);
    try {
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        console.log('📧 Web3Forms response:', JSON.stringify(data));
        return data.success;
    } catch (err) {
        console.error('Web3Forms error:', err);
        return false;
    }
}

// Vérifications de configuration
function isConfigured() {
    return isWorkerConfigured() && isWeb3Configured();
}

function isWorkerConfigured() {
    return !SITE_CONFIG.worker_url.includes('VOTRE-COMPTE');
}

function isWeb3Configured() {
    return SITE_CONFIG.web3forms_key !== 'VOTRE_CLE_WEB3FORMS';
}
