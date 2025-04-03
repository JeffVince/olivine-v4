# Olivine V4

Olivine is an application that allows you to create AI agents powered by Langflow and Astra Streaming.

## Getting Started

Follow these steps to sign in, create an agent from a Langflow flow, and start using it:

### 1. Sign In

1. Navigate to the login page at `/login`
2. Enter your email and password
3. Click "Sign In"

If you don't have an account yet, click "Sign Up" and create a new account.

### 2. Create an Agent from a Langflow Flow

1. After signing in, you'll be redirected to the Dashboard page
2. Click the "Create New Agent" button in the top right corner
3. In the modal that appears:
   - Enter a name for your agent
   - Select a Langflow template from the dropdown menu
   - Optionally add a description
   - Click "Create Agent"

This will create a new agent based on the selected Langflow template.

### 3. Use Your Agent

1. Once the agent is created, it will appear in your Dashboard
2. Click on the agent card to open it
3. You'll be taken to the Conversation page
4. Click "Start New Conversation" to begin a new chat session
5. Select a credential from the dropdown menu (add one if none are available)
6. Type your message in the input field at the bottom and click "Send"
7. The agent will process your message using the Langflow flow and respond

## Integrations

To use your agent effectively, you'll need to add credentials:

1. Navigate to the Integrations page from the sidebar
2. Add the necessary API keys (like OpenAI, etc.)
3. These credentials will be available to select when using your agents

## Troubleshooting

If you encounter any issues:

- Make sure your Astra DB and Streaming connections are properly configured
- Check that your Langflow templates are available and accessible
- Verify your authentication token is valid

For more detailed information, refer to the Olivine-V3 documentation.
