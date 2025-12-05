import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { parse } from 'csv-parse/sync';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.AGENT_PORT || 8000;
const BASE_DIR = __dirname;
const CSV_DIR = process.env.LEADS_CSV_DIR ? path.resolve(process.env.LEADS_CSV_DIR) : BASE_DIR;
const LEADS_CSV_DEFAULT = path.join(BASE_DIR, 'leads.csv');
let LEADS_CSV = process.env.LEADS_CSV_PATH || LEADS_CSV_DEFAULT;
const SELECTED_FILE_STORE = path.join(BASE_DIR, '.leads_csv');

// Ensure CSV dir exists
if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(BASE_DIR, 'static')));

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CSV_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, safeCsvName(file.originalname));
    }
});
const upload = multer({ storage });

// Helpers
function safeCsvName(name: string): string {
    let safe = path.basename(name).trim();
    if (!safe.toLowerCase().endsWith('.csv')) {
        safe += '.csv';
    }
    return safe.replace(/[^a-zA-Z0-9\-\_\.]/g, '_');
}

function readLeads(csvPath: string): any[] {
    try {
        if (!fs.existsSync(csvPath)) return [];
        const content = fs.readFileSync(csvPath, 'utf-8');
        return parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true
        });
    } catch (e) {
        console.error('Error reading leads:', e);
        return [];
    }
}

function loadPersistedSelectedCsv() {
    try {
        if (fs.existsSync(SELECTED_FILE_STORE)) {
            const data = JSON.parse(fs.readFileSync(SELECTED_FILE_STORE, 'utf-8'));
            if (data.local && fs.existsSync(data.local)) {
                LEADS_CSV = data.local;
            }
        }
    } catch (e) {
        // ignore
    }
}

loadPersistedSelectedCsv();

// State
let activeAgentProcess: any = null;
let activeLeadIndex: number | null = null;
let activeCampaign: string = '';

// Routes

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Agentic Dialing API' });
});

app.get('/leads', (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;
    const leads = readLeads(LEADS_CSV);
    const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, leads.length);
    const currentLeads = leads.slice(start, end);

    res.json({
        leads: currentLeads,
        page,
        total_pages: totalPages,
        start_index: start,
        total_leads: leads.length
    });
});

app.get('/status', (req, res) => {
    res.json({
        status: activeAgentProcess ? 'running' : 'idle',
        running: !!activeAgentProcess,
        lead_index: activeLeadIndex,
        campaign: activeCampaign,
        campaign_label: activeCampaign,
        auto_next: false,
        lead: null // Could populate this if we tracked the current lead details
    });
});

app.post('/start_call', (req, res) => {
    const leadIndex = parseInt(req.body.lead_global_index);
    const campaign = req.body.campaign;

    if (activeAgentProcess) {
        return res.status(400).json({ error: 'Agent already running' });
    }

    activeLeadIndex = leadIndex;
    activeCampaign = campaign || '';

    // Spawn agent process
    const env = { ...process.env };
    env.LEAD_INDEX = (leadIndex + 1).toString();
    env.RUN_SINGLE_CALL = '1';

    console.log(`Spawning agent for lead index ${leadIndex + 1}`);

    const PROJECT_ROOT = path.resolve(BASE_DIR, '../../');
    // Use node directly with ts-node/register to ensure .ts files are handled correctly
    const agentProcess = spawn('node', [
        '-r', 'ts-node/register',
        path.join(BASE_DIR, 'agent.ts'),
        'start'
    ], {
        env,
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: true
    });

    activeAgentProcess = agentProcess;

    agentProcess.on('error', (err) => {
        console.error('Failed to start agent:', err);
        activeAgentProcess = null;
        activeLeadIndex = null;
    });

    agentProcess.on('exit', (code) => {
        console.log(`Agent process exited with code ${code}`);
        activeAgentProcess = null;
        activeLeadIndex = null;
    });

    res.json({ ok: true, message: 'Agent spawned', leadIndex, campaign });
});

