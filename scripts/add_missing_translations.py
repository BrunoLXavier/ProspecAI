import json
from pathlib import Path

keys = [
'crm.tabContact','crm.tabNotes','crm.contactHint','crm.tabBasic','portfolio.lessonsLearnedHint','portfolio.tabs.basic','portfolio.tabs.financial','portfolio.tabs.lessons','teams.delete','teams.confirmDelete','communications.filters.linkedEntityType','communications.filters.all','communications.filters.proposal','communications.filters.client','communications.filters.fundingSource','communications.filters.opportunity','communications.newThread','communications.showUnconfirmedAutoCreated','communications.cancel','communications.create','communications.deleteConfirmation','communications.subject','communications.subjectRequired','communications.subjectPlaceholder','communications.linkedEntity','communications.participants','communications.participantIdPlaceholder','communications.add','communications.initialMessage','communications.initialMessagePlaceholder','stats.recent7d','communications.threads','communications.searchThreads','communications.noThreads','communications.refresh','communications.selectThread','communications.selectThreadHint','proposals.contentHint','proposals.metadataAvailableAfterCreate','proposals.tabs.basic','proposals.tabs.content','proposals.tabs.metadata','pipeline.stages.intelligence','institutes.confirmDelete','infrastructure.mediaHint','infrastructure.mediaType','infrastructure.delete','infrastructure.confirmDelete','funding.tabBasic','funding.tabTRL','funding.tabDetails','opportunities.scoreFormula','opportunities.tabs.basic','opportunities.tabs.values','opportunities.tabs.priority','opportunities.currentScore','opportunities.editOpportunity','reports.namePlaceholder','reports.descriptionPlaceholder','reports.noParameters','reports.addParameterPlaceholder','common.add','reports.formatsHelp','reports.addFormatPlaceholder','reports.commonFormats','reports.tabs.basic','reports.tabs.parameters','reports.tabs.formats','common.createdAt','common.modules.institutes','common.modules.teams','common.modules.infrastructure','common.modules.communications','settings.translations.autoTranslate'
]

locales = {
 'en-US': Path('frontend/src/locales/en-US.json'),
 'pt-BR': Path('frontend/src/locales/pt-BR.json'),
 'es-ES': Path('frontend/src/locales/es-ES.json')
}

# load messages
msgs = {k: json.loads(p.read_text(encoding='utf-8')) for k,p in locales.items()}

# helper to check nested OR flat dotted key

def has_key(d,k):
    if k in d:
        return True
    parts=k.split('.')
    cur=d
    for p in parts:
        if isinstance(cur,dict) and p in cur:
            cur=cur[p]
        else:
            return False
    return True

# helper to set flat dotted key at top-level
def set_flat(d,k,v):
    d[k]=v

# helper to get en-US value if exists

def get_en_value(k):
    d=msgs['en-US']
    if k in d:
        return d[k]
    parts=k.split('.')
    cur=d
    for p in parts:
        if isinstance(cur,dict) and p in cur:
            cur=cur[p]
        else:
            return None
    if isinstance(cur,str):
        return cur
    return None

# generate placeholder from key

def placeholder_from_key(k):
    name = k.split('.')[-1]
    name = name.replace('_',' ').replace('-', ' ')
    return name.capitalize()

changes_made = {}
for locale,doc in msgs.items():
    made = []
    for k in keys:
        if not has_key(doc,k):
            val = get_en_value(k)
            if not val:
                val = placeholder_from_key(k)
            set_flat(doc,k,val)
            made.append(k)
    changes_made[locale]=made

# write back files
for locale,path in locales.items():
    path.write_text(json.dumps(msgs[locale], ensure_ascii=False, indent=2), encoding='utf-8')

print('Done. Summary:')
for loc,items in changes_made.items():
    print(f"{loc}: added {len(items)} keys")
    for it in items:
        print('  -', it)
