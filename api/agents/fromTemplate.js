import { getConnectedClient } from '../_utils/astraClient.js';
import { types } from '@datastax/cassandra-driver';
import { verifyAuth, addStandardHeaders, createErrorResponse } from '../auth_handler.js';

// export const config = { runtime: 'edge' }; // Remove edge config

// Handles POST /api/agents/fromTemplate
export default async function handler(request) {

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const optionsResponse = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400' 
      }
    });
    return addStandardHeaders(optionsResponse);
  }

  if (request.method !== 'POST') {
     const methodNotAllowedResponse = new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Allow': 'POST', 'Content-Type': 'application/json' } 
     });
     return addStandardHeaders(methodNotAllowedResponse);
  }

  try {
    // --- Authentication --- 
    const user = await verifyAuth(request);
    let userId;
    try {
        userId = types.Uuid.fromString(user.id);
    } catch (e) {
         return createErrorResponse('Invalid user identifier', 400);
    }

    // --- Request Body Parsing and Validation --- 
    let body;
    try {
      body = await request.json();
    } catch (e) {
        return createErrorResponse('Invalid JSON body', 400);
    }

    const templateIdString = body.templateId; 
    const agentName = body.name || 'New Agent'; 
    const agentDescription = body.description || '';
    const agentConfig = body.config || {}; 
    let templateId; 
    let langflowFlowId;

    if (!templateIdString) {
        return createErrorResponse('Missing templateId in request body', 400);
    }
    
    try {
        templateId = types.Uuid.fromString(templateIdString);
    } catch(e) {
         return createErrorResponse('Invalid templateId format', 400);
    }

    // --- Database Operations --- 
    const client = await getConnectedClient();
    const templatesTable = 'flow_app_prod.flow_templates';
    const agentsTable = 'flow_app_prod.agents';

    // 1. Verify template access
    const templateQuery = `SELECT template_id 
                           FROM ${templatesTable} 
                           WHERE template_id = ? AND (is_public = true OR owner_user_id = ?) 
                           LIMIT 1 ALLOW FILTERING`; 
    const templateParams = [templateId, userId]; 
    const templateResult = await client.execute(templateQuery, templateParams, { prepare: true });
    const template = templateResult.first();

    if (!template) {
        return createErrorResponse('Flow template not found or access denied', 404);
    }
    
    // Assuming Langflow Flow ID is the template_id as text
    langflowFlowId = template.template_id.toString(); 

    // 2. Create Agent record
    const newAgentId = types.Uuid.random();
    const now = new Date();
    
    const insertQuery = `INSERT INTO ${agentsTable} 
                         (owner_user_id, agent_id, name, description, langflow_flow_id, config, created_at, updated_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertParams = [
        userId,
        newAgentId,
        agentName,
        agentDescription,
        langflowFlowId,
        agentConfig,
        now,
        now
    ];

    await client.execute(insertQuery, insertParams, { prepare: true });

    // 3. Prepare and Return Response
    const newAgentData = {
        id: newAgentId.toString(),
        agent_id: newAgentId.toString(),
        owner_user_id: userId.toString(),
        name: agentName,
        description: agentDescription,
        langflow_flow_id: langflowFlowId,
        associated_credential_ids: [], // Starts empty
        config: agentConfig,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
    };
    
    const successResponse = new Response(JSON.stringify(newAgentData), {
      status: 201, // Created
      headers: { 'Content-Type': 'application/json' },
    });
    return addStandardHeaders(successResponse);

  } catch (error) {
     // --- Error Handling --- 
    if (error.message.startsWith('Authentication')) {
        return createErrorResponse(error.message, 401);
    }
    // Handle JSON parsing error specifically if not caught earlier
    if (error instanceof SyntaxError) {
        return createErrorResponse('Invalid JSON body', 400);
    } 
    console.error(`Error creating agent from template for user ${user?.id}:`, error);
    return createErrorResponse('Internal Server Error', 500);
  }
} 