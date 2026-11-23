---
name: onyx
description: "Architecture, connectors, and enterprise context layer for Onyx (formerly Danswer). Use when building enterprise search, unified knowledge graphs across 50+ tools (Slack, Google Drive, Jira, GitHub, Notion, Confluence), agent-driven enterprise QA, document indexing pipelines, or integrating Onyx APIs and MCP servers."
---

# Onyx: Enterprise Context & Workplace AI Architecture

Onyx connects your entire workplace knowledge across 50+ enterprise integrations (Slack, Google Drive, Confluence, Jira, GitHub, Notion, Linear, Zendesk, Salesforce) into a secure, unified search and agent context layer.

## Core Capabilities

1. **Enterprise Connectors**:
   - Continuous indexing and access-control synchronization for Google Workspace, Atlassian (Jira/Confluence), GitHub, Slack, Notion, and databases.
   - Respects document permissions (ACLs) so users and agents only retrieve data they are authorized to see.

2. **Unified Search & Context Retrieval**:
   - Hybrid dense/sparse retrieval with Vespa / Qdrant vector backend.
   - Document chunking, semantic reranking, and citation generation with verifiable permalinks.

3. **Agent & Assistant Personas**:
   - Configurable personas with scoped knowledge sets, prompt templates, and custom tool access.
   - MicroVM and sandboxed code execution for analytical tasks.

4. **MCP & API Integration**:
   - Exposes workplace knowledge over standard MCP endpoints (`/api/mcp`).
   - REST API for chat persistence, user preferences, document querying, and feedback tracking.
