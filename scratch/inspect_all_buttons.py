import glob
import re

files = glob.glob('frontend/src/components/*.jsx')

for f in sorted(files):
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    
    btn_start = None
    btn_lines = []
    
    print(f"\n=======================================================")
    print(f"FILE: {f}")
    print(f"=======================================================")
    
    btn_count = 0
    in_button = False
    button_tag = ""
    start_line = 0
    
    for i, line in enumerate(lines, 1):
        if '<button' in line and not in_button:
            in_button = True
            button_tag = line
            start_line = i
            # Check if self-closing or closes on same line
            if '</button>' in line:
                in_button = False
                btn_count += 1
                # Check onClick
                has_click = 'onClick' in button_tag
                has_type_submit = 'type="submit"' in button_tag or "type='submit'" in button_tag
                # Extract text
                clean = re.sub(r'<[^>]+>', '', button_tag).strip()
                print(f"  Line {start_line}: '{clean[:35]}' -> click={has_click}, submit={has_type_submit}")
        elif in_button:
            button_tag += " " + line
            if '</button>' in line:
                in_button = False
                btn_count += 1
                has_click = 'onClick' in button_tag
                has_type_submit = 'type="submit"' in button_tag or "type='submit'" in button_tag
                clean = re.sub(r'<[^>]+>', '', button_tag).strip()
                clean = ' '.join(clean.split())
                
                # Check for suspicious patterns:
                # 1. alert(
                # 2. empty onClick
                # 3. no click & no submit
                issues = []
                if not has_click and not has_type_submit:
                    issues.append("MISSING_HANDLER")
                if 'alert(' in button_tag:
                    issues.append("USES_ALERT")
                if '() => {}' in button_tag:
                    issues.append("EMPTY_HANDLER")
                
                status_str = f" [ISSUES: {', '.join(issues)}]" if issues else " [OK]"
                print(f"  Line {start_line}: '{clean[:40]}' -> click={has_click}, submit={has_type_submit}{status_str}")
