import hashlib
import json
import os
import stat
import sys

request = json.loads(sys.argv[1])
role = request['role']
action = request['action']
name = request.get('path', '.')
if name.startswith('/workspace/'):
    name = name[len('/workspace/'):]
if not isinstance(name, str) or len(name) > 512 or '\x00' in name:
    raise ValueError('Invalid project path')
parts = name.split('/')
if name.startswith('/') or any(p in ('..', '') for p in parts):
    raise ValueError('Only paths beneath /workspace are allowed')
if action in ('write', 'edit') and (role == 'reviewer' or role == 'researcher' and name != 'PLAN.md'):
    raise PermissionError('Role does not permit this write')

fd = os.open('/workspace', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
try:
    for part in parts[:-1]:
        if part == '.':
            continue
        if action == 'write':
            try:
                os.mkdir(part, mode=0o700, dir_fd=fd)
            except FileExistsError:
                pass
        next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
        os.close(fd)
        fd = next_fd
    leaf = parts[-1]
    if action == 'list':
        target = os.open(leaf, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
        try:
            result = {'entries': sorted(os.listdir(target))[:200]}
        finally:
            os.close(target)
    elif action == 'read':
        target = os.open(leaf, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd)
        with os.fdopen(target, 'rb') as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise ValueError('Only regular project files are readable')
            data = stream.read(100001)
            if len(data) > 100000:
                raise ValueError('Project file exceeds 100 KB tool limit')
        result = {'text': data.decode('utf-8'), 'sha256': hashlib.sha256(data).hexdigest()}
    elif action in ('write', 'edit'):
        text = request.get('text')
        if not isinstance(text, str) or len(text.encode()) > 65536:
            raise ValueError('Text must be at most 64 KiB')
        if action == 'edit':
            target = os.open(leaf, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd)
            with os.fdopen(target, 'rb') as stream:
                old = stream.read(100001)
            if hashlib.sha256(old).hexdigest() != request.get('expected_sha256'):
                raise ValueError('File changed; read it again before editing')
        target = os.open(leaf, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600, dir_fd=fd)
        with os.fdopen(target, 'w', encoding='utf-8') as stream:
            stream.write(text)
        result = {'bytes': len(text.encode()), 'sha256': hashlib.sha256(text.encode()).hexdigest()}
    else:
        raise ValueError('Unsupported project operation')
    print(json.dumps(result, ensure_ascii=False))
finally:
    os.close(fd)
