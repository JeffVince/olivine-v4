FROM python:3.10-slim

WORKDIR /app

# Copy only the requirements file to leverage Docker cache
COPY ./python-code/requirements.txt .

# Install dependencies into a specific directory
RUN pip install --no-cache-dir -r requirements.txt -t ./deps 