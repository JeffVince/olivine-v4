import sys
sys.path.insert(0, 'credential_manager/lib')
from credential_manager import main

def handler(input_payload, context):
    return main(input_payload, context) 