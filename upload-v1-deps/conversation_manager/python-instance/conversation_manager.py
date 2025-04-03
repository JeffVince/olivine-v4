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
    Processes conversation management operations: create, read, update, delete conversations and messages.
    
    Expected input payload:
    {
        "operation": "create_conversation|get_conversations|get_conversation|delete_conversation|add_message|get_messages",
        "userId": "user-id",
        "agentId": "agent-id",  # Required for some operations
        "conversationId": "conversation-id",  # Optional for create_conversation
        "data": {
            # Data for create/update operations
            "title": "Conversation Title",  # For conversations
            "content": "Message content",   # For messages
            "role": "user|assistant"        # For messages
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
        conversation_id = request.get('conversationId')
        data = request.get('data', {})
        
        # Validate required fields
        if not user_id:
            raise ValueError("Missing required field: userId")
        
        valid_operations = [
            'create_conversation', 'get_conversations', 'get_conversation', 
            'delete_conversation', 'add_message', 'get_messages'
        ]
        if operation not in valid_operations:
            raise ValueError(f"Invalid operation: {operation}")
            
        # Get Astra DB connection details
        headers = get_astra_db_headers()
        endpoint = get_astra_rest_endpoint()
        
        if not headers or not endpoint:
            raise ValueError("Missing Astra DB connection details")
        
        # Process based on operation
        result = None
        
        # ----- Conversation Operations -----
        if operation == 'create_conversation':
            if not agent_id:
                raise ValueError("Missing required field: agentId")
                
            # Generate a new conversation ID if not provided
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                
            # Prepare conversation data
            conversation_data = {
                "id": conversation_id,
                "user_id": user_id,
                "agent_id": agent_id,
                "title": data.get('title', 'New Conversation'),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert into conversations collection
            conversations_url = f"{endpoint}/collections/conversations/{conversation_id}"
            response = requests.put(conversations_url, headers=headers, json={"data": conversation_data})
            response.raise_for_status()
            
            result = {"success": True, "conversationId": conversation_id, "conversation": conversation_data}
            
        elif operation == 'get_conversations':
            # List all conversations for user and optionally filtered by agent
            conversations_url = f"{endpoint}/collections/conversations"
            
            # Build query
            query = {"user_id": {"$eq": user_id}}
            if agent_id:
                query["agent_id"] = {"$eq": agent_id}
                
            response = requests.get(
                conversations_url, 
                headers=headers, 
                params={"where": json.dumps(query)}
            )
            response.raise_for_status()
            conversations = response.json().get('data', {}).get('documents', [])
            
            # Sort by updated_at descending
            conversations.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
            
            result = {"success": True, "conversations": conversations}
            
        elif operation == 'get_conversation':
            if not conversation_id:
                raise ValueError("Missing required field: conversationId")
                
            # Get single conversation
            conversation_url = f"{endpoint}/collections/conversations/{conversation_id}"
            response = requests.get(conversation_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Conversation not found"}
            else:
                response.raise_for_status()
                conversation = response.json().get('data')
                
                # Verify user owns this conversation
                if conversation.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to conversation"}
                else:
                    result = {"success": True, "conversation": conversation}
                    
        elif operation == 'delete_conversation':
            if not conversation_id:
                raise ValueError("Missing required field: conversationId")
                
            # First get the existing conversation to verify ownership
            conversation_url = f"{endpoint}/collections/conversations/{conversation_id}"
            response = requests.get(conversation_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Conversation not found"}
            else:
                response.raise_for_status()
                conversation = response.json().get('data')
                
                # Verify user owns this conversation
                if conversation.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to conversation"}
                else:
                    # Delete all messages for this conversation
                    messages_url = f"{endpoint}/collections/messages"
                    query = {"conversation_id": {"$eq": conversation_id}}
                    delete_response = requests.delete(
                        messages_url,
                        headers=headers,
                        params={"where": json.dumps(query)}
                    )
                    delete_response.raise_for_status()
                    
                    # Delete the conversation
                    response = requests.delete(conversation_url, headers=headers)
                    response.raise_for_status()
                    
                    result = {"success": True, "deleted": conversation_id}
        
        # ----- Message Operations -----
        elif operation == 'add_message':
            if not conversation_id:
                raise ValueError("Missing required field: conversationId")
                
            # Verify conversation exists and user has access
            conversation_url = f"{endpoint}/collections/conversations/{conversation_id}"
            conv_response = requests.get(conversation_url, headers=headers)
            
            if conv_response.status_code == 404:
                result = {"success": False, "error": "Conversation not found"}
            else:
                conv_response.raise_for_status()
                conversation = conv_response.json().get('data')
                
                # Verify user owns this conversation
                if conversation.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to conversation"}
                else:
                    # Required fields for message
                    content = data.get('content')
                    role = data.get('role')
                    
                    if not content:
                        raise ValueError("Missing required field in data: content")
                        
                    if not role or role not in ['user', 'assistant', 'system', 'error']:
                        raise ValueError("Invalid or missing role in data. Must be 'user', 'assistant', 'system', or 'error'")
                    
                    # Generate message ID
                    message_id = str(uuid.uuid4())
                    
                    # Prepare message data
                    message_data = {
                        "id": message_id,
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "role": role,
                        "content": content,
                        "metadata": data.get('metadata', {}),
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    # Insert message
                    messages_url = f"{endpoint}/collections/messages/{message_id}"
                    msg_response = requests.put(messages_url, headers=headers, json={"data": message_data})
                    msg_response.raise_for_status()
                    
                    # Update conversation's updated_at timestamp
                    conversation['updated_at'] = datetime.utcnow().isoformat()
                    update_response = requests.put(conversation_url, headers=headers, json={"data": conversation})
                    update_response.raise_for_status()
                    
                    result = {"success": True, "messageId": message_id, "message": message_data}
                    
        elif operation == 'get_messages':
            if not conversation_id:
                raise ValueError("Missing required field: conversationId")
                
            # First verify conversation exists and user has access
            conversation_url = f"{endpoint}/collections/conversations/{conversation_id}"
            conv_response = requests.get(conversation_url, headers=headers)
            
            if conv_response.status_code == 404:
                result = {"success": False, "error": "Conversation not found"}
            else:
                conv_response.raise_for_status()
                conversation = conv_response.json().get('data')
                
                # Verify user owns this conversation
                if conversation.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to conversation"}
                else:
                    # Get messages for this conversation
                    messages_url = f"{endpoint}/collections/messages"
                    query = {"conversation_id": {"$eq": conversation_id}}
                    
                    msg_response = requests.get(
                        messages_url,
                        headers=headers,
                        params={"where": json.dumps(query)}
                    )
                    msg_response.raise_for_status()
                    messages = msg_response.json().get('data', {}).get('documents', [])
                    
                    # Sort by created_at ascending
                    messages.sort(key=lambda x: x.get('created_at', ''))
                    
                    result = {"success": True, "messages": messages}
        
        # Publish result
        context.publish(context.get_output_topic(), json.dumps(result))
        
    except Exception as e:
        logger.error(f"Error processing conversation management request: {e}")
        logger.error(traceback.format_exc())
        
        error_payload = {
            "success": False,
            "error": str(e)
        }
        context.publish(context.get_output_topic(), json.dumps(error_payload))
    
    # Acknowledge message
    context.ack(context.get_message()) 