# --- Contents of langflow_worker.py ---
import pulsar
import json
import os
import requests
import traceback
import time
from typing import List
from pulsar.schema import Record, String, Bytes, JsonSchema, Map

# --- Environment Variables (Configure these in Astra Function Settings) ---
LANGFLOW_API_URL = os.getenv("LANGFLOW_API_URL") # e.g., "https://your-langflow.cloud"
LANGFLOW_API_TOKEN = os.getenv("LANGFLOW_API_TOKEN")
# Optional: DB Credentials if saving messages (ensure table exists)
ASTRA_DB_ID = os.getenv("ASTRA_DB_ID")
ASTRA_DB_REGION = os.getenv("ASTRA_DB_REGION")
ASTRA_DB_KEYSPACE = os.getenv("ASTRA_DB_KEYSPACE", "flow_app_prod") # Default keyspace
ASTRA_DB_APPLICATION_TOKEN = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
SAVE_MESSAGES_ENABLED = os.getenv("SAVE_MESSAGES_ENABLED", "false").lower() == "true"
# ---

# Define the expected input schema (matching pulsarPayload from execute.js)
# Using Record classes is optional if not using schema registry/validation
# class JobPayload(Record):
#     executionId = String(required=True)
#     userId = String(required=True)
#     agentId = String(required=True)
#     langflowFlowId = String(required=True)
#     inputs = Map(String(), required=True) # Assuming inputs are {string: string} map
#     credentials = Map(String(), required=True) # Map of {field_name: secret_value}

# # Define the output schema for the results topic
# class ResultPayload(Record):
#     executionId = String(required=True)
#     type = String(required=True) # 'stream', 'end', 'error'
#     payload = String(required=True) # JSON string of the actual data/error

def get_astra_db_headers():
    if not ASTRA_DB_APPLICATION_TOKEN:
        return None
    return {
        "Authorization": f"Bearer {ASTRA_DB_APPLICATION_TOKEN}",
        "Content-Type": "application/json",
    }

def save_message_to_db(conversation_id, role, content, metadata=None):
    """Optional: Saves a message to the messages table."""
    if not SAVE_MESSAGES_ENABLED or not conversation_id:
        return

    headers = get_astra_db_headers()
    if not headers or not ASTRA_DB_ID or not ASTRA_DB_REGION or not ASTRA_DB_KEYSPACE:
        print(f"[WARN] Cannot save message for conv {conversation_id}: Missing Astra DB connection details.")
        return

    timestamp = time.strftime('%Y-%m-%dT%H:%M:%S.%fZ', time.gmtime()) + 'Z'

    # NOTE: This uses the Document API structure - Adapt if using pure CQL table
    # For pure CQL table 'messages', you'd use a different endpoint/method
    # e.g., POST to /api/rest/v2/keyspaces/{ASTRA_DB_KEYSPACE}/messages
    # with the full data including conversation_id and generated message_id (timeuuid)
    # Using a placeholder DB insert call for now
    try:
        print(f"[WARN] DB Save Placeholder: ConvID={conversation_id}, Role={role}")
        # Replace below with actual DB insert logic
        # Example using hypothetical CQL insert endpoint:
        # insert_url = f"https://{ASTRA_DB_ID}-{ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2/keyspaces/{ASTRA_DB_KEYSPACE}/messages"
        # message_data = {
        #     "conversation_id": conversation_id, # Assuming UUID as string
        #     "message_id": str(uuid.uuid1()), # Generate TimeUUID
        #     "role": role,
        #     "content": content,
        #     "metadata": metadata or {},
        #     "timestamp": timestamp
        # }
        # response = requests.post(insert_url, headers=headers, json=message_data, timeout=10)
        # response.raise_for_status()

    except Exception as e:
        print(f"[ERROR] Failed to save message for conv {conversation_id}: {e}")

