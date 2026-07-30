import os
import sqlite3
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- INICIALIZAÇÃO DO BANCO DE DADOS ---
from engine import db
from enriquecimento_automatico import enriquecer_cnpj

DB_PATH = os.environ.get('DATABASE_URL', 'tfazzio.db')
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- FUNÇÃO QUE SEMPRE GARANTE AS HIPÓTESES CORINGAS ---
def garantir_hipoteses(conn):
    """Insere ou substitui as hipóteses coringas com lacunas no formato correto (lista de dicionários)."""
    print(">>> Garantindo hipóteses coringas na KB...")
    
    # 1. Hipótese Restrição Comercial
    conn.execute("""
        INSERT OR REPLACE INTO kb_hypothesis_template
        (id, nome, natureza, tipo, condition_of_applicability,
         evidence_patterns, lacunas_tipicas, decision_pattern_id,
         familia_pai_id, dimensao_capacidade, hipoteses_concorrentes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'tpl_001',
        'Restrição Comercial',
        'restricao',
        'padrao',
        '{}',
        '[{"tipo": "confirma", "peso": "alto", "descricao": "Dificuldade em vender mais", "fecha_por": "empresario"}]',
        # --- LACUNAS CORRIGIDAS (lista de dicionários) ---
        '[' 
        '{"nome": "falta_processo_comercial", "classe": "pergunta", "pergunta_canonica": "Você tem um processo comercial documentado e seguido por toda a equipe?"}, '
        '{"nome": "equipe_comercial_pequena", "classe": "pergunta", "pergunta_canonica": "Sua equipe comercial tem o tamanho adequado para o volume de oportunidades que você gera?"}'
        ']',
        'dp_001',
        None,
        'capacidade_comercial',
        None
    ))

    # 2. Hipótese Oportunidade de Crescimento
    conn.execute("""
        INSERT OR REPLACE INTO kb_hypothesis_template
        (id, nome, natureza, tipo, condition_of_applicability,
         evidence_patterns, lacunas_tipicas, decision_pattern_id,
         familia_pai_id, dimensao_capacidade, hipoteses_concorrentes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'tpl_002',
        'Oportunidade de Crescimento',
        'oportunidade',
        'padrao',
        '{}',
        '[{"tipo": "confirma", "peso": "medio", "descricao": "Faturamento consistente", "fecha_por": "empresario"}]',
        # --- LACUNAS CORRIGIDAS ---
        '['
        '{"nome": "planejamento_estrategico_ausente", "classe": "pergunta", "pergunta_canonica": "Você tem um planejamento estratégico formal para os próximos 12 meses?"}, '
        '{"nome": "falta_indicadores", "classe": "pergunta", "pergunta_canonica": "Você acompanha regularmente indicadores de desempenho (ex: margem, conversão, ticket médio)?"}'
        ']',
        'dp_002',
        None,
        'capacidade_gestao',
        None
    ))

    # Padrões de Decisão
    conn.execute("""
        INSERT OR REPLACE INTO kb_decision_pattern (id, nome, descricao, exceptions)
        VALUES (?, ?, ?, ?)
    """, ('dp_001', 'Fortalecer Comercial', 'Focar em estruturação da área de vendas', '[]'))
    
    conn.execute("""
        INSERT OR REPLACE INTO kb_decision_pattern (id, nome, descricao, exceptions)
        VALUES (?, ?, ?, ?)
    """, ('dp_002', 'Planejamento Estratégico', 'Estruturar o planejamento de médio e longo prazo', '[]'))

    # Ações Recomendadas
    acoes = [
        ('ap_001', 'dp_001', 1, 'Diagnóstico do funil de vendas atual'),
        ('ap_002', 'dp_001', 2, 'Definir processo comercial padronizado'),
        ('ap_003', 'dp_001', 3, 'Treinar equipe comercial e ajustar metas'),
        ('ap_004', 'dp_002', 1, 'Análise de mercado e posicionamento'),
        ('ap_005', 'dp_002', 2, 'Definir metas e indicadores de crescimento'),
        ('ap_006', 'dp_002', 3, 'Estruturar plano de ação para os próximos 12 meses'),
    ]
    for ap in acoes:
        conn.execute("""
            INSERT OR REPLACE INTO kb_action_pattern (id, decision_pattern_id, ordem, descricao)
            VALUES (?, ?, ?, ?)
        """, ap)

    conn.commit()
    print(">>> Hipóteses coringas garantidas com sucesso.")
# --- INICIALIZAÇÃO PRINCIPAL ---
print(">>> Inicializando banco de dados...")
try:
    conn = get_conn()
    db.init_db(conn)
    garantir_hipoteses(conn)   # <-- sempre executa, garantindo que existam
    conn.close()
    print(">>> Banco e KB inicializados.")
