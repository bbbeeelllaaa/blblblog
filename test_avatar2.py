import paramiko

host = "47.99.50.109"
user = "root"
password = "@ls951230"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

# Write a test script to the server
script = '''
import urllib.request, urllib.error, json, base64, os

# Create test PNG
png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")
with open("/tmp/test_avatar.png", "wb") as f:
    f.write(png)

# Login
login_data = json.dumps({"email": "test@test.com", "password": "test123"}).encode()
req = urllib.request.Request("http://localhost/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read())["access_token"]
    print(f"Got token: {token[:30]}...")
except Exception as e:
    print(f"Login failed: {e}")
    # Try with different credentials or list users
    import subprocess
    subprocess.run(["docker", "exec", "blblblog-postgres", "psql", "-U", "blog_user", "-d", "blog_db", "-c", "SELECT id, username, email FROM users LIMIT 5"])
    exit()

# Upload avatar
import http.client
conn = http.client.HTTPConnection("localhost", 80)
boundary = "----TestBoundary123"
body = (
    f"--{boundary}\\r\\n"
    f'Content-Disposition: form-data; name="file"; filename="test_avatar.png"\\r\\n'
    f"Content-Type: image/png\\r\\n\\r\\n"
)
body_bytes = body.encode() + png + f"\\r\\n--{boundary}--\\r\\n".encode()

headers = {
    "Content-Type": f"multipart/form-data; boundary={boundary}",
    "Authorization": f"Bearer {token}",
}
conn.request("POST", "/api/users/me/avatar", body=body_bytes, headers=headers)
resp = conn.getresponse()
print(f"Status: {resp.status}")
print(f"Response: {resp.read().decode()}")

# Also check the uploaded file
print("\\nFile check:")
result = subprocess.run(["docker", "exec", "blblblog-backend", "ls", "-la", "/app/uploads/"], capture_output=True, text=True)
print(result.stdout[-500:])
'''

# Write and run
sftp = ssh.open_sftp()
with sftp.file("/tmp/test_avatar_upload.py", "w") as f:
    f.write(script)
sftp.close()

def run(cmd):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out[:2000])
    if err:
        print(f"ERR: {err[:500]}")

run("python3 /tmp/test_avatar_upload.py 2>&1")

ssh.close()