# Main processing function for the Astra Function
def process(input_payload, context):
    """
    Processes incoming job payloads from the flow_triggers topic.
    Calls Langflow, streams results back to the flow_results topic.
    """
    logger = context.get_logger()
    job = None
    execution_id = "unknown_execution" # Default in case parsing fails

    try:
        # --- 1. Parse Input ---
        if isinstance(input_payload, bytes):
             job_dict = json.loads(input_payload.decode('utf-8'))
        elif isinstance(input_payload, dict):
             job_dict = input_payload
        else:
             raise ValueError(f"Unexpected input type: {type(input_payload)}")

        job = job_dict
        execution_id = job['executionId'] # Update execution_id once parsed
        langflow_flow_id = job['langflowFlowId']
        user_id = job['userId']
        inputs = job.get('inputs', {})
        credentials = job.get('credentials', {})

        logger.info(f"[{execution_id}] Received job for flow: {langflow_flow_id}, user: {user_id}")

        # --- 2. Prepare Langflow Request ---
        if not LANGFLOW_API_URL or not LANGFLOW_API_TOKEN:
            raise ValueError("Langflow API URL or Token not configured.")

        run_url = f"{LANGFLOW_API_URL}/run/{langflow_flow_id}?stream=true"
        headers = {
            'Authorization': f"Bearer {LANGFLOW_API_TOKEN}",
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        }

        langflow_payload = {
            "input_value": inputs,
            **credentials
        }
        # Avoid logging full payload if credentials are sensitive
        logger.debug(f"[{execution_id}] Calling Langflow URL: {run_url}")

        # --- Optional: Save User Input Message ---
        conversation_id = inputs.get("conversation_id")
        # Try to get user text from common input field names
        user_input_content = inputs.get("input_value") or inputs.get("input") or inputs.get("query") or inputs.get("text")
        if conversation_id and user_input_content and isinstance(user_input_content, str):
             save_message_to_db(conversation_id, "user", user_input_content, {"executionId": execution_id})

        # --- 3. Call Langflow & Stream Response ---
        try:
            response = requests.post(run_url, headers=headers, json=langflow_payload, stream=True, timeout=300)
            response.raise_for_status()

            full_assistant_response = ""

            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data:'):
                        data_json = decoded_line[len('data:'):].strip()
                        if data_json:
                            try:
                                data_payload = json.loads(data_json)
                                result_msg = {
                                    "executionId": execution_id,
                                    "type": "stream",
                                    "payload": json.dumps(data_payload)
                                }
                                context.publish(context.get_output_topic(), json.dumps(result_msg))

                                # Accumulate text from chunks for optional DB save
                                # Adapt this based on Langflow's actual streaming output structure
                                chunk_content = None
                                if isinstance(data_payload, dict):
                                     # Common patterns for text chunks
                                     chunk_content = data_payload.get("chunk") or \
                                                     data_payload.get("result", {}).get("message", {}).get("text") or \
                                                     data_payload.get("message", {}).get("text") or \
                                                     data_payload.get("result", {}).get("text") or \
                                                     data_payload.get("text")
                                elif isinstance(data_payload, str): # If the payload itself is just the text
                                     chunk_content = data_payload
                                     
                                if isinstance(chunk_content, str):
                                     full_assistant_response += chunk_content

                            except json.JSONDecodeError:
                                logger.warning(f"[{execution_id}] Failed to decode SSE data JSON: {data_json}")

            # --- 4. Publish End Event ---
            logger.info(f"[{execution_id}] Langflow stream finished.")
            end_msg = { "executionId": execution_id, "type": "end", "payload": json.dumps({"status": "completed"}) }
            context.publish(context.get_output_topic(), json.dumps(end_msg))

            # --- Optional: Save Full Assistant Message ---
            if conversation_id and full_assistant_response:
                save_message_to_db(conversation_id, "assistant", full_assistant_response, {"executionId": execution_id})

        except requests.exceptions.RequestException as e:
            logger.error(f"[{execution_id}] Langflow API request failed: {e}")
            error_payload = {"message": f"Langflow API request error: {str(e)}"}
            if e.response is not None:
                 try:
                     error_detail = e.response.json()
                     # Avoid overly verbose details unless needed
                     error_payload["detail"] = error_detail.get('detail', error_detail) 
                 except json.JSONDecodeError:
                     error_payload["detail"] = e.response.text[:500]
                 error_payload["status_code"] = e.response.status_code

            error_msg = { "executionId": execution_id, "type": "error", "payload": json.dumps(error_payload) }
            context.publish(context.get_output_topic(), json.dumps(error_msg))

            if conversation_id:
                 save_message_to_db(conversation_id, "error", json.dumps(error_payload), {"executionId": execution_id})


    except Exception as e:
        logger.error(f"[{execution_id}] Error processing Pulsar message: {e}")
        logger.error(traceback.format_exc())
        error_payload = {"message": f"Internal worker error: {str(e)}"}
        error_msg = { "executionId": execution_id, "type": "error", "payload": json.dumps(error_payload) }
        try:
            context.publish(context.get_output_topic(), json.dumps(error_msg))
        except Exception as pub_e:
             logger.error(f"[{execution_id}] Failed to publish final error message: {pub_e}")

    # Acknowledge message regardless of outcome (unless configured otherwise)
    context.ack(context.get_message())