app.post('/end_call', (req, res) => {
    if (activeAgentProcess) {
        // In Windows with shell: true, we might need to kill the process tree or use taskkill
        // But for now, try standard kill
        activeAgentProcess.kill();
        activeAgentProcess = null;
        activeLeadIndex = null;
        res.json({ ok: true, message: 'Call ended' });
    } else {
        res.json({ ok: false, message: 'No active call' });
    }
});

app.post('/stop_all', (req, res) => {
    if (activeAgentProcess) {
        activeAgentProcess.kill();
        activeAgentProcess = null;
        activeLeadIndex = null;
    }
    res.json({ ok: true, message: 'All calls stopped' });
});

app.get('/campaigns', (req, res) => {
    // Mock campaigns for now
    res.json({
        campaigns: [
            { key: 'default', label: 'Default Campaign' },
            { key: 'sales', label: 'Sales Outreach' }
        ]
    });
});

app.post('/select_campaign', (req, res) => {
    activeCampaign = req.body.campaign;
    res.json({ ok: true, campaign: activeCampaign });
});

// API Routes for CSV management (mirroring Python API)
// ... (keep existing CSV routes but ensure they match /api/csv prefix if that's what frontend expects)
// The frontend uses /csv/list (no /api prefix in agenticApi.ts if baseURL includes /api/agentic?)
// Wait, agenticApi.ts BASE is .../api/agentic
// So endpoints are /api/agentic/csv/list
// My server is at root.
// I should probably mount these under /api/agentic or change frontend to use root.
// Changing frontend config is easier.

app.get('/csv/list', (req, res) => {
    try {
        const files = fs.readdirSync(CSV_DIR)
            .filter(f => f.toLowerCase().endsWith('.csv'))
            .map(f => {
                const stats = fs.statSync(path.join(CSV_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    mtime: Math.floor(stats.mtimeMs / 1000),
                    active: path.resolve(path.join(CSV_DIR, f)) === path.resolve(LEADS_CSV)
                };
            });
        res.json({ ok: true, files });
    } catch (e) {
        res.status(500).json({ ok: false, error: 'Failed to list files' });
    }
});

app.post('/csv/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ detail: 'No file provided' });
    }
    res.json({ ok: true, name: req.file.filename });
});

app.post('/csv/select', (req, res) => {
    const name = safeCsvName(req.body.name);
    const target = path.join(CSV_DIR, name);

    if (fs.existsSync(target)) {
        LEADS_CSV = target;
        fs.writeFileSync(SELECTED_FILE_STORE, JSON.stringify({ local: target }));
        res.json({ ok: true, active: name });
    } else {
        res.status(404).json({ detail: 'CSV not found' });
    }
});

app.delete('/csv/:name', (req, res) => {
    const name = safeCsvName(req.params.name);
    const target = path.join(CSV_DIR, name);

    if (path.resolve(target) === path.resolve(LEADS_CSV)) {
        return res.status(400).json({ detail: 'Cannot delete active CSV' });
    }

    if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        res.json({ ok: true });
    } else {
        res.status(404).json({ detail: 'CSV not found' });
    }
});

app.get('/csv/preview', (req, res) => {
    const name = safeCsvName(req.query.name as string);
    const limit = parseInt(req.query.limit as string) || 10;
    const target = path.join(CSV_DIR, name);

    if (fs.existsSync(target)) {
        const leads = readLeads(target);
        const headers = leads.length > 0 ? Object.keys(leads[0]) : [];
        res.json({ ok: true, headers, rows: leads.slice(0, limit) });
    } else {
        res.status(404).json({ detail: 'CSV not found' });
    }
});

app.get('/csv/download/:name', (req, res) => {
    const name = safeCsvName(req.params.name);
    const target = path.join(CSV_DIR, name);
    if (fs.existsSync(target)) {
        res.download(target);
    } else {
        res.status(404).json({ detail: 'CSV not found' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Agent Dashboard running on http://localhost:${PORT}`);
});
