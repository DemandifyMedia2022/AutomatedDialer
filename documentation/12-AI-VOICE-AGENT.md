# AI Voice Agent Documentation

## Overview

The Agentic Dialer includes an AI-powered voice agent that autonomously makes phone calls and conducts natural conversations with prospects. Built on LiveKit Agents framework and Google's Realtime API, it provides human-quality voice interactions at machine scale.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│         FastAPI Web UI (Port 4100)                      │
│  - Prospect selection dashboard                         │
│  - CSV management interface                             │
│  - Campaign configuration                               │
│  - Real-time call monitoring                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         Python AI Agent (agent.py)                      │
│  - LiveKit Agents framework                             │
│  - Google Realtime API integration                      │
│  - Dynamic prompt loading                               │
│  - Lead context injection                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         LiveKit Cloud Infrastructure                    │
│  - WebRTC media handling                                │
│  - SIP trunk integration                                │
│  - Call recording                                       │
│  - Noise cancellation                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         PSTN / Phone Network                            │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/backend/src/agentic-dialing/
├── app/
│   ├── app.py                    # FastAPI web application
│   ├── static/                   # Web UI assets
│   └── templates/                # HTML templates
├── backend/
│   ├── agent.py                  # Agent module shim
│   └── prompts.py                # Prompts module shim
├── campaigns_prompts/            # Campaign-specific prompts
│   ├── google.py                 # Google campaign example
│   ├── hxb.py                    # HXB campaign example
│   └── gbr.py                    # GBR campaign example
├── agent.py                      # Main AI agent implementation
├── prompts.py                    # Default prompt templates
├── campaigns.json                # Campaign registry
├── leads.csv                     # Active prospect list
├── requirements.txt              # Python dependencies
└── server.ts                     # Node.js server wrapper
```

## Key Features

### 1. Campaign-Based Prompts

Each campaign has two types of prompts:

**Agent Instructions** (`ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS`):
- Defines AI personality and behavior
- Sets conversation goals and guidelines
- Specifies tone and communication style
- Includes objection handling strategies

**Session Instructions** (`SESSION_INSTRUCTION`):
- Call script with placeholders
- Lead-specific context injection
- Dynamic content based on prospect data
- Conversation flow guidance

### 2. Lead Context Injection

The AI agent automatically injects prospect data into conversations:

```python
# Placeholders replaced with actual data
[Prospect Name]  → "John Doe"
[Company Name]   → "Acme Corp"
[Job Title]      → "VP of Sales"
[Resource Name]  → "Sarah from Demandify"
[____@abc.com]   → "john@acme.com"
```

**Lead Data Structure:**
```csv
prospect_name,company_name,job_title,phone,email,timezone,resource_name
John Doe,Acme Corp,VP of Sales,+1234567890,john@acme.com,America/New_York,Sarah
```

### 3. CSV Management

**Upload CSV:**
```bash
POST /api/agentic/csv/upload
Content-Type: multipart/form-data

file: prospects.csv
```

**Preview CSV:**
```bash
GET /api/agentic/csv/preview?name=prospects.csv&limit=10
```

**Select Active CSV:**
```bash
POST /api/agentic/csv/select
Content-Type: application/x-www-form-urlencoded

name=prospects.csv
```

**Delete CSV:**
```bash
DELETE /api/agentic/csv/prospects.csv
```

### 4. Campaign Management

**List Campaigns:**
```bash
GET /api/agentic/campaigns/legacy/list
```

Response:
```json
{
  "ok": true,
  "builtin": [
    {
      "name": "Default",
      "module": "backend.prompts",
      "builtin": true,
      "key": "Default (prompts)"
    }
  ],
  "custom": [
    {
      "name": "Google Outreach",
      "module": "google"
    }
  ]
}
```

**Create Campaign:**
```bash
POST /api/agentic/campaigns/legacy/create
Content-Type: application/x-www-form-urlencoded

name=Q4 Sales Campaign
agent_text=You are a professional sales representative...
session_text=Hi [Prospect Name], this is [Resource Name]...
module=q4_sales
```

**Update Campaign:**
```bash
POST /api/agentic/campaigns/legacy/update
Content-Type: application/x-www-form-urlencoded

