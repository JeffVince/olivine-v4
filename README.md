# Olivine Station

<!-- TODO: Add a relevant banner image here -->
<!-- ![Olivine Station Banner](placeholder-banner.png) -->

**Streamlining Creativity for Producers, Filmmakers, and Creatives.**

Olivine Station is a suite of tools designed to help producers, filmmakers, agents, and other creatives streamline the clerical work involved in their projects, allowing them to focus more on the creative process. This frontend application provides the user interface for managing and interacting with AI-powered Agents.

## Overview

This project is the frontend component of Olivine Station, built with modern web technologies:

*   **Framework:** [Vue 3](https://v3.vuejs.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Routing:** [Vue Router](https://router.vuejs.org/)
*   **State Management:** [Pinia](https://pinia.vuejs.org/) (implied via `useAuthStore`)
*   **API Communication:** Axios (via `src/services/api.js`)
*   **Real-time Communication:** WebSockets (via `src/services/streamingService.js`, likely connected to a service like Apache Pulsar)

The core concept revolves around **Agents**. Users create and interact with Agents within Olivine Station. Each Agent is configured to use an underlying **Flow** (typically defined in [Langflow](https://langflow.org/)) to perform specific tasks. Agents manage context, credentials, and data needed by the Flow, providing a seamless experience for the user who never interacts directly with Langflow.

## Features

*   **Agent Management:** Create, view, and manage AI Agents.
*   **Agent Creation:** Define new Agents based on available Langflow flow templates.
*   **Conversational Interface:** Chat directly with Agents to trigger underlying flows and receive real-time, streaming responses.
*   **User Authentication:** Secure login, signup, and session management.
*   **(Other features based on router):** Account Settings, API Key/Integrations management.

## Getting Started

Follow these instructions to set up the frontend development environment.

**Prerequisites:**

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [Git](https://git-scm.com/)
*   Access to the running Olivine Station backend services (API, WebSocket Stream)

**Installation:**

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd Olivine-V4 
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

**Environment Setup:**

1.  Create a `.env` file in the project root (`Olivine-V4/`).
2.  Add the necessary environment variables. You will need at least:
    ```dotenv
    VITE_API_URL=<your_backend_api_base_url>
    VITE_WS_URL=<your_backend_websocket_url> 

    # Example:
    # VITE_API_URL=http://localhost:8000
    # VITE_WS_URL=ws://localhost:8080 
    ```
    *   `VITE_API_URL`: The base URL for the backend REST API.
    *   `VITE_WS_URL`: The URL for the backend WebSocket service used for real-time streaming.
    *   *(Note: Additional variables might be required depending on backend configurations for authentication, etc.)*

**Running the Development Server:**

```bash
npm run dev
# or
yarn dev
```
This will start the Vite development server, typically available at `http://localhost:5173` (check the terminal output for the exact URL). The app will automatically reload when you make changes to the code.

**Building for Production:**

```bash
npm run build
# or
yarn build
```
This command bundles the application into the `dist/` directory, optimized for deployment.

## Project Structure

*   `public/`: Static assets.
*   `src/`: Main application source code.
    *   `assets/`: Static assets processed by Vite (styles, images, fonts).
    *   `components/`: Reusable Vue components.
    *   `router/`: Vue Router configuration (`index.js`).
    *   `services/`: Modules for interacting with external services (e.g., `api.js`, `streamingService.js`).
    *   `store/`: Pinia state management stores (e.g., `auth.js`).
    *   `views/`: Page-level components associated with routes.
    *   `App.vue`: Root Vue component.
    *   `main.js`: Application entry point.
*   `.env`: Environment variables (create this file, see Environment Setup).
*   `index.html`: Main HTML entry point.
*   `package.json`: Project dependencies and scripts.
*   `vite.config.js`: Vite configuration.

## Key Components & Services

*   **`Dashboard.vue` (`/dashboard`):** Displays the user's Agents and allows creation of new Agents from Flow templates.
*   **`Conversation.vue` (`/agents/:agentId/chat/:conversationId?`):** Provides the chat interface for interacting with a specific Agent, handling message display and real-time streaming responses.
*   **`api.js` (`src/services/api.js`):** Handles all REST API communication with the backend (fetching agents, templates, conversations, messages, etc.).
*   **`streamingService.js` (`src/services/streamingService.js`):** Manages the WebSocket connection for triggering Agent flow execution and receiving streaming results.

## Backend Integration

## Backend Implementation Details

*   **Credential Storage:** Uses the `integrations` table in Astra DB (CQL). Sensitive data is encrypted using AES-256-GCM (`api/_utils/encryption.js`).
*   **Authentication:** JWT verification is handled by `api/_middleware.js`.
*   **OAuth Flow:** Uses signed JWTs for the `state` parameter to securely pass context and prevent CSRF.
*   **Flow Execution:** The `/api/flows/execute` endpoint acts as a secure proxy, injecting decrypted credentials into the payload sent to the Langflow API.
*   **Token Refresh:** Automatic refresh for expired OAuth tokens is implemented in `/api/flows/execute` (currently supports Google example).

## Known Issues & Next Steps (TODO)

*   **[Backend] API Implementation:** 
    *   Implement backend API endpoints for agent/conversation/message management (`GET/POST /api/agents/.../conversations`, `GET/POST /api/conversations/.../messages`). Replace placeholders in `src/services/api.js`. (See TODO comments in file).
    *   Implement backend API endpoints for agent configuration: `PUT /api/flows/{id}` (to handle updates including `associated_credential_ids`), `DELETE /api/flows/{id}`.
    *   Implement backend API endpoint `GET /api/integrations/credentials` to fetch available user credentials.
*   **[Backend/API] Agent Data Structure:** Ensure the agent data returned by `GET /api/flows/{id}` includes an `associated_credential_ids` array. Ensure `PUT /api/flows/{id}` correctly handles updates to this array.
*   **[Coordination] Streaming Data Format:** Define and implement the exact data structure for WebSocket messages used in `streamingService.js` and expected by `Conversation.vue`. Adjust parsing/handling logic in `Conversation.vue` accordingly (See TODO comments in file).
*   **[Coordination/Flows] Flow Input Structure:** Define the expected input structure for Langflow flows used by agents. Update the input object creation in `Conversation.vue` to match. (See TODO comments in file).
*   **[Frontend] Replace Placeholder:** Replace the mock implementation of `apiService.getCredentials` with the actual API call. (See TODO comment in `src/services/api.js`).
*   **[Frontend] UI/UX Refinements:** 
    *   Replace `alert()` calls with a more user-friendly notification system (e.g., toast notifications) in `AgentSettings.vue` and potentially `Dashboard.vue`.
    *   Further enhance loading states and error feedback across the application.
*   **[Feature] Agent Configuration Details:** Enhance the `AgentSettings.vue` UI to configure more agent-specific details beyond credentials (e.g., specific instructions/prompts, model selection if applicable).
*   **[UI] Add Banner Image:** Create and add a suitable banner image to the README.
*   **[Testing] Implement Tests:** Add unit and integration tests for components and services.

## Contributing

(Optional: Add contribution guidelines here if applicable)

## License

(Optional: Add license information here if applicable)
