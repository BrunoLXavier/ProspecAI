import glob,re,os
path='backend/alembic/baseline/versions'
files=glob.glob(os.path.join(path,'*.py'))
revs=[]
downs=[]
mapd={}
for f in files:
    txt=open(f,encoding='utf-8').read()
    rev=re.search(r"^revision\s*=\s*['\"]([^'\"]+)['\"]",txt,flags=re.M)
    down=re.search(r"^down_revision\s*=\s*['\"]([^'\"]+)['\"]",txt,flags=re.M)
    r=rev.group(1) if rev else None
    d=down.group(1) if down else None
    if r: revs.append(r)
    if d: downs.append(d)
    mapd[r]=d
print('Total revisions:', len(revs))
print('Total down_revisions:', len(downs))
unknown=[d for d in downs if d not in revs]
if unknown:
    print('Unknown down_revisions found:', unknown)
else:
    print('All down_revisions are known.')
from collections import Counter
print('Duplicate revisions:', [r for r,c in Counter(revs).items() if c>1])
# detect multiple roots (down_revision None count)
roots=[r for r,d in mapd.items() if d is None]
print('Roots (down_revision=None):', roots)
# detect branching parents
children={}
for r,d in mapd.items():
    children.setdefault(d,[]).append(r)
branching={p:ch for p,ch in children.items() if len(ch)>1}
print('Branching parents:', branching)
# show linear order by following from root
if roots:
    r=roots[0]
    order=[]
    cur=r
    visited=set()
    while True:
        nexts=[c for c,d in mapd.items() if d==cur]
        if not nexts:
            break
        if len(nexts)>1:
            print('Multiple children at',cur,nexts)
            break
        cur=nexts[0]
        order.append(cur)
    print('Linear order from root:', order)
else:
    print('No root found')