module=q4_sales
name=Q4 Sales Campaign - Updated
agent_text=Updated instructions...
session_text=Updated script...
```

## Configuration

### Environment Variables

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# SIP Configuration (for PSTN calling)
SIP_USER_ID=agent_username
SIP_PASSWORD=agent_password
SIP_URL=pbx.provider.com
SIP_WS_URL=wss://pbx.provider.com:7443

# Backend Integration
BACKEND_API_BASE=http://localhost:4000/api/agentic
LEADS_CSV_PATH=/path/to/leads.csv
LEADS_CSV_DIR=/path/to/csv/storage

# Campaign Configuration
CAMPAIGN_PROMPT_MODULE=backend.campaigns_prompts.google
CAMPAIGN_AGENT_NAME=ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS
CAMPAIGN_SESSION_NAME=SESSION_INSTRUCTION

# Execution Mode
RUN_SINGLE_CALL=1  # For child process execution
LEAD_INDEX=1       # 1-based index for specific lead
```

### Python Dependencies

```txt
livekit-agents
livekit-plugins-google
livekit-plugins-noise-cancellation
fastapi
uvicorn
python-dotenv
httpx
pyjwt
```

Install:
```bash
cd apps/backend/src/agentic-dialing
pip install -r requirements.txt
```

## Usage

### Starting the AI Agent Service

**Development Mode:**
```bash
npm run start:agentic
# or
cd apps/backend/src/agentic-dialing
uvicorn app.app:app --host 0.0.0.0 --port 4100 --reload
```

**Production Mode:**
```bash
cd apps/backend/src/agentic-dialing
uvicorn app.app:app --host 0.0.0.0 --port 4100 --workers 4
```

### Web Dashboard

Access the web UI at: `http://localhost:4100`

**Features:**
- View paginated prospect list
- Select campaign from dropdown
- Click prospect to initiate call
- Monitor call status in real-time
- Navigate between pages (N/P keys)
- Quick dial with Enter key

### Console Mode (Interactive)

```bash
cd apps/backend/src/agentic-dialing
python agent.py
```

**Interactive Menu:**
1. Select campaign (or press Enter for default)
2. View paginated prospect list
3. Enter number to call specific prospect
4. Press Enter to call next prospect
5. Press 'N' for next page, 'P' for previous page
6. Press 'q' to quit

### Single Call Mode (Programmatic)

```bash
export RUN_SINGLE_CALL=1
export LEAD_INDEX=5
export CAMPAIGN_PROMPT_MODULE=backend.campaigns_prompts.google
python agent.py console
```

## Call Flow

### 1. Initialization

```python
# Load campaign prompts
agent_instructions, session_instructions = _load_campaign_prompts(
    module_name="backend.campaigns_prompts.google",
    agent_attr="ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS",
    session_attr="SESSION_INSTRUCTION"
)

# Load lead data
lead = get_lead_by_index_1based(lead_index)
```

### 2. Context Injection

```python
# Replace placeholders with lead data
instructions = session_instructions
instructions = instructions.replace("[Prospect Name]", lead["prospect_name"])
instructions = instructions.replace("[Company Name]", lead["company_name"])
instructions = instructions.replace("[Job Title]", lead["job_title"])
instructions = instructions.replace("[____@abc.com]", lead["email"])

# Add structured context
instructions = f"""
Lead Context:
- Prospect Name: {lead['prospect_name']}
- Job Title: {lead['job_title']}
- Company: {lead['company_name']}
- Email: {lead['email']}
- Phone: {lead['phone']}
- Timezone: {lead['timezone']}
- Caller (Resource Name): {lead['resource_name']}

{instructions}
"""
```

### 3. AI Agent Initialization

```python
class Assistant(Agent):
    def __init__(self, instructions_text: str):
        super().__init__(
            instructions=instructions_text,
            llm=google.beta.realtime.RealtimeModel(
                voice="Leda",           # Natural female voice
                temperature=0.2,        # Balanced creativity
            ),
            tools=[],                   # No external tools (yet)
        )
```

### 4. Session Start

```python
session = AgentSession()
await session.start(
    room=ctx.room,
    agent=Assistant(agent_instructions),
    room_input_options=RoomInputOptions(
        video_enabled=False,
        noise_cancellation=noise_cancellation.BVCTelephony(),
    ),
)
```

