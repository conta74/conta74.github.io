// ══════════════════════════════════════════════════════════
// CONFIGURATION — conta74.fr
// ══════════════════════════════════════════════════════════

const SITE_CONFIG = {
    worker_url: 'https://conta74-api.conta74fr.workers.dev',
    web3forms_key: '47e85ac4-977a-4295-af9f-6babc3f45282',
    owner_phone: '07 60 29 19 60',
};

// ══════════════════════════════════════════════════════════
// API via Cloudflare Worker
// ══════════════════════════════════════════════════════════

const WorkerAPI = {
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
                console.error('API read:', err);
                break;
            }
        } while (offset);
        return allRecords;
    },

    async create(table, fields) {
        try {
            const res = await fetch(`${SITE_CONFIG.worker_url}/api/${table}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('API create:', res.status, err);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.error('API create:', err);
            return null;
        }
    }
};

// Envoi Web3Forms
async function sendWeb3Form(formData) {
    formData.append('access_key', SITE_CONFIG.web3forms_key);
    try {
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        return data.success === true;
    } catch (err) {
        console.error('Web3Forms:', err);
        return false;
    }
}
