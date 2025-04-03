import pulsar
import json
import os
import requests
import traceback
import uuid
import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from datetime import datetime

# --- Environment Variables ---
ASTRA_DB_ID = os.getenv("ASTRA_DB_ID")
ASTRA_DB_REGION = os.getenv("ASTRA_DB_REGION")
ASTRA_DB_KEYSPACE = os.getenv("ASTRA_DB_KEYSPACE", "flow_app_prod")
ASTRA_DB_APPLICATION_TOKEN = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")  # Must be 32 bytes for AES-256

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

def derive_key(key):
    """Derive a 32-byte key from the provided key"""
    if not key:
        raise ValueError("Encryption key not configured")
    return hashlib.sha256(key.encode()).digest()

def encrypt_credentials(credentials, key):
    """
    Encrypt credentials using AES-256-GCM
    Returns base64 encoded string of nonce + tag + ciphertext
    """
    key_bytes = derive_key(key)
    nonce = get_random_bytes(12)
    cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(json.dumps(credentials).encode('utf-8'))
    
    # Concatenate nonce, tag, and ciphertext
    encrypted_data = nonce + tag + ciphertext
    return base64.b64encode(encrypted_data).decode('utf-8')

def decrypt_credentials(encrypted_data, key):
    """
    Decrypt credentials from base64 encoded string of nonce + tag + ciphertext
    """
    if not encrypted_data:
        return {}
        
    key_bytes = derive_key(key)
    encrypted_bytes = base64.b64decode(encrypted_data)
    
    # Extract nonce, tag, and ciphertext
    nonce = encrypted_bytes[:12]
    tag = encrypted_bytes[12:28]
    ciphertext = encrypted_bytes[28:]
    
    # Decrypt
    cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=nonce)
    try:
        decrypted_data = cipher.decrypt_and_verify(ciphertext, tag)
        return json.loads(decrypted_data.decode('utf-8'))
    except (ValueError, KeyError) as e:
        raise ValueError(f"Decryption failed: {e}")

