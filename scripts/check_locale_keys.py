import json
import sys

keys = [
'crm.tabContact','crm.tabNotes','crm.contactHint','crm.tabBasic','portfolio.lessonsLearnedHint','portfolio.tabs.basic','portfolio.tabs.financial','portfolio.tabs.lessons','teams.delete','teams.confirmDelete','communications.filters.linkedEntityType','communications.filters.all','communications.filters.proposal','communications.filters.client','communications.filters.fundingSource','communications.filters.opportunity','communications.newThread','communications.showUnconfirmedAutoCreated','communications.cancel','communications.create','communications.deleteConfirmation','communications.subject','communications.subjectRequired','communications.subjectPlaceholder','communications.linkedEntity','communications.participants','communications.participantIdPlaceholder','communications.add','communications.initialMessage','communications.initialMessagePlaceholder','stats.recent7d','communications.threads','communications.searchThreads','communications.noThreads','communications.refresh','communications.selectThread','communications.selectThreadHint','proposals.contentHint','proposals.metadataAvailableAfterCreate','proposals.tabs.basic','proposals.tabs.content','proposals.tabs.metadata','pipeline.stages.intelligence','institutes.confirmDelete','infrastructure.mediaHint','infrastructure.mediaType','infrastructure.delete','infrastructure.confirmDelete','funding.tabBasic','funding.tabTRL','funding.tabDetails','opportunities.scoreFormula','opportunities.tabs.basic','opportunities.tabs.values','opportunities.tabs.priority','opportunities.currentScore','opportunities.editOpportunity','reports.namePlaceholder','reports.descriptionPlaceholder','reports.noParameters','reports.addParameterPlaceholder','common.add','reports.formatsHelp','reports.addFormatPlaceholder','reports.commonFormats','reports.tabs.basic','reports.tabs.parameters','reports.tabs.formats','common.createdAt','common.modules.institutes','common.modules.teams','common.modules.infrastructure','common.modules.communications','settings.translations.autoTranslate'
]
files = {
 'en-US':'frontend/src/locales/en-US.json',
 'pt-BR':'frontend/src/locales/pt-BR.json',
 'es-ES':'frontend/src/locales/es-ES.json'
}
msgs = {}
for name,path in files.items():
    try:
        msgs[name]=json.load(open(path,encoding='utf-8'))
    except Exception as e:
        print(f"ERROR loading {path}: {e}")
        sys.exit(1)

def has_key(d,k):
    parts=k.split('.')
    cur=d
    for p in parts:
        if isinstance(cur,dict) and p in cur:
            cur=cur[p]
        else:
            # also accept a flat key containing dots at top-level
            if k in d:
                return True
            return False
    return True

missing = {name:[] for name in files}
for k in keys:
    for name in files:
        if not has_key(msgs[name],k):
            missing[name].append(k)

for name in files:
    print(name+':')
    if not missing[name]:
        print('  All keys present')
    else:
        for mk in missing[name]:
            print('  -',mk)
    print()
