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
The correct package structure is critical. Your main function code should be inside a directory named after your class/module, and all dependencies must be at the root level of the zip file, alongside your main code directory:

```
your-function-package.zip
├── your_module_name/            # Directory named after your className
│   └── __init__.py              # Your function code goes here
├── requests/                    # Dependency package directory
├── Crypto/                      # Dependency package directory (e.g., from pycryptodome)
├── certifi/                     # Dependency package directory
└── other_dependency_package/    # ...and so on
```
Your `--className` parameter during deployment should match the directory name (`your_module_name` in this example). Pulsar will then look for `your_module_name/__init__.py` to load the function.

## 3. Creating the Function Package (Reliable Method using Docker)

To ensure dependencies are compatible with the Astra Streaming Linux environment (typically `linux/amd64`), especially when developing on a different architecture (like macOS ARM), use Docker to build them.

```bash
# 1. Create the required directory structure
mkdir -p your-function-name/python-code
mkdir your-function-name/linux_deps_amd64 # For storing linux dependencies
cd your-function-name

# 2. Place your function code
#    Save your main function code as python-code/your_module_name.py
#    Example: python-code/credential_manager.py

# 3. Create requirements.txt
#    List all your Python dependencies in python-code/requirements.txt
echo "requests" > python-code/requirements.txt
echo "pycryptodome" >> python-code/requirements.txt
# Add other dependencies...

# 4. Create Dockerfile (in the 'your-function-name' directory)
#    This Dockerfile builds dependencies for the correct platform.
cat <<EOF > Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Copy only the requirements file to leverage Docker cache
COPY ./python-code/requirements.txt .

# Install dependencies into a specific directory
# Use --platform=linux/amd64 in the 'docker build' command later if needed,
# but installing within a linux/amd64 base image *should* suffice.
# However, explicitly requesting the platform during build is safer.
RUN pip install --no-cache-dir -r requirements.txt -t ./deps
EOF

# 5. Build Docker image and extract dependencies
#    Use --platform linux/amd64 to force the build for the target architecture
docker build --platform linux/amd64 -t your-builder-amd64 .
BUILD_ID=$(docker create your-builder-amd64)
# Use the directory created in Step 1 for amd64 deps
docker cp $BUILD_ID:/app/deps/. ./linux_deps_amd64 # Copy contents of /app/deps
docker rm -v $BUILD_ID

# 6. Prepare the final staging directory
cd .. # Go back to workspace root if needed
rm -rf staging_final
mkdir staging_final
mkdir staging_final/your_module_name # Match className

# 7. Copy source code and dependencies
cp your-function-name/python-code/your_module_name.py staging_final/your_module_name/__init__.py
# Copy the *contents* of the linux_deps_amd64 directory
cp -R your-function-name/linux_deps_amd64/* staging_final/

# 8. Create the final function package zip
cd staging_final
zip -r ../your-function-package.zip . # Zip contents of staging_final
cd .. # Go back to workspace root
```
Replace `your-function-name`, `your_module_name`, and `your-function-package.zip` with your actual names. Ensure `your_module_name.py` exists and `requirements.txt` is populated correctly.


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
| "ModuleNotFoundError: No module named 'X'" | Ensure the module 'X' and its own dependencies were correctly installed and packaged at the root level of the zip file, alongside your main function directory. Verify the architecture matches (see Section 3 and 8). |
| "UNAVAILABLE: io exception" | Often related to package structure or missing dependencies. Double-check the zip structure (Section 2) and ensure all required libraries are included and compatible. |
| "Could not import User Function Module" | Verify `--className` parameter matches the directory name containing your `__init__.py` function code (case-sensitive). |
| "401 Unauthorized" | Verify your authentication token (`--auth-params "token:YOUR_TOKEN"`) is valid, not expired, and has permissions for function management. Ensure the token is placed correctly in the command (global option *before* `functions create/update`). |
| "Host resolution failure" | Check that you're using the correct admin URL (`--admin-url`) for your Astra region/cluster. |
| `OSError: Cannot load native module 'Crypto.Cipher._raw_ecb': ... invalid ELF header` OR `... cannot open shared object file: No such file or directory` | This indicates an architecture mismatch or missing native compiled code (`.so` files). Dependencies (like `pycryptodome`) were likely built on an incompatible architecture (e.g., ARM Mac) for the Astra Linux/amd64 runtime. Rebuild dependencies using Docker with `--platform linux/amd64` as shown in Section 3. Ensure the `.so` files are present at the correct path within the zip file. |

## 8. Common Issues and Solutions (Extended)

### Architecture Mismatch (Critical)
Astra Streaming functions run in a Linux environment, typically on `amd64` (also known as `x86_64`) architecture. If you build your Python dependencies (especially those with C extensions like `pycryptodome`) on a different architecture (e.g., an ARM-based Mac M1/M2/M3 using `aarch64`), the compiled code (`.so` files) will be incompatible.

**Solution**: ALWAYS build your dependencies within an environment matching the target architecture. Using Docker with the `--platform linux/amd64` flag during the `docker build` step is the most reliable way to ensure compatibility. See the updated Section 3 for the recommended workflow. Failure to do this is a common cause of `OSError: Cannot load native module...` errors during function startup.

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
