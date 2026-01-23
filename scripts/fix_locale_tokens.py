import json
from pathlib import Path

mappings = {
  'en-US': {
    'view': 'View',
    'description': 'Description',
    'editProject': 'Edit project',
    'updateError': 'Error updating. Please try again.',
    'id': 'ID',
    'priority': 'Priority',
    'author': 'Author',
    'Description / Summary': 'Description / Summary',
    'Linked Opportunity': 'Linked Opportunity',
    'Total Value': 'Total Value',
    'deleteConfirmation': 'Are you sure you want to delete this?'
  },
  'pt-BR': {
    'view': 'Ver',
    'description': 'Descrição',
    'editProject': 'Editar projeto',
    'updateError': 'Erro ao atualizar. Tente novamente.',
    'Funding Source': 'Fonte de Fomento',
    'id': 'ID',
    'priority': 'Prioridade',
    'Author': 'Autor',
    'Description / Summary': 'Descrição / Resumo',
    'Linked Opportunity': 'Oportunidade vinculada',
    'Total Value': 'Valor total',
    'deleteConfirmation': 'Tem certeza que deseja excluir este item?'
  },
  'es-ES': {
    'view': 'Ver',
    'description': 'Descripción',
    'editProject': 'Editar proyecto',
    'updateError': 'Error al actualizar. Inténtalo de nuevo.',
    'Funding Source': 'Fuente de Financiación',
    'id': 'ID',
    'priority': 'Prioridad',
    'Author': 'Autor',
    'Description / Summary': 'Descripción / Resumen',
    'Linked Opportunity': 'Oportunidad vinculada',
    'Total Value': 'Valor total',
    'deleteConfirmation': '¿Está seguro que desea eliminar este elemento?'
  }
}

paths = {'en-US':'frontend/src/locales/en-US.json','pt-BR':'frontend/src/locales/pt-BR.json','es-ES':'frontend/src/locales/es-ES.json'}

for locale, path in paths.items():
    p = Path(path)
    data = json.loads(p.read_text(encoding='utf-8'))
    def traverse(obj):
        if isinstance(obj, dict):
            for k,v in list(obj.items()):
                if isinstance(v, str):
                    if v in mappings[locale]:
                        obj[k] = mappings[locale][v]
                    # also fix values equal to key
                    if v == k:
                        # try to set a better label if mapping exists for k
                        if k in mappings[locale]:
                            obj[k] = mappings[locale][k]
                        else:
                            # fallback: capitalize key
                            obj[k] = k.replace('_',' ').capitalize()
                else:
                    traverse(v)
        elif isinstance(obj, list):
            for i in obj:
                traverse(i)
    traverse(data)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Patched {path}")
