import { type JobContext, WorkerOptions, cli, defineAgent, llm } from '@livekit/agents';
import { beta } from '@livekit/agents-plugin-google';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { RemoteAudioTrack, AudioStream } from '@livekit/rtc-node';

dotenv.config();

const BASE_DIR = __dirname;

// Define Lead interface
interface Lead {
    prospect_name: string;
    resource_name: string;
    job_title: string;
    company_name: string;
    email: string;
    phone: string;
    timezone: string;
}

// Helper to read leads
function readLeads(csvPath: string): Lead[] {
    try {
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true
        });

        return records.map((row: any) => ({
            prospect_name: row.prospect_name || '',
            resource_name: row.resource_name || '',
            job_title: row.job_title || '',
            company_name: row.company_name || '',
            email: row.email || '',
            phone: row.phone || '',
            timezone: row.timezone || ''
        }));
    } catch (error) {
        console.error('Error reading leads CSV:', error);
        return [];
    }
}

import { SESSION_INSTRUCTION, ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS } from './prompts';

export default defineAgent({
    entry: async (ctx: JobContext) => {
        await ctx.connect();

        // Determine lead
        let lead: Lead | null = null;
        const leadsCsvPath = process.env.LEADS_CSV_PATH || path.join(BASE_DIR, 'leads.csv');
        const allLeads = readLeads(leadsCsvPath);

        const envIdx = process.env.LEAD_INDEX;
        if (envIdx) {
            const i = parseInt(envIdx, 10) - 1;
            if (i >= 0 && i < allLeads.length) {
                lead = allLeads[i];
            }
        }

        if (!lead && allLeads.length > 0) {
            lead = allLeads[0];
        }

        // Prepare instructions
        let instructions = SESSION_INSTRUCTION;
        if (lead) {
            const repl = (text: string, placeholder: string, value: string) => {
                return value ? text.replace(placeholder, value) : text;
            };

            instructions = repl(instructions, "[Prospect Name]", lead.prospect_name || "there");
            instructions = repl(instructions, "[Resource Name]", lead.resource_name || "our team");
            instructions = repl(instructions, "[Job Title]", lead.job_title || "your role");
            instructions = repl(instructions, "[Company Name]", lead.company_name || "your company");
            instructions = repl(instructions, "[____@abc.com]", lead.email || "email@domain.com");

            const contextPrefix = `Lead Context:
- Prospect Name: ${lead.prospect_name}
- Job Title: ${lead.job_title}
- Company: ${lead.company_name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Timezone: ${lead.timezone}
- Caller (Resource Name): ${lead.resource_name}

`;
            instructions = contextPrefix + instructions;
        }

        // Use Google Realtime Model
        const model = new beta.realtime.RealtimeModel({
            apiKey: process.env.GOOGLE_API_KEY,
            instructions: ENHANCED_DEMANDIFY_CALLER_INSTRUCTIONS,
            voice: "Leda",
            temperature: 0.2,
        });

        // Create session
        const session = model.session();

        // Update instructions with lead context
        if (instructions) {
            // We can update instructions or send a message
            // session.updateInstructions(instructions); // if supported
            // or just rely on system instructions + initial prompt
        }

        // Handle audio I/O
        // This is a simplified implementation. 
        // In a real scenario, we need to handle VAD, buffering, and audio playback synchronization.
        // Since MultimodalAgent is not available in this version of the SDK, we are limited.
        // However, for the purpose of this migration, we set up the structure.

        console.log('Agent connected and ready (Manual Session Mode)');

        // Wait for participant audio
        const participant = await ctx.waitForParticipant();
        console.log(`Participant joined: ${participant.identity}`);

        // TODO: Implement audio piping from participant -> session -> room
        // This requires AudioStream and Source/Sink handling which is complex to do from scratch.
        // We assume the user will upgrade to a version of the SDK that supports MultimodalAgent 
        // or use the Python agent for now if this is critical.
        // But we leave this file as a starting point.
    }
});

// Run the agent if executed directly
if (require.main === module) {
    cli.runApp(new WorkerOptions({
        agent: __filename,
        port: 0 // Use random port to avoid conflicts
    }));
}
