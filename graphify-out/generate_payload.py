import json
from pathlib import Path

# Load chunks
chunks = json.loads(Path('graphify-out/.graphify_chunks_split.json').read_text(encoding='utf-8'))
project_root = Path('graphify-out/.graphify_root').read_text(encoding='utf-8').strip()

subagents_payload = []

spec = Path('/home/anas/.gemini/config/skills/graphify/references/extraction-spec.md').read_text(encoding='utf-8')
# Find the prompt text within the markdown fences
# We'll split the file by code blocks
parts = spec.split('```')
prompt_template = parts[1].strip() if len(parts) > 1 else spec

for idx, chunk in enumerate(chunks):
    chunk_num = idx + 1
    total_chunks = len(chunks)
    file_list = '\n'.join(chunk)
    chunk_path = f'{project_root}/graphify-out/.graphify_chunk_{chunk_num:02d}.json'
    
    prompt = prompt_template
    prompt = prompt.replace('CHUNK_NUM', str(chunk_num))
    prompt = prompt.replace('TOTAL_CHUNKS', str(total_chunks))
    prompt = prompt.replace('FILE_LIST', file_list)
    prompt = prompt.replace('DEEP_MODE', 'false')
    prompt = prompt.replace('CHUNK_PATH', chunk_path)
    
    subagents_payload.append({
        'TypeName': 'self',
        'Role': f'Semantic Extractor Chunk {chunk_num:02d}',
        'Prompt': prompt
    })

Path('graphify-out/.graphify_subagents_payload.json').write_text(json.dumps(subagents_payload, indent=2, ensure_ascii=False), encoding='utf-8')
print('Payload generated successfully!')