### 5. Call Execution

```python
await ctx.connect()
await session.generate_reply(instructions=session_instructions)
```

### 6. Call Completion

- Call recording saved automatically by LiveKit
- Transcription generated (if enabled)
- CDR logged to database
- Next prospect queued (if auto-next enabled)

## Creating Custom Campaigns

### Step 1: Define Prompts

Create a new file: `campaigns_prompts/my_campaign.py`

```python
# Agent personality and behavior
ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS = '''
You are a professional sales representative for [Your Company].

Your goal is to:
1. Introduce yourself and the company
2. Qualify the prospect's interest
3. Book a demo meeting

Guidelines:
- Be friendly and conversational
- Listen actively to objections
- Don't be pushy
- Keep calls under 5 minutes
- Always ask for permission to continue

Tone: Professional yet warm, confident but not aggressive.
'''.strip()

# Call script with placeholders
SESSION_INSTRUCTION = '''
Hi [Prospect Name], this is [Resource Name] from [Your Company].

I'm reaching out because I noticed [Company Name] is in the [industry] space, 
and we've been helping companies like yours [value proposition].

Do you have a quick minute to chat about [specific benefit]?

[If yes, continue with qualification questions]
[If no, ask for better time to call back]
[If objection, handle gracefully and pivot]

Goal: Book a 15-minute demo for next week.
'''.strip()
```

### Step 2: Register Campaign

**Via API:**
```bash
curl -X POST http://localhost:4100/api/campaigns/legacy/create \
  -F "name=My Campaign" \
  -F "module=my_campaign" \
  -F "agent_text@campaigns_prompts/my_campaign.py" \
  -F "session_text@campaigns_prompts/my_campaign.py"
```

**Via Database:**
```sql
INSERT INTO agentic_campaigns (module, name, agent_text, session_text)
VALUES (
  'my_campaign',
  'My Campaign',
  'You are a professional sales representative...',
  'Hi [Prospect Name], this is [Resource Name]...'
);
```

### Step 3: Test Campaign

```bash
export CAMPAIGN_PROMPT_MODULE=backend.campaigns_prompts.my_campaign
python agent.py console
```

## Advanced Features

### Auto-Next Mode

Automatically dial next prospect when call ends:

```python
AUTO_NEXT = True  # Set in app.py

# Watcher loop monitors call completion
def _watcher_loop():
    while True:
        if last_running and not running:
            if AUTO_NEXT and lead_idx is not None:
                spawn_call(lead_idx + 1, campaign)
        time.sleep(1)
```

### Call Status Monitoring

```python
# Global state
CURRENT_STATUS: str = "idle"  # idle | running | stopping
CURRENT_LEAD_INDEX: Optional[int] = None
SELECTED_CAMPAIGN: Optional[str] = None

# Check status
GET /api/call/status
```

### Graceful Call Termination

```python
def _end_current_call() -> bool:
    """Send SIGINT to gracefully stop call"""
    if sys.platform == "win32":
        proc.terminate()
    else:
        proc.send_signal(signal.SIGINT)
    return True
```

## Integration with Node.js Backend

### Campaign Sync

```typescript
// apps/backend/src/routes/agentic-data.ts
router.get('/campaigns', async (req, res) => {
  const campaigns = await db.agentic_campaigns.findMany();
  res.json({ items: campaigns });
});
```

### CSV File Management

```typescript
// apps/backend/src/routes/agentic-data.ts
router.get('/csv/list', async (req, res) => {
  const files = await db.agentic_csv_files.findMany();
  res.json({ files });
});

router.post('/csv/upload', upload.single('file'), async (req, res) => {
  const { filename, size } = req.file;
  await db.agentic_csv_files.create({
    data: { name: filename, size, mtime: Date.now() }
  });
  res.json({ ok: true, name: filename });
});
```

### Active CSV Tracking

```typescript
async function getActiveCsvName(): Promise<string | null> {
  const active = await db.agentic_csv_files.findFirst({
    where: { active: true }
  });
  return active?.name || null;
}
```

## Troubleshooting

### Agent Won't Start

**Check LiveKit credentials:**
```bash
echo $LIVEKIT_URL
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET
```

**Verify Python dependencies:**
```bash
pip list | grep livekit
```

