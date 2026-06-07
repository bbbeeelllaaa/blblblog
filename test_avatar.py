import paramiko

host = "47.99.50.109"
user = "root"
password = "@ls951230"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out[:1000])
    if err and "notice" not in err.lower() and "warning" not in err.lower():
        print(f"ERR: {err[:300]}")

# Login and get token
print("=== Login ===")
run("""curl -s -X POST http://localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ownerling@test.com","password":"123456"}' 2>&1""")

# Create a test image and upload
print("\n=== Create test image and upload ===")
run("""cd /tmp && python3 -c "
import base64
# 1x1 red PNG
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
with open('test_avatar.png', 'wb') as f:
    f.write(png)
print('Test image created')
" && TOKEN=$(curl -s -X POST http://localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ownerling@test.com","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])") && echo "Token: ${TOKEN:0:20}..." && curl -s -X POST http://localhost/api/users/me/avatar -H "Authorization: Bearer $TOKEN" -F "file=@test_avatar.png" 2>&1
""")

# Check backend logs for errors
print("\n=== Backend logs ===")
run("docker logs blblblog-backend --tail 20 2>&1 | grep -i 'error\|avatar\|upload\|traceback' || echo 'No relevant logs'")

ssh.close()
