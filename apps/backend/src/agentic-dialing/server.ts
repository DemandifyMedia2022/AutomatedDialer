import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import { parse } from 'csv-parse/sync';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Import auth utilities from main app
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET not set, authentication will be disabled');
}

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

// Authentication middleware for agentic server
function parseCookies(cookieHeader?: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    cookieHeader.split(';').forEach((c) => {
        const [k, ...rest] = c.trim().split('=');
        out[k] = decodeURIComponent(rest.join('='));
    });
    return out;
}

interface AuthUser {
    userId: number;
    role: string | null;
    email: string;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}

function verifyJwt(token: string): AuthUser | null {
    try {
        if (!JWT_SECRET) return null;
        return jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
        return null;
    }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let token: string | undefined;

        const auth = req.header('authorization') || req.header('Authorization');
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
            token = auth.slice(7);
        }

        if (!token && process.env.USE_AUTH_COOKIE) {
            const cookies = parseCookies(req.headers.cookie);
            token = cookies[process.env.AUTH_COOKIE_NAME || 'auth_token'];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const payload = verifyJwt(token);
        if (!payload) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}

function requireRoles(roles: Array<'agent' | 'manager' | 'qa' | 'superadmin'>) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const role = (req.user?.role || '').toLowerCase();
        const allowed = new Set(roles);
        if (!role || !allowed.has(role as any)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        next();
    };
}

// Rate limiting for file operations
const uploadAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_UPLOADS_PER_MINUTE = 10;

function checkUploadRateLimit(req: express.Request): boolean {
    const userId = req.user?.userId || req.ip;
    const key = `upload:${userId}`;
    const now = Date.now();
    const attempts = uploadAttempts.get(key);
    
    if (!attempts) {
        uploadAttempts.set(key, { count: 1, lastAttempt: now });
        return true;
    }
    
    if (now - attempts.lastAttempt > 60000) {
        uploadAttempts.set(key, { count: 1, lastAttempt: now });
        return true;
    }
    
    if (attempts.count >= MAX_UPLOADS_PER_MINUTE) {
        return false;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    return true;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(BASE_DIR, 'static')));

// Multer setup with security constraints
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CSV_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, safeCsvName(file.originalname));
    }
});

// File validation middleware
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Only allow CSV files
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
        return cb(new Error('Only CSV files are allowed'));
    }
    
    // Check MIME type
    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only CSV files are allowed'));
    }
    
    cb(null, true);
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 1, // Only allow one file at a time
        fields: 10, // Limit number of fields
        fieldNameSize: 100 // Limit field name length
    }
});

// Helpers
function safeCsvName(name: string): string {
    let safe = path.basename(name).trim();
    if (!safe.toLowerCase().endsWith('.csv')) {
        safe += '.csv';
    }
    // More strict filename sanitization
    safe = safe.replace(/[^a-zA-Z0-9\-\_\.]/g, '_');
    // Limit filename length
    if (safe.length > 255) {
        const ext = '.csv';
        const nameWithoutExt = safe.slice(0, -ext.length);
        safe = nameWithoutExt.slice(0, 255 - ext.length) + ext;
    }
    // Prevent reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(safe.toUpperCase().replace('.CSV', ''))) {
        safe = 'file_' + safe;
    }
    return safe;
}

// CSV injection protection
function sanitizeCsvCell(value: string): string {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    // Prevent Excel formula injection by prefixing dangerous cells with single quote
    if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
        return "'" + trimmed;
    }
    return trimmed;
}

// Validate file path to prevent directory traversal
function validateFilePath(filePath: string, allowedDir: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedAllowedDir = path.resolve(allowedDir);
    return resolvedPath.startsWith(resolvedAllowedDir);
}

function readLeads(csvPath: string): any[] {
    try {
        // Validate file path
        if (!validateFilePath(csvPath, CSV_DIR)) {
            console.error('Invalid file path:', csvPath);
            return [];
        }
        
        if (!fs.existsSync(csvPath)) return [];
        const content = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            relax_column_count: true,
            skip_records_with_empty_values: true
        });
        
        // Sanitize all cells to prevent CSV injection
        return records.map((record: any) => {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(record)) {
                sanitized[key] = sanitizeCsvCell(String(value));
            }
            return sanitized;
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
            if (data.local && typeof data.local === 'string' && validateFilePath(data.local, CSV_DIR) && fs.existsSync(data.local)) {
                LEADS_CSV = data.local;
            }
        }
    } catch (e) {
        console.error('Error loading persisted CSV:', e);
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

app.get('/leads', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;
    const leads = readLeads(LEADS_CSV);
    const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, leads.length);
    const currentLeads = leads.slice(start, end);

    console.log(`[CSV] Leads accessed by user ${req.user?.userId}: page ${page}, ${leads.length} total leads`);
    res.json({
        leads: currentLeads,
        page,
        total_pages: totalPages,
        start_index: start,
        total_leads: leads.length
    });
});

