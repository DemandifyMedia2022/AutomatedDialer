# shim to expose the existing agent module under the 'backend' namespace expected by app.py
# Import the sibling 'agent' module directly; uvicorn/app sets app-dir so this is on sys.path
import agent as _agent
from agent import *  # re-export everything so imports like 'from backend.agent import CAMPAIGNS' work

# Explicitly export underscore-prefixed helper not included by wildcard imports
_campaign_display_name = _agent._campaign_display_name