except Exception as e:
    print(f">>> ERRO na inicialização: {e}")
    # Fallback: executa schema.sql manualmente
    try:
        conn = get_conn()
        schema_path = os.path.join(os.path.dirname(__file__), 'engine', 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            conn.executescript(f.read())
        garantir_hipoteses(conn)
        conn.close()
        print(">>> Fallback executado com sucesso.")
    except Exception as e2:
        print(f">>> Fallback falhou: {e2}")

# Importa o pipeline
import engine.pipeline as pipeline

app = Flask(__name__)
CORS(app)

# --------------------------------------------------------------
# Conjunto de objetivos canônicos
# --------------------------------------------------------------
OBJETIVOS_CANONICOS = {
    "reduzir_dependencia_fundador",
    "crescer_faturamento",
    "aumentar_margem",
    "aumentar_caixa",
    "vender_a_empresa",
    "profissionalizar_gestao"
}

# --------------------------------------------------------------
# Função que orquestra o pipeline completo
# --------------------------------------------------------------
def executar_pipeline_completo(dados_publicos, dados_usuario):
    conn = get_conn()
    
    objetivo = dados_usuario.get("desafio_atual", "crescer_faturamento")
    if objetivo not in OBJETIVOS_CANONICOS:
        print(f"Objetivo '{objetivo}' não reconhecido. Usando 'crescer_faturamento'.")
        objetivo = "crescer_faturamento"

    modelo_receita = dados_publicos.get("modelo_receita_publico", "Prestacao de servicos")

    try:
        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=modelo_receita,
            objetivo_empresarial=objetivo
        )
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na entrada: {str(e)}"}

    objetivo_claro = pipeline.verificar_objetivo(conn, caso_id)
    if not objetivo_claro:
        conn.close()
        return {"status": "objetivo_pouco_claro", "mensagem": "O objetivo declarado é amplo demais."}

    try:
        resultado_enriquecimento = pipeline.enriquecimento(conn, caso_id, dados_publicos)
        if not resultado_enriquecimento.get("congruente", True):
            conn.close()
            return {"status": "calibracao_necessaria", "mensagem": "Divergência no modelo de receita."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no enriquecimento: {str(e)}"}

    try:
        pipeline.normalizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na normalização: {str(e)}"}

    try:
        pipeline.contextualizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na contextualização: {str(e)}"}

    try:
        hipoteses_selecionadas = pipeline.selecao_hipoteses(conn, caso_id)
        if not hipoteses_selecionadas:
            conn.close()
            return {"status": "sem_hipotese_aplicavel", "mensagem": "Nenhuma hipótese aplicável foi encontrada."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na seleção de hipóteses: {str(e)}"}

    respostas = dados_usuario.get("respostas", {})
    try:
        investigacao_concluida, novas_hipoteses = pipeline.investigacao(conn, caso_id, respostas)
        if not investigacao_concluida:
            pendentes = conn.execute("SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)).fetchall()
            conn.close()
            return {"status": "perguntas_pendentes", "perguntas": [p["texto"] for p in pendentes]}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na investigação: {str(e)}"}

    try:
        certeza_suficiente = pipeline.calculo_certeza(conn, caso_id)
        if not certeza_suficiente:
            conn.close()
            return {"status": "certeza_insuficiente", "mensagem": "Nenhuma hipótese atingiu certeza suficiente."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no cálculo de certeza: {str(e)}"}

    try:
        pma_id = pipeline.priorizacao(conn, caso_id)
        if not pma_id:
            conn.close()
            return {"status": "nenhuma_hipotese_priorizavel", "mensagem": "Nenhuma hipótese sobreviveu à priorização."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na priorização: {str(e)}"}

    try:
        dec_id = pipeline.decisao(conn, caso_id)
        if not dec_id:
            conn.close()
            return {"status": "sem_padrao_de_decisao", "mensagem": "A hipótese vencedora não possui padrão de decisão."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na decisão: {str(e)}"}

    try:
        pipeline.plano_acao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no plano de ação: {str(e)}"}

    try:
        resultado = pipeline.saida(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na saída: {str(e)}"}

    conn.close()
    return resultado

# --------------------------------------------------------------
# Rotas
# --------------------------------------------------------------
@app.route('/enrich', methods=['GET'])
def enrich():
    cnpj = request.args.get('cnpj')
    if not cnpj:
        return jsonify({"erro": "CNPJ não informado"}), 400
    cnpj_limpo = re.sub(r'\D', '', cnpj)
    if len(cnpj_limpo) != 14:
        return jsonify({"erro": "CNPJ deve ter 14 dígitos"}), 400
    try:
        resultado = enriquecer_cnpj(cnpj_limpo)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/diagnose', methods=['POST'])
def diagnose():
    data = request.get_json()
    if not data:
        return jsonify({"erro": "Dados não enviados"}), 400

    cnpj = data.get('cnpj')
    if not cnpj:
        return jsonify({"erro": "CNPJ é obrigatório"}), 400
    cnpj_limpo = re.sub(r'\D', '', cnpj)
    if len(cnpj_limpo) != 14:
        return jsonify({"erro": "CNPJ inválido"}), 400

    try:
        dados_publicos = enriquecer_cnpj(cnpj_limpo)
        if "erro" in dados_publicos:
            return jsonify({"erro": dados_publicos["erro"]}), 400
    except Exception as e:
        return jsonify({"erro": f"Erro ao buscar CNPJ: {str(e)}"}), 500

    desafio = data.get('desafio')
    if desafio not in OBJETIVOS_CANONICOS:
        desafio = "crescer_faturamento"

    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": desafio,
        "modelo_receita_percebido": dados_publicos.get("modelo_receita_publico", "Prestacao de servicos"),
        "respostas": data.get('respostas', {})
    }

    try:
        diagnostico = executar_pipeline_completo(dados_publicos, dados_usuario)
        return jsonify(diagnostico)
    except Exception as e:
        return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
