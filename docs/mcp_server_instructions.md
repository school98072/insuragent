# Decoupled Local MCP Server Configuration & Client Integration

We have built a production-ready, official **Model Context Protocol (MCP)** server for the Insurance Claims AI system using the high-level **FastMCP** SDK. This server runs locally via standard input/output (`stdio`) transport and can be registered in any supporting MCP Client (such as **Antigravity CLI (agy)**, **Cursor**, or **Claude Desktop**).

It exposes two primary decoupled tools:
1. `claims_chat`: Multi-turn stateful slot-filling chatbot with bilingual awareness.
2. `analyze_claim`: The complete 4-agent verification pipeline (RAG context retrieval, Vision OCR, Damage Assessment, Policy Exclusions Validation, and Compliance Citations).

Both tools dynamically accept optional private client-side API keys (`gemini_api_key` and `anthropic_api_key`), ensuring billing happens locally without storing secrets on the remote backend server.

---

## 💻 How to Configure Your MCP Client

Here are the configuration guides for supported MCP Clients, ordered by preference.

### 1. Antigravity CLI (`agy`) Configuration (Preferred Method)

The Antigravity CLI (`agy`) client reads server definitions directly from the global config file `~/.gemini/config/mcp_config.json`. 

To register the server, open or create `~/.gemini/config/mcp_config.json` and append the configuration block under the `mcpServers` object:

```json
{
  "mcpServers": {
    "insurance-claims-ai": {
      "command": "/Users/benjaminchung/Projects/insurance_ai_system/backend/.venv/bin/python",
      "args": [
        "/Users/benjaminchung/Projects/insurance_ai_system/backend/app/mcp_server.py"
      ],
      "env": {
        "DATABASE_URL": "sqlite:////Users/benjaminchung/Projects/insurance_ai_system/backend/insurance_ai.db",
        "APP_ENV": "development",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

Once saved, restart your `agy` session. The Antigravity agent will automatically discover the tools and make them available for use.

---

### 2. For Cursor
Go to **Settings** -> **Features** -> **MCP** -> click **+ New MCP Server** and enter:
* **Name**: `insurance-claims-ai`
* **Type**: `command`
* **Command**:
  ```bash
  /Users/benjaminchung/Projects/insurance_ai_system/backend/.venv/bin/python /Users/benjaminchung/Projects/insurance_ai_system/backend/app/mcp_server.py
  ```

---

### 3. For Claude Desktop
Add the server definition to your local `claude_desktop_config.json` file (typically located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "insurance-claims-ai": {
      "command": "/Users/benjaminchung/Projects/insurance_ai_system/backend/.venv/bin/python",
      "args": [
        "/Users/benjaminchung/Projects/insurance_ai_system/backend/app/mcp_server.py"
      ],
      "env": {
        "DATABASE_URL": "sqlite:////Users/benjaminchung/Projects/insurance_ai_system/backend/insurance_ai.db",
        "APP_ENV": "development",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

> [!IMPORTANT]
> The `DATABASE_URL` environment variable uses an absolute SQLite path (`sqlite:////Users/benjaminchung/Projects/insurance_ai_system/backend/insurance_ai.db`) to ensure the database can be located from any execution directory.

---

## 🛠️ Testing Locally via MCP Inspector

To interactively debug and test the tools without connecting to an IDE, you can use the official **MCP Inspector** developer utility:

1. In your terminal, navigate to the backend directory:
   ```bash
   cd /Users/benjaminchung/Projects/insurance_ai_system/backend
   ```
2. Run the inspector:
   ```bash
   .venv/bin/mcp dev app/mcp_server.py
   ```
3. Open the printed local URL (usually `http://localhost:5173`) in your browser to inspect the tool definitions, parameters, and execute test runs dynamically.
