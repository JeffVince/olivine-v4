# Manual: Deploying Functions to Astra Streaming

## 1. Prerequisites
- Astra Streaming tenant
- Authentication token
- Apache Pulsar CLI tools


Astra Streaming Token
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDM2OTc4NzcsImlzcyI6ImRhdGFzdGF4Iiwic3ViIjoiY2xpZW50OzA0NmNlZGYyLWUwYjMtNGY4Yy05NGM4LWRmNjc0NjdmYTNlMjtiMnhwZG1sdVpYUmxibUZ1ZEhZMDs2Y2ZhNjZhNjFjIiwidG9rZW5pZCI6IjZjZmE2NmE2MWMifQ.rwQzUnYMAaQ7wZA_7flqYE2L6vJSU1W4zQ5pFZBNgKBijeRMsn3F2pxzFakII2jIOshIyqkxP6KnVpUwZ2ToIWWvGXQK7nJsatLsM1rVYCJmCs6NDYL2eKuTTWFjREatWYEe6AnSrciX3Fz-W2x4RB09_oCgDWpObiCVVkyFhpk06Yu5X96k_EgQQ2-lTcw8QPyStIfShJMnOcesCn9TeZvDosR-VyQbuN8mK7u11-a01Cgz8AW73Y3ejK3X4vnYDtki05Z5moN4_L79aJhDwSFZPD_VueGDYQiN6wvi0wkzDnC9IOuskz-67SJBcMOWeMvTNOndRGWdfQy2rvj7dw



Astra Streaming Token ID: 
6cfa66a61c

ENV VARIABLES - Astra Prod DB ID: 94b5fa2d-eea7-4e5e-8387-8c97e27813d3
Name

olivinetenantv4

Plan Type

Pay As You Go

Cluster

pulsar-aws-uswest2

Pulsar Instance

prod0

Cloud Provider

aws

Cloud Provider Region

uswest2

Broker Service URL

pulsar+ssl://pulsar-aws-uswest2.streaming.datastax.com:6651

Web Service URL

https://pulsar-aws-uswest2.api.streaming.datastax.com

WebSocket URL

wss://pulsar-aws-uswest2.streaming.datastax.com:8001/ws/v2



## 2. Function Package Structure
The correct package structure is critical. Python modules and dependencies must be at the root level of the zip file:

```
agent-manager-function.zip
├── agent_manager.py (your function code)
├── requests/ (dependencies directly at root)
├── urllib3/
├── certifi/
└── other dependencies...
```

## 3. Creating the Function Package

```bash
# 1. Create a working directory
mkdir -p function-name/python-code
cd function-name/python-code

# 2. Create your function code
# Save your main function file (example: agent_manager.py)

# 3. Install dependencies DIRECTLY in the working directory
pip install requests -t .  # This installs all package files at root level

# 4. Create the function package
zip -r function-name.zip *  # This includes all files in current directory
```

## 4. Function Configuration
Key parameters for function creation:

- `tenant`: Your Astra tenant name (e.g., "olivinetenantv4")
- `namespace`: Namespace for your function (e.g., "default")
- `name`: Function name (e.g., "agent-manager-function")
- `className`: Python class/module to load (e.g., "agent_manager")
- `py`: Path to your function package zip file
- `inputs`: Input topic (e.g., "persistent://olivinetenantv4/default/agent-manager-input")
- `output`: Output topic (e.g., "persistent://olivinetenantv4/default/agent-manager-output")
- `logTopic`: Log topic (e.g., "persistent://olivinetenantv4/default/agent-manager-logs")

## 5. Deployment Commands

create the topics first
deploy the function using the absolute path to the zip file

### Creating a Function
```bash
./pulsar-admin --admin-url https://pulsar-aws-uswest2.api.streaming.datastax.com \
  --auth-plugin org.apache.pulsar.client.impl.auth.AuthenticationToken \
  --auth-params "token:YOUR_AUTHENTICATION_TOKEN" \
  functions create \
  --tenant olivinetenantv4 \
  --namespace default \
  --name agent-manager-function \
  --className agent_manager \
  --py /path/to/function-name.zip \
  --inputs persistent://olivinetenantv4/default/agent-manager-input \
  --output persistent://olivinetenantv4/default/agent-manager-output \
  --log-topic persistent://olivinetenantv4/default/agent-manager-logs
```

