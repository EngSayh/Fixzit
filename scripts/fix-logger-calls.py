#!/usr/bin/env python3
"""
Fix logger calls to match the correct signature:
- logger.info(message, context?)
- logger.warn(message, context?)
- logger.error(message, error?, context?)
- logger.debug(message, data?)

Convert multi-argument calls into template strings or proper signature.
"""

import re
import sys
from pathlib import Path

def fix_logger_info_warn(content: str) -> str:
    """Fix logger.info and logger.warn calls with multiple arguments."""
    # Pattern: logger.info('text', arg1, 'text2', arg3, ...)
    # Convert to template string combining all parts
    
    # Match logger.info/warn with multiple string/variable arguments
    pattern = r'logger\.(info|warn)\([^)]+,\s*[^)]+\)'
    
    matches = list(re.finditer(pattern, content))
    if not matches:
        return content
    
    result = content
    offset = 0
    
    for match in matches:
        call = match.group(0)
        method = match.group(1)
        
        # Extract arguments
        args_str = call[call.index('(') + 1:call.rindex(')')]
        
        # Skip if already looks like proper format (message, {context})
        if '{' in args_str and args_str.count(',') == 1:
            continue
            
        # Parse arguments
        args = []
        current_arg = ''
        paren_depth = 0
        brace_depth = 0
        in_string = False
        string_char = None
        
        for char in args_str:
            if char in ('"', "'", '`') and (not in_string or char == string_char):
                in_string = not in_string
                string_char = char if in_string else None
            
            if not in_string:
                if char == '(':
                    paren_depth += 1
                elif char == ')':
                    paren_depth -= 1
                elif char == '{':
                    brace_depth += 1
                elif char == '}':
                    brace_depth -= 1
                elif char == ',' and paren_depth == 0 and brace_depth == 0:
                    args.append(current_arg.strip())
                    current_arg = ''
                    continue
            
            current_arg += char
        
        if current_arg.strip():
            args.append(current_arg.strip())
        
        # If only one argument, it's already correct
        if len(args) <= 1:
            continue
        
        # Build template string
        parts = []
        for arg in args:
            # Remove quotes if it's a string literal
            if (arg.startswith('"') and arg.endswith('"')) or \
               (arg.startswith("'") and arg.endswith("'")):
                parts.append(arg[1:-1])
            else:
                # It's a variable, wrap in ${}
                parts.append(f'${{{arg}}}')
        
        # Join with space
        template = ' '.join(parts)
        new_call = f'logger.{method}(`{template}`)'
        
        # Replace in result
        start = match.start() + offset
        end = match.end() + offset
        result = result[:start] + new_call + result[end:]
        offset += len(new_call) - len(call)
    
    return result

def fix_logger_error(content: str) -> str:
    """Fix logger.error calls to use correct signature."""
    # Pattern: logger.error('message', 'string') -> logger.error('message', Error)
    # Don't change logger.error('message', error) or logger.error('message', error, context)
    
    # Find logger.error calls with string as second argument (should be Error)
    pattern = r'logger\.error\([^)]+\)'
    
    matches = list(re.finditer(pattern, content))
    if not matches:
        return content
    
    result = content
    
    for match in matches:
        call = match.group(0)
        
        # Extract arguments
        args_str = call[call.index('(') + 1:call.rindex(')')]
        
        # Simple heuristic: if second arg is a plain string literal, it's likely wrong
        # logger.error('msg', 'detail') -> likely should be logger.error('msg: detail')
        # or logger.error('msg', error)
        
        # Split on comma (simple split, not parsing)
        if args_str.count(',') >= 1:
            parts = args_str.split(',', 2)
            if len(parts) >= 2:
                first_arg = parts[0].strip()
                second_arg = parts[1].strip()
                
                # If second arg is a plain quoted string, merge into first
                if (second_arg.startswith('"') and second_arg.endswith('"')) or \
                   (second_arg.startswith("'") and second_arg.endswith("'")):
                    # Merge
                    msg = first_arg
                    if msg.startswith('"') and msg.endswith('"'):
                        msg = msg[1:-1]
                    elif msg.startswith("'") and msg.endswith("'"):
                        msg = msg[1:-1]
                    
                    detail = second_arg[1:-1]
                    new_msg = f'`{msg} {detail}`'
                    
                    if len(parts) == 2:
                        new_call = f'logger.error({new_msg})'
                    else:
                        # Has third arg (context or error)
                        new_call = f'logger.error({new_msg}, {parts[2].strip()})'
                    
                    # Only replace if looks safe
                    if 'error' not in second_arg.lower():
                        result = result.replace(call, new_call)
    
    return result

def process_file(filepath: Path) -> bool:
    """Process a single file."""
    try:
        content = filepath.read_text(encoding='utf-8')
        original = content
        
        # Apply fixes
        content = fix_logger_info_warn(content)
        content = fix_logger_error(content)
        
        if content != original:
            filepath.write_text(content, encoding='utf-8')
            print(f"✅ Fixed: {filepath}")
            return True
        
        return False
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}", file=sys.stderr)
        return False

def main():
    """Main entry point."""
    workspace = Path('/workspaces/Fixzit')
    
    # Find all TypeScript files with logger usage
    patterns = [
        'app/**/*.ts',
        'app/**/*.tsx',
        'server/**/*.ts',
        'lib/**/*.ts',
        'components/**/*.ts',
        'components/**/*.tsx',
    ]
    
    files_to_check = []
    for pattern in patterns:
        files_to_check.extend(workspace.glob(pattern))
    
    # Filter to files that actually have logger calls with issues
    files_with_logger = []
    for f in files_to_check:
        if f.is_file():
            try:
                content = f.read_text(encoding='utf-8')
                if 'logger.' in content:
                    files_with_logger.append(f)
            except:
                pass
    
    print(f"🔍 Found {len(files_with_logger)} files with logger calls")
    
    fixed_count = 0
    for filepath in files_with_logger:
        if process_file(filepath):
            fixed_count += 1
    
    print(f"\n✨ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
