import json
from pathlib import Path

# keys to translate (same list used before)
keys = [
'crm.tabContact','crm.tabNotes','crm.contactHint','crm.tabBasic','portfolio.lessonsLearnedHint','portfolio.tabs.basic','portfolio.tabs.financial','portfolio.tabs.lessons','teams.delete','teams.confirmDelete','communications.filters.linkedEntityType','communications.filters.all','communications.filters.proposal','communications.filters.client','communications.filters.fundingSource','communications.filters.opportunity','communications.newThread','communications.showUnconfirmedAutoCreated','communications.cancel','communications.create','communications.deleteConfirmation','communications.subject','communications.subjectRequired','communications.subjectPlaceholder','communications.linkedEntity','communications.participants','communications.participantIdPlaceholder','communications.add','communications.initialMessage','communications.initialMessagePlaceholder','stats.recent7d','communications.threads','communications.searchThreads','communications.noThreads','communications.refresh','communications.selectThread','communications.selectThreadHint','proposals.contentHint','proposals.metadataAvailableAfterCreate','proposals.tabs.basic','proposals.tabs.content','proposals.tabs.metadata','pipeline.stages.intelligence','institutes.confirmDelete','infrastructure.mediaHint','infrastructure.mediaType','infrastructure.delete','infrastructure.confirmDelete','funding.tabBasic','funding.tabTRL','funding.tabDetails','opportunities.scoreFormula','opportunities.tabs.basic','opportunities.tabs.values','opportunities.tabs.priority','opportunities.currentScore','opportunities.editOpportunity','reports.namePlaceholder','reports.descriptionPlaceholder','reports.noParameters','reports.addParameterPlaceholder','common.add','reports.formatsHelp','reports.addFormatPlaceholder','reports.commonFormats','reports.tabs.basic','reports.tabs.parameters','reports.tabs.formats','common.createdAt','common.modules.institutes','common.modules.teams','common.modules.infrastructure','common.modules.communications','settings.translations.autoTranslate'
]

paths = {
 'en':'frontend/src/locales/en-US.json',
 'pt':'frontend/src/locales/pt-BR.json',
 'es':'frontend/src/locales/es-ES.json'
}

# load
msgs = {k: json.loads(Path(p).read_text(encoding='utf-8')) for k,p in paths.items()}

# helper to get en value considering dotted or nested

def get_en_value(k):
    d = msgs['en']
    if k in d:
        return d[k]
    parts = k.split('.')
    cur = d
    for p in parts:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    if isinstance(cur, str):
        return cur
    return None

# manual phrase maps for PT and ES
manual_pt = {
    'Linked To': 'Vinculado a',
    'All': 'Todos',
    'Proposal': 'Proposta',
    'Client': 'Cliente',
    'Funding Source': 'Fonte de Fomento',
    'Opportunity': 'Oportunidade',
    'New Thread': 'Nova Conversa',
    'Show unconfirmed auto-created threads': 'Mostrar conversas não confirmadas criadas automaticamente',
    'Cancel': 'Cancelar',
    'Create': 'Criar',
    'Delete': 'Excluir',
    'Subject': 'Assunto',
    'Subject is required': 'Assunto é obrigatório',
    'Enter thread subject...': 'Digite o assunto da conversa...',
    'Link to Entity': 'Vincular a Entidade',
    'participants': 'participantes',
    'Enter user ID...': 'Digite o ID do usuário...',
    'Add': 'Adicionar',
    'Initial Message': 'Mensagem Inicial',
    'Start the conversation...': 'Inicie a conversa...',
    'Recent (7d)': 'Últimos 7 dias',
    'Threads': 'Conversas',
    'Search threads...': 'Buscar conversas...',
    'No threads found': 'Nenhuma conversa encontrada',
    'Refresh': 'Atualizar',
    'Select a thread': 'Selecione uma conversa',
    'Choose a conversation from the list to view messages': 'Escolha uma conversa da lista para ver as mensagens',
    'Enter thread subject...': 'Digite o assunto da conversa...',
    'Subject is required': 'Assunto é obrigatório',
    'Linked To': 'Vinculado a',
    'Enter user ID...': 'Digite o ID do usuário...',
    'Press Enter to send, Shift+Enter for new line': 'Pressione Enter para enviar, Shift+Enter para nova linha',
    'No threads found': 'Nenhuma conversa encontrada',
    'New': 'Novo',
    'Confirm': 'Confirmar',
    'Reject': 'Rejeitar',
    'Save': 'Salvar',
    'Select type...': 'Selecione o tipo...',
    'Entity ID': 'ID da Entidade',
    'Enter entity ID or search...': 'Digite o ID da entidade ou busque...',
    'Enter the ID of the related entity': 'Digite o ID da entidade relacionada',
    'Record': 'Gravar',
    'Start Recording': 'Iniciar Gravação',
    'Stop Recording': 'Parar Gravação'
}