### Updating a Function
```bash
./pulsar-admin --admin-url https://pulsar-aws-uswest2.api.streaming.datastax.com \
  --auth-plugin org.apache.pulsar.client.impl.auth.AuthenticationToken \
  --auth-params "token:YOUR_AUTHENTICATION_TOKEN" \
  functions update \
  --tenant olivinetenantv4 \
  --namespace default \
  --name agent-manager-function \
  --className agent_manager \
  --py /path/to/function-name.zip
```

### Restarting a Function
```bash
./pulsar-admin --admin-url https://pulsar-aws-uswest2.api.streaming.datastax.com \
  --auth-plugin org.apache.pulsar.client.impl.auth.AuthenticationToken \
  --auth-params "token:YOUR_AUTHENTICATION_TOKEN" \
  functions restart \
  --tenant olivinetenantv4 \
  --namespace default \
  --name agent-manager-function
```

### Checking Function Status
```bash
./pulsar-admin --admin-url https://pulsar-aws-uswest2.api.streaming.datastax.com \
  --auth-plugin org.apache.pulsar.client.impl.auth.AuthenticationToken \
  --auth-params "token:YOUR_AUTHENTICATION_TOKEN" \
  functions status \
  --tenant olivinetenantv4 \
  --namespace default \
  --name agent-manager-function
```

## 6. Critical Things to Remember

- **Dependencies**: Install all dependencies directly in the root of the zip file, not in subdirectories.
- **Python Module Structure**: Use flat module names (e.g., "agent_manager" not "agent_manager.AgentManagerFunction").
- **Authentication**: Always include the correct admin URL and authentication token.
- **Service URLs**: Match the region/cluster of your Astra Streaming tenant (e.g., aws-uswest2).
- **Check Status**: Always verify the function status after creation/updates to confirm it's running.

## 7. Common Errors and Solutions

| Error | Solution |
|-------|----------|
| "ModuleNotFoundError: No module named 'X'" | Install the module at the root level of your function package |
| "UNAVAILABLE: io exception" | Check your package structure, ensure dependencies are at root level |
| "Could not import User Function Module" | Verify className parameter matches your module name |
| "401 Unauthorized" | Verify your authentication token is valid and not expired |
| "Host resolution failure" | Check that you're using the correct admin URL for your region |

## 8. Common Issues and Solutions (Extended)

### Python Code Syntax Issues
| Issue | Solution |
|-------|----------|
| Backticks (```) in Python code | Remove any backticks or markdown formatting characters from your Python files before packaging them. These can cause syntax errors when deployed. |
| Import errors with Pulsar modules | Be careful when importing from Pulsar modules. For example, `List` is not available in `pulsar.schema` - use `from typing import List` instead. |
| Class not found after deployment | Ensure your class name in the `--className` parameter exactly matches your Python file's function/class (case-sensitive). |

### Imports and Dependencies
When packaging Python functions, be mindful of the imports:
- Use standard Python libraries when possible (like `typing` for type hints)
- Don't assume all Python modules are available in the Astra Streaming environment
- Test with minimal dependencies first, then add more complex dependencies as needed

### Deployment Process Best Practices
1. **Create topics first**: Always create all required topics (input, output, log) before deploying a function
2. **Verify packaging**: Ensure all dependencies are at the root level of your zip file
3. **Check function name length**: Function names have character limits - keep them concise
4. **Restart after updates**: Always restart functions after updating their code
5. **Check logs**: Use the logs topic to debug function issues

### Environment Variables
When using environment variables in your function:
```python
# Provide defaults for optional environment variables
SOME_SETTING = os.getenv("SOME_SETTING", "default_value")

# Check for required environment variables
if not REQUIRED_VAR:
    raise ValueError("Required environment variable REQUIRED_VAR is not set")
```

## 9. Example Python Function

```python
# agent_manager.py
import requests  # Dependency installed at root level

def process(input):
    """
    Sample function that processes input messages.
    """
    try:
        # Process the input
        result = {"processed": True, "input": input}
        return result
    except Exception as e:
        return {"error": str(e)}
```

By following this guide, you should be able to successfully create and deploy functions to Astra Streaming without encountering the common issues we troubleshooted earlier.
