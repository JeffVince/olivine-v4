import pulsar
import json
import os
import requests
import traceback
import uuid
from datetime import datetime

# --- Environment Variables ---
ASTRA_DB_ID = os.getenv("ASTRA_DB_ID")
ASTRA_DB_REGION = os.getenv("ASTRA_DB_REGION")
ASTRA_DB_KEYSPACE = os.getenv("ASTRA_DB_KEYSPACE", "flow_app_prod")
ASTRA_DB_APPLICATION_TOKEN = os.getenv("ASTRA_DB_APPLICATION_TOKEN")

def get_astra_db_headers():
    if not ASTRA_DB_APPLICATION_TOKEN:
        return None
    return {
        "Authorization": f"Bearer {ASTRA_DB_APPLICATION_TOKEN}",
        "Content-Type": "application/json",
    }

def get_astra_rest_endpoint():
    if not ASTRA_DB_ID or not ASTRA_DB_REGION:
        return None
    return f"https://{ASTRA_DB_ID}-{ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/{ASTRA_DB_KEYSPACE}"

def process(input_payload, context):
    """
    Processes agent management operations: create, read, update, delete.
    
    Expected input payload:
    {
        "operation": "create|read|update|delete",
        "userId": "user-id",
        "agentId": "agent-id",  # Optional for create
        "data": {
            # Agent data for create/update operations
            "name": "Agent Name",
            "description": "Agent Description",
            "langflowFlowId": "flow-id-in-langflow",
            "associated_credential_ids": ["cred-id-1", "cred-id-2"]
        }
    }
    """
    logger = context.get_logger()
    
    try:
        # Parse input
        if isinstance(input_payload, bytes):
            request = json.loads(input_payload.decode('utf-8'))
        elif isinstance(input_payload, dict):
            request = input_payload
        else:
            raise ValueError(f"Unexpected input type: {type(input_payload)}")
            
        operation = request.get('operation')
        user_id = request.get('userId')
        agent_id = request.get('agentId')
        data = request.get('data', {})
        
        # Validate required fields
        if not user_id:
            raise ValueError("Missing required field: userId")
        
        if operation not in ['create', 'read', 'update', 'delete']:
            raise ValueError(f"Invalid operation: {operation}")
            
        # Get Astra DB connection details
        headers = get_astra_db_headers()
        endpoint = get_astra_rest_endpoint()
        
        if not headers or not endpoint:
            raise ValueError("Missing Astra DB connection details")
        
        # Process based on operation
        result = None
        
        if operation == 'create':
            # Generate a new agent ID if not provided
            if not agent_id:
                agent_id = str(uuid.uuid4())
                
            # Prepare agent data
            agent_data = {
                "id": agent_id,
                "user_id": user_id,
                "name": data.get('name', 'New Agent'),
                "description": data.get('description', ''),
                "langflow_flow_id": data.get('langflowFlowId'),
                "associated_credential_ids": data.get('associated_credential_ids', []),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert into agents collection
            agents_url = f"{endpoint}/collections/agents/{agent_id}"
            response = requests.put(agents_url, headers=headers, json={"data": agent_data})
            response.raise_for_status()
            
            result = {"success": True, "agentId": agent_id, "agent": agent_data}
            
        elif operation == 'read':
            if not agent_id:
                # List all agents for user
                agents_url = f"{endpoint}/collections/agents"
                query = {"user_id": {"$eq": user_id}}
                response = requests.get(
                    agents_url, 
                    headers=headers, 
                    params={"where": json.dumps(query)}
                )
                response.raise_for_status()
                agents = response.json().get('data', {}).get('documents', [])
                result = {"success": True, "agents": agents}
            else:
                # Get single agent
                agent_url = f"{endpoint}/collections/agents/{agent_id}"
                response = requests.get(agent_url, headers=headers)
                
                if response.status_code == 404:
                    result = {"success": False, "error": "Agent not found"}
                else:
                    response.raise_for_status()
                    agent = response.json().get('data')
                    
                    # Verify user owns this agent
                    if agent.get('user_id') != user_id:
                        result = {"success": False, "error": "Unauthorized access to agent"}
                    else:
                        result = {"success": True, "agent": agent}
        
        elif operation == 'update':
            if not agent_id:
                raise ValueError("Missing required field for update: agentId")
                
            # First get the existing agent
            agent_url = f"{endpoint}/collections/agents/{agent_id}"
            response = requests.get(agent_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Agent not found"}
            else:
                response.raise_for_status()
                agent = response.json().get('data')
                
                # Verify user owns this agent
                if agent.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to agent"}
                else:
                    # Update fields
                    agent.update({
                        "name": data.get('name', agent.get('name')),
                        "description": data.get('description', agent.get('description')),
                        "langflow_flow_id": data.get('langflowFlowId', agent.get('langflow_flow_id')),
                        "associated_credential_ids": data.get('associated_credential_ids', agent.get('associated_credential_ids', [])),
                        "updated_at": datetime.utcnow().isoformat()
                    })
                    
                    # Update in DB
                    response = requests.put(agent_url, headers=headers, json={"data": agent})
                    response.raise_for_status()
                    
                    result = {"success": True, "agent": agent}
        
        elif operation == 'delete':
            if not agent_id:
                raise ValueError("Missing required field for delete: agentId")
                
            # First get the existing agent to verify ownership
            agent_url = f"{endpoint}/collections/agents/{agent_id}"
            response = requests.get(agent_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Agent not found"}
            else:
                response.raise_for_status()
                agent = response.json().get('data')
                
                # Verify user owns this agent
                if agent.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to agent"}
                else:
                    # Delete the agent
                    response = requests.delete(agent_url, headers=headers)
                    response.raise_for_status()
                    
                    result = {"success": True, "deleted": agent_id}
        
        # Publish result
        context.publish(context.get_output_topic(), json.dumps(result))
        
    except Exception as e:
        logger.error(f"Error processing agent management request: {e}")
        logger.error(traceback.format_exc())
        
        error_payload = {
            "success": False,
            "error": str(e)
        }
        context.publish(context.get_output_topic(), json.dumps(error_payload))
    
    # Acknowledge message
    context.ack(context.get_message()) 