app.get('/status', requireAuth, (req, res) => {
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
    /*
    // SECURITY: This block is disabled due to critical RCE vulnerability (shell: true) and lack of auth.
    // Agentic dialing is in beta and not launched.
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
    */
    res.status(503).json({ error: 'Agentic dialing is currently disabled for security reasons.' });
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

app.post('/csv/upload', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: 'No file provided' });
        }
        
        // Rate limiting
        if (!checkUploadRateLimit(req)) {
            fs.unlinkSync(req.file.path);
            return res.status(429).json({ detail: 'Upload rate limit exceeded' });
        }
        
        // Validate uploaded file
        const filePath = req.file.path;
        if (!validateFilePath(filePath, CSV_DIR)) {
            fs.unlinkSync(filePath); // Clean up malicious file
            return res.status(400).json({ detail: 'Invalid file path' });
        }
        
        // Additional file validation
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ detail: 'Empty file not allowed' });
        }
        
        // Validate CSV content
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            parse(content, { columns: false, skip_empty_lines: true });
        } catch (parseError) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ detail: 'Invalid CSV format' });
        }
        
        console.log(`[CSV] File uploaded by user ${req.user?.userId}: ${req.file.filename} (${stats.size} bytes)`);
        res.json({ ok: true, name: req.file.filename });
    } catch (error) {
        console.error('[CSV] Upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ detail: 'Upload failed' });
    }
});

app.post('/csv/select', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), (req, res) => {
    try {
        const name = safeCsvName(req.body.name);
        const target = path.join(CSV_DIR, name);
        
        // Validate file path
        if (!validateFilePath(target, CSV_DIR)) {
            return res.status(400).json({ detail: 'Invalid file path' });
        }

        if (fs.existsSync(target)) {
            // Validate it's actually a CSV file
            const stats = fs.statSync(target);
            if (stats.size === 0) {
                return res.status(400).json({ detail: 'Empty file not allowed' });
            }
            
            // Quick CSV validation
            try {
                const content = fs.readFileSync(target, 'utf-8');
                parse(content, { columns: false, skip_empty_lines: true });
            } catch (parseError) {
                return res.status(400).json({ detail: 'Invalid CSV format' });
            }
            
            LEADS_CSV = target;
            fs.writeFileSync(SELECTED_FILE_STORE, JSON.stringify({ local: target }));
            console.log(`[CSV] File selected by user ${req.user?.userId}: ${name}`);
            res.json({ ok: true, active: name });
        } else {
            res.status(404).json({ detail: 'CSV not found' });
        }
    } catch (error) {
        console.error('[CSV] Select error:', error);
        res.status(500).json({ detail: 'Selection failed' });
    }
});

app.delete('/csv/:name', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), (req, res) => {
    try {
        const name = safeCsvName(req.params.name);
        const target = path.join(CSV_DIR, name);
        
        // Validate file path
        if (!validateFilePath(target, CSV_DIR)) {
            return res.status(400).json({ detail: 'Invalid file path' });
        }

        if (path.resolve(target) === path.resolve(LEADS_CSV)) {
            return res.status(400).json({ detail: 'Cannot delete active CSV' });
        }

        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            console.log(`[CSV] File deleted by user ${req.user?.userId}: ${name}`);
            res.json({ ok: true });
        } else {
            res.status(404).json({ detail: 'CSV not found' });
        }
    } catch (error) {
        console.error('[CSV] Delete error:', error);
        res.status(500).json({ detail: 'Deletion failed' });
    }
});

app.get('/csv/preview', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), (req, res) => {
    try {
        const name = safeCsvName(req.query.name as string);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10)); // Limit preview to 100 rows max
        const target = path.join(CSV_DIR, name);
        
        // Validate file path
        if (!validateFilePath(target, CSV_DIR)) {
            return res.status(400).json({ detail: 'Invalid file path' });
        }

        if (fs.existsSync(target)) {
            const leads = readLeads(target);
            const headers = leads.length > 0 ? Object.keys(leads[0]) : [];
            console.log(`[CSV] Preview requested by user ${req.user?.userId} for: ${name} (${leads.length} rows)`);
            res.json({ ok: true, headers, rows: leads.slice(0, limit) });
        } else {
            res.status(404).json({ detail: 'CSV not found' });
        }
    } catch (error) {
        console.error('[CSV] Preview error:', error);
        res.status(500).json({ detail: 'Preview failed' });
    }
});

app.get('/csv/download/:name', requireAuth, requireRoles(['agent', 'manager', 'superadmin']), (req, res) => {
    try {
        const name = safeCsvName(req.params.name);
        const target = path.join(CSV_DIR, name);
        
        // Validate file path
        if (!validateFilePath(target, CSV_DIR)) {
            return res.status(400).json({ detail: 'Invalid file path' });
        }
        
        if (fs.existsSync(target)) {
            console.log(`[CSV] Download requested by user ${req.user?.userId} for: ${name}`);
            res.download(target);
        } else {
            res.status(404).json({ detail: 'CSV not found' });
        }
    } catch (error) {
        console.error('[CSV] Download error:', error);
        res.status(500).json({ detail: 'Download failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Agent Dashboard running on http://localhost:${PORT}`);
});