manual_es = {
    'Linked To': 'Vinculado a',
    'All': 'Todos',
    'Proposal': 'Propuesta',
    'Client': 'Cliente',
    'Funding Source': 'Fuente de Financiación',
    'Opportunity': 'Oportunidad',
    'New Thread': 'Nuevo Hilo',
    'Show unconfirmed auto-created threads': 'Mostrar hilos no confirmados creados automáticamente',
    'Cancel': 'Cancelar',
    'Create': 'Crear',
    'Delete': 'Eliminar',
    'Subject': 'Asunto',
    'Subject is required': 'El asunto es obligatorio',
    'Enter thread subject...': 'Ingrese el asunto del hilo...',
    'Link to Entity': 'Vincular a Entidad',
    'participants': 'participantes',
    'Enter user ID...': 'Ingrese el ID del usuario...',
    'Add': 'Añadir',
    'Initial Message': 'Mensaje Inicial',
    'Start the conversation...': 'Inicie la conversación...',
    'Recent (7d)': 'Reciente (7d)',
    'Threads': 'Hilos',
    'Search threads...': 'Buscar hilos...',
    'No threads found': 'No se encontraron hilos',
    'Refresh': 'Actualizar',
    'Select a thread': 'Seleccione un hilo',
    'Choose a conversation from the list to view messages': 'Elija una conversación de la lista para ver los mensajes'
}

# small word-level fallbacks
word_map_pt = {
    'New': 'Novo', 'Thread':'Conversa','tab':'Aba','Basic':'Básico','Contact':'Contato','Notes':'Notas','Hint':'Dica','Lessons Learned':'Lições Aprendidas','Financial':'Financeiro','Lessons':'Lições','Delete':'Excluir','Confirm Delete':'Confirmar Exclusão','media':'Mídia','Type':'Tipo','Details':'Detalhes','TRL':'TRL','Score':'Pontuação','Formula':'Fórmula','Current Score':'Score Atual','Edit Opportunity':'Editar Oportunidade','Name':'Nome','Description':'Descrição','Parameters':'Parâmetros','Formats':'Formatos','Created At':'Criado em','modules':'módulos'
}

word_map_es = {
    'New': 'Nuevo', 'Thread':'Hilo','tab':'Pestaña','Basic':'Básico','Contact':'Contacto','Notes':'Notas','Hint':'Consejo','Lessons Learned':'Lecciones Aprendidas','Financial':'Financiero','Lessons':'Lecciones','Delete':'Eliminar','Confirm Delete':'Confirmar Eliminación','media':'Medios','Type':'Tipo','Details':'Detalles','TRL':'TRL','Score':'Puntuación','Formula':'Fórmula','Current Score':'Puntuación Actual','Edit Opportunity':'Editar Oportunidad','Name':'Nombre','Description':'Descripción','Parameters':'Parámetros','Formats':'Formatos','Created At':'Creado en','modules':'módulos'
}


def translate_phrase(en, lang):
    if not en or not isinstance(en, str):
        return en
    en_strip = en.strip()
    if lang == 'pt':
        if en_strip in manual_pt:
            return manual_pt[en_strip]
        # word-level replacement
        out = en_strip
        for k,v in word_map_pt.items():
            out = out.replace(k, v)
        return out
    else:
        if en_strip in manual_es:
            return manual_es[en_strip]
        out = en_strip
        for k,v in word_map_es.items():
            out = out.replace(k, v)
        return out

# perform translations and write into files as flat dotted keys (top-level)
for k in keys:
    en_val = get_en_value(k) or ''
    pt_val = translate_phrase(en_val, 'pt')
    es_val = translate_phrase(en_val, 'es')
    msgs['pt'][k] = pt_val
    msgs['es'][k] = es_val

# write back
for code,path in paths.items():
    Path(path).write_text(json.dumps(msgs['en' if code=='en' else ('pt' if code=='pt' else 'es')], ensure_ascii=False, indent=2), encoding='utf-8')

print('Translation done. Edited files:')
print(' -', paths['pt'])
print(' -', paths['es'])