def process(input_payload, context):
    """
    Processes credential management operations: create, read, update, delete.
    
    Expected input payload:
    {
        "operation": "create|read|update|delete|list",
        "userId": "user-id",
        "credentialId": "credential-id",  # Optional for create and list
        "data": {
            # Credential data for create/update operations
            "name": "Credential Name",
            "provider": "google|openai|etc",
            "credentials": {
                # Provider-specific credentials
                "api_key": "sk-...",
                "client_id": "...",
                "client_secret": "..."
            }
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
        credential_id = request.get('credentialId')
        data = request.get('data', {})
        
        # Validate required fields
        if not user_id:
            raise ValueError("Missing required field: userId")
        
        if operation not in ['create', 'read', 'update', 'delete', 'list']:
            raise ValueError(f"Invalid operation: {operation}")
            
        # Check encryption key is set
        if not ENCRYPTION_KEY and operation in ['create', 'update']:
            raise ValueError("Encryption key not configured in environment variables")
            
        # Get Astra DB connection details
        headers = get_astra_db_headers()
        endpoint = get_astra_rest_endpoint()
        
        if not headers or not endpoint:
            raise ValueError("Missing Astra DB connection details")
        
        # Process based on operation
        result = None
        
        if operation == 'create':
            # Validate create-specific fields
            if not data.get('name'):
                raise ValueError("Missing required field in data: name")
            
            if not data.get('provider'):
                raise ValueError("Missing required field in data: provider")
                
            if not data.get('credentials'):
                raise ValueError("Missing required field in data: credentials")
                
            # Generate a new credential ID if not provided
            if not credential_id:
                credential_id = str(uuid.uuid4())
                
            # Encrypt sensitive credentials
            encrypted_credentials = encrypt_credentials(data.get('credentials'), ENCRYPTION_KEY)
                
            # Prepare credential data
            credential_data = {
                "id": credential_id,
                "user_id": user_id,
                "name": data.get('name'),
                "provider": data.get('provider'),
                "encrypted_credentials": encrypted_credentials,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert into credentials collection
            credentials_url = f"{endpoint}/collections/credentials/{credential_id}"
            response = requests.put(credentials_url, headers=headers, json={"data": credential_data})
            response.raise_for_status()
            
            # Return success but don't include the encrypted credentials
            safe_credential = dict(credential_data)
            safe_credential.pop('encrypted_credentials', None)
            
            result = {"success": True, "credentialId": credential_id, "credential": safe_credential}
            
        elif operation == 'list':
            # List all credentials for user
            credentials_url = f"{endpoint}/collections/credentials"
            query = {"user_id": {"$eq": user_id}}
            
            response = requests.get(
                credentials_url, 
                headers=headers, 
                params={"where": json.dumps(query)}
            )
            response.raise_for_status()
            
            # Get credentials but remove encrypted data
            credentials = response.json().get('data', {}).get('documents', [])
            safe_credentials = []
            
            for cred in credentials:
                safe_cred = dict(cred)
                safe_cred.pop('encrypted_credentials', None)
                safe_credentials.append(safe_cred)
            
            result = {"success": True, "credentials": safe_credentials}
            
        elif operation == 'read':
            if not credential_id:
                raise ValueError("Missing required field: credentialId")
                
            # Get single credential
            credential_url = f"{endpoint}/collections/credentials/{credential_id}"
            response = requests.get(credential_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Credential not found"}
            else:
                response.raise_for_status()
                credential = response.json().get('data')
                
                # Verify user owns this credential
                if credential.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to credential"}
                else:
                    # Decrypt credentials if requested
                    include_decrypted = request.get('includeDecrypted', False)
                    safe_credential = dict(credential)
                    
                    if include_decrypted and ENCRYPTION_KEY:
                        try:
                            decrypted_credentials = decrypt_credentials(
                                credential.get('encrypted_credentials', ''), 
                                ENCRYPTION_KEY
                            )
                            safe_credential['credentials'] = decrypted_credentials
                        except Exception as e:
                            logger.error(f"Error decrypting credentials: {e}")
                            result = {"success": False, "error": f"Failed to decrypt credentials: {str(e)}"}
                            context.publish(context.get_output_topic(), json.dumps(result))
                            context.ack(context.get_message())
                            return
                            
                    # Always remove encrypted credentials from response
                    safe_credential.pop('encrypted_credentials', None)
                    
                    result = {"success": True, "credential": safe_credential}
                    
        elif operation == 'update':
            if not credential_id:
                raise ValueError("Missing required field: credentialId")
                
            # First get the existing credential
            credential_url = f"{endpoint}/collections/credentials/{credential_id}"
            response = requests.get(credential_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Credential not found"}
            else:
                response.raise_for_status()
                credential = response.json().get('data')
                
                # Verify user owns this credential
                if credential.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to credential"}
                else:
                    # Update fields
                    if data.get('name'):
                        credential['name'] = data.get('name')
                        
                    if data.get('provider'):
                        credential['provider'] = data.get('provider')
                        
                    # Re-encrypt credentials if provided
                    if data.get('credentials'):
                        credential['encrypted_credentials'] = encrypt_credentials(
                            data.get('credentials'), 
                            ENCRYPTION_KEY
                        )
                        
                    credential['updated_at'] = datetime.utcnow().isoformat()
                    
                    # Update in DB
                    response = requests.put(credential_url, headers=headers, json={"data": credential})
                    response.raise_for_status()
                    
                    # Create safe version for response
                    safe_credential = dict(credential)
                    safe_credential.pop('encrypted_credentials', None)
                    
                    result = {"success": True, "credential": safe_credential}
                    
        elif operation == 'delete':
            if not credential_id:
                raise ValueError("Missing required field: credentialId")
                
            # First get the existing credential to verify ownership
            credential_url = f"{endpoint}/collections/credentials/{credential_id}"
            response = requests.get(credential_url, headers=headers)
            
            if response.status_code == 404:
                result = {"success": False, "error": "Credential not found"}
            else:
                response.raise_for_status()
                credential = response.json().get('data')
                
                # Verify user owns this credential
                if credential.get('user_id') != user_id:
                    result = {"success": False, "error": "Unauthorized access to credential"}
                else:
                    # Delete the credential
                    response = requests.delete(credential_url, headers=headers)
                    response.raise_for_status()
                    
                    result = {"success": True, "deleted": credential_id}
        
        # Publish result
        context.publish(context.get_output_topic(), json.dumps(result))
        
    except Exception as e:
        logger.error(f"Error processing credential management request: {e}")
        logger.error(traceback.format_exc())
        
        error_payload = {
            "success": False,
            "error": str(e)
        }
        context.publish(context.get_output_topic(), json.dumps(error_payload))
    
    # Acknowledge message
    context.ack(context.get_message()) 