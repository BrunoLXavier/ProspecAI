import glob, re, os
path='backend/alembic/baseline/versions'
files=glob.glob(os.path.join(path,'*.py'))
mapping={}
for f in files:
    txt=open(f,encoding='utf-8').read()
    rev=re.search(r"^revision\s*=\s*['\"]([^'\"]+)['\"]",txt,flags=re.M)
    down=re.search(r"^down_revision\s*=\s*['\"]([^'\"]+)['\"]",txt,flags=re.M)
    r=rev.group(1) if rev else None
    d=down.group(1) if down else None
    mapping[r]=d
# build children map
children={}
for r,d in mapping.items():
    children.setdefault(d,[]).append(r)
print('Found revisions:')
for r,d in mapping.items():
    print(f"  {r} -> {d}")
print('\nParents with multiple children (branching points):')
for parent, childs in children.items():
    if len(childs)>1:
        print(f"  {parent} has children: {childs}")
print('\nHeads (revisions that are not parents of any other):')
parents=set(children.keys())
allrev=set(mapping.keys())
heads=[r for r in allrev if r not in parents]
for h in heads:
    print('  ',h)
