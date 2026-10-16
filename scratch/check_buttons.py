import glob
import re

files = glob.glob('frontend/src/**/*.jsx', recursive=True)
button_regex = re.compile(r'<button\b([^>]*)>(.*?)</button>', re.DOTALL)

buttons_without_handler = []
all_buttons = []

for f in sorted(files):
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    for m in button_regex.finditer(content):
        attrs = m.group(1)
        body = m.group(2).strip()
        text = re.sub(r'<[^>]+>', '', body).strip()
        text = ' '.join(text.split())[:40]
        
        has_onclick = 'onClick' in attrs
        has_type_submit = 'type="submit"' in attrs or "type='submit'" in attrs
        
        if not has_onclick and not has_type_submit:
            buttons_without_handler.append((f, text or '[Icon only]', attrs))
        all_buttons.append((f, text or '[Icon only]', attrs))

print(f"Total buttons found: {len(all_buttons)}")
print(f"Buttons without onClick or type=submit: {len(buttons_without_handler)}")
for f, text, attrs in buttons_without_handler:
    print(f"  {f}: \"{text}\" -> attrs: {attrs.strip()}")
