# Product Feature Documentation

## Introduction
This document outlines the key features, unique selling points (USPs), reliability, and cost-effectiveness of our Automated Dialer platform. Designed for high-performance sales and support teams, the system integrates advanced dialing capabilities with robust management tools in a unified, secure environment.

## Unique Selling Points (USPs)

### 1. Unified Role-Based Ecosystem
Unlike fragmented solutions, our platform provides a single, cohesive environment with distinct, secure portals for every role:
*   **Agents:** Focused interface for dialing, campaign management, and performance tracking.
*   **Managers:** Real-time oversight, agent monitoring, and campaign administration.
*   **QA / Analysts:** Dedicated audit interface for compliance scoring, call reviewing, and performance feedback.
*   **Superadmins:** Full system control, security settings, and global analytics.

### 2. Hybrid Dialing Modes
Adapt to any campaign requirement with flexible dialing options:
*   **Automated Dialer:** Maximize talk time with sequential auto-dialing from uploaded lists (CSV/Excel). Features intelligent queue management, auto-skip, and configurable delays.
*   **Manual Dialer:** Precision control for high-value leads requiring specific attention and preparation time.
*   **GSM Hybrid Dialer:** Integrate physical GSM gateways (SIM banks) to dial via local SIMs. Supports SMS, USSD codes, and hardware-level carrier management.

### 3. Integrated Decision Maker Workflows
Streamline data capture with built-in **Decision Maker Forms**. Agents can capture structured lead details (contact info, company size, custom questions) directly within the active call interface, ensuring data consistency and reducing post-call work.

### 4. Real-Time Gamification & Analytics
Boost team morale and productivity with built-in performance tracking:
*   **Live Leaderboards:** Real-time rankings based on call outcomes.
*   **Agent Analytics:** Personal performance dashboards showing daily/monthly trends, connection rates, and disposition breakdowns.

---

## Best Features

### Comprehensive Call Management
*   **Smart Call Logging:** Automatically captures every detail—duration, timestamps, costs, and network signaling.
*   **Intelligent Dispositioning:** The system automatically infers call outcomes (e.g., "Busy," "No Answer," "Failed") based on network signals, reducing manual error and saving agent time.
*   **Call Recording:** Secure, automatic recording of calls with immediate playback and download availability for quality assurance.

### Agent Productivity Suite
*   **"My Calls" History:** Agents have instant access to their call logs with powerful filters (date, status, direction) to manage follow-ups efficiently.
*   **Integrated Notes:** Quick-add note functionality allows agents to log key information without leaving the dialer screen.
*   **Bulk List Management:** Easy drag-and-drop upload for contact lists, with automatic parsing of phone numbers and names.

### Manager & Admin Control Center
*   **Live Monitoring:** Managers can view a snapshot of active calls and agent statuses in real-time.
*   **Campaign Management:** Create, assign, and track campaigns to align dialing efforts with business goals.
*   **Secure File Management:** Centralized storage for call recordings and uploaded documents with strict access controls.

### Advanced AI & Quality Control
*   **Live AI Transcription:** Real-time speech-to-text powered by Deepgram. Includes sentiment analysis, speaker diarization, and instant transcript search.
*   **Interactive QA Module:** Comprehensive auditing system allowing Quality Analysts to grade calls on custom parameters (Tone, Compliance), leave timestamps comments, and track improvement trends.

---

## Reliable & Cost-Effective

### Built for Reliability
*   **System Health Monitoring:** Integrated health-check endpoints ensure database connectivity and service status are always monitored.
*   **Data Integrity:** Built on a robust SQL database (MySQL) with Prisma ORM to ensure accurate, transactional data storage.
*   **Local Fallbacks:** The frontend dialer includes local state preservation, ensuring the dialing queue remains intact even if the browser is refreshed.

### Cost-Effective Infrastructure
*   **Modern Open-Source Stack:** Built using industry-standard, open-source technologies (Node.js, Express, Next.js, MySQL), eliminating the need for expensive proprietary software licenses.
*   **Scalable Architecture:** Lightweight backend design allows for efficient deployment on standard cloud instances, keeping hosting costs low while supporting growth.
*   **Bring Your Own Carrier (BYOC):** The system's SIP architecture allows integration with cost-effective VoIP providers of your choice, optimizing operational expenses.

---

## Technical Specifications (At a Glance)
*   **Frontend:** Next.js 16 (React 19), Tailwind CSS v4, shadcn/ui.
*   **Backend:** Node.js, Express, TypeScript.
*   **Database:** MySQL.
*   **Security:** JWT Authentication, Role-Based Access Control (RBAC), HelmetJS protection, CORS enforcement.
*   **Connectivity:** SIP/WebRTC ready (JsSIP integration).
