#!/usr/bin/env python3
"""Script to fix CORS middleware in main.py"""

filepath = 'backend/app/main.py'
content = open(filepath, 'r', encoding='utf-8').read()

# Detect line ending style
crlf = '\r\n' in content
le = '\r\n' if crlf else '\n'

old_block = (
    f"# CORS Middleware (Outer - handles browser preflight requests){le}"
    f"app.add_middleware({le}"
    f"    CORSMiddleware,{le}"
    f"    allow_origins=settings.cors_origins_list,{le}"
    f"    allow_credentials=True,{le}"
    f"    allow_methods=[\"*\"],{le}"
    f"    allow_headers=[\"*\"],{le}"
    f"    expose_headers=[\"Content-Disposition\"]{le}"
    f")"
)

new_block = (
    f"# CORS Middleware (Outer - handles browser preflight requests){le}"
    f"# Uses allow_origin_regex to support all *.onrender.com preview URLs{le}"
    f"# without ever opening CORS to \"*\" (which would allow any website){le}"
    f"_cors_exact_origins = [o.strip().rstrip(\"/\") for o in settings.cors_origins_list if \"*\" not in o]{le}"
    f"app.add_middleware({le}"
    f"    CORSMiddleware,{le}"
    f"    allow_origins=_cors_exact_origins,{le}"
    f"    allow_origin_regex=({le}"
    f"        r\"https://[a-z0-9-]+\\.onrender\\.com$\"{le}"
    f"        r\"|https://[a-z0-9-]+\\.vercel\\.app$\"{le}"
    f"        r\"|https://[a-z0-9-]+\\.netlify\\.app$\"{le}"
    f"    ),{le}"
    f"    allow_credentials=True,{le}"
    f"    allow_methods=[\"GET\", \"POST\", \"PUT\", \"PATCH\", \"DELETE\", \"OPTIONS\"],{le}"
    f"    allow_headers=[\"Authorization\", \"Content-Type\", \"x-nexa-timestamp\", \"x-test-suite\"],{le}"
    f"    expose_headers=[\"Content-Disposition\"]{le}"
    f")"
)

if old_block in content:
    result = content.replace(old_block, new_block, 1)
    open(filepath, 'w', encoding='utf-8').write(result)
    print("SUCCESS: CORS middleware updated.")
else:
    print("ERROR: Old block not found. Dumping lines 70-82:")
    lines = content.splitlines()
    for i in range(69, min(83, len(lines))):
        print(f"  {i+1}: {repr(lines[i])}")