**Check logs:**
```bash
tail -f /var/log/agentic-agent.log
```

### No Audio in Calls

**Verify SIP configuration:**
```bash
echo $SIP_USER_ID
echo $SIP_PASSWORD
echo $SIP_URL
```

**Test SIP connectivity:**
```bash
# Use SIP testing tool
sip-test --user $SIP_USER_ID --password $SIP_PASSWORD --server $SIP_URL
```

**Check noise cancellation models:**
```bash
ls ~/.cache/livekit/models/
```

### Campaign Not Loading

**Verify module path:**
```bash
python -c "import backend.campaigns_prompts.google; print('OK')"
```

**Check campaigns.json:**
```bash
cat apps/backend/src/agentic-dialing/campaigns.json
```

**Validate prompt syntax:**
```python
from backend.campaigns_prompts.google import ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS
print(len(ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS))
```

### CSV Upload Fails

**Check file size limit:**
```python
# In app.py
if len(content) > 10 * 1024 * 1024:  # 10MB limit
    raise HTTPException(status_code=413, detail="File too large")
```

**Verify CSV format:**
```bash
head -n 5 prospects.csv
# Should have headers: prospect_name,company_name,phone,email,etc.
```

**Check directory permissions:**
```bash
ls -la $LEADS_CSV_DIR
```

## Performance Optimization

### Concurrent Calls

Run multiple agent instances:

```bash
# Terminal 1
LEAD_INDEX=1 python agent.py console &

# Terminal 2
LEAD_INDEX=2 python agent.py console &

# Terminal 3
LEAD_INDEX=3 python agent.py console &
```

### Call Queue Management

Implement queue system for high-volume campaigns:

```python
from queue import Queue
import threading

call_queue = Queue()

def worker():
    while True:
        lead_index = call_queue.get()
        spawn_call(lead_index, campaign)
        call_queue.task_done()

# Start workers
for i in range(10):  # 10 concurrent callers
    t = threading.Thread(target=worker, daemon=True)
    t.start()

# Queue leads
for idx in range(1, 1001):
    call_queue.put(idx)

call_queue.join()
```

### Resource Monitoring

```python
import psutil

def monitor_resources():
    cpu = psutil.cpu_percent()
    memory = psutil.virtual_memory().percent
    print(f"CPU: {cpu}% | Memory: {memory}%")
```

## Security Considerations

### API Authentication

Add authentication to FastAPI endpoints:

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(credentials = Depends(security)):
    token = credentials.credentials
    # Verify JWT token
    if not is_valid_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

@app.get("/api/campaigns", dependencies=[Depends(verify_token)])
async def get_campaigns():
    # Protected endpoint
    pass
```

### PII Protection

Redact sensitive data in logs:

```python
def sanitize_lead(lead: dict) -> dict:
    return {
        **lead,
        "phone": lead["phone"][-4:].rjust(len(lead["phone"]), "*"),
        "email": lead["email"].split("@")[0][:2] + "***@" + lead["email"].split("@")[1]
    }

logger.info(f"Calling lead: {sanitize_lead(lead)}")
```

### Rate Limiting

Prevent abuse:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/csv/upload")
@limiter.limit("10/minute")
async def upload_csv(request: Request, file: UploadFile):
    # Rate-limited endpoint
    pass
```

## Best Practices

### 1. Prompt Engineering

- Keep agent instructions concise (< 500 words)
- Use clear, actionable language
- Include specific examples of good responses
- Define clear success criteria
- Test with various prospect personas

### 2. Lead Data Quality

- Validate phone numbers (E.164 format)
- Verify email addresses
- Include timezone for optimal call timing
- Add custom fields for personalization
- Remove duplicates before upload

### 3. Campaign Testing

- Test with internal team first
- Start with small batches (10-20 calls)
- Monitor first 5 calls closely
- Iterate on prompts based on results
- A/B test different approaches

### 4. Compliance

- Obtain consent before calling
- Respect Do Not Call lists
- Honor opt-out requests immediately
- Record all calls (with disclosure)
- Follow TCPA and local regulations

### 5. Monitoring

- Track call completion rate
- Monitor average call duration
- Measure conversion metrics
- Review transcripts regularly
- Identify common objections

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-08 | System | Initial AI Voice Agent documentation |
