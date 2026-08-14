import os
import sqlite3
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- INICIALIZAÇÃO DO BANCO DE DADOS ---
from engine import db
from engine import kb_seed
from enriquecimento_automatico import enriquecer_cnpj

# Se a variável RESET_DB estiver ativa, apaga o banco existente
if os.environ.get('RESET_DB') == 'true':
    db_path = os.environ.get('DATABASE_URL', 'tfazzio.db')
    if db_path.startswith('sqlite:///'):
        db_path = db_path.replace('sqlite:///', '')
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f">>> Banco {db_path} removido (RESET_DB=true)")

DB_PATH = os.environ.get('DATABASE_URL', 'tfazzio.db')
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- FUNÇÃO QUE SEMPRE GARANTE AS HIPÓTESES CORINGAS ---
def garantir_hipoteses(conn):
    print(">>> Garantindo hipóteses coringas na KB...")
    
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
        '[' 
        '{"nome": "falta_processo_comercial", "classe": "pergunta", "pergunta_canonica": "Você tem um processo comercial documentado e seguido por toda a equipe?"}, '
        '{"nome": "equipe_comercial_pequena", "classe": "pergunta", "pergunta_canonica": "Sua equipe comercial tem o tamanho adequado para o volume de oportunidades que você gera?"}'
        ']',
        'dp_001',
        None,
        'capacidade_comercial',
        None
    ))

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
        '[' 
        '{"nome": "planejamento_estrategico_ausente", "classe": "pergunta", "pergunta_canonica": "Você tem um planejamento estratégico formal para os próximos 12 meses?"}, '
        '{"nome": "falta_indicadores", "classe": "pergunta", "pergunta_canonica": "Você acompanha regularmente indicadores de desempenho (ex: margem, conversão, ticket médio)?"}'
        ']',
        'dp_002',
        None,
        'capacidade_gestao',
        None
    ))

    conn.execute("""
        INSERT OR REPLACE INTO kb_decision_pattern (id, nome, descricao, exceptions)
        VALUES (?, ?, ?, ?)
    """, ('dp_001', 'Fortalecer Comercial', 'Focar em estruturação da área de vendas', '[]'))
    
    conn.execute("""
        INSERT OR REPLACE INTO kb_decision_pattern (id, nome, descricao, exceptions)
        VALUES (?, ?, ?, ?)
    """, ('dp_002', 'Planejamento Estratégico', 'Estruturar o planejamento de médio e longo prazo', '[]'))

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
    garantir_hipoteses(conn)

    try:
        kb_seed.seed(conn)
        kb_seed.seed_extensoes_prototipo(conn)
        print(">>> KB seed carregada com sucesso.")
    except Exception as kb_err:
        print(f">>> KB seed não recarregada (provavelmente já existia): {kb_err}")

    conn.close()
    print(">>> Banco e KB inicializados.")
except Exception as e:
    print(f">>> ERRO na inicialização: {e}")
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
        conn = get_conn()
        objetivo = dados_usuario.get("desafio_atual", "crescer_faturamento")
        if objetivo not in OBJETIVOS_CANONICOS:
            objetivo = "crescer_faturamento"

        modelo_receita = dados_publicos.get("modelo_receita_publico", "Prestacao de servicos")

        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=modelo_receita,
            objetivo_empresarial=objetivo
        )

        pipeline.enriquecimento(conn, caso_id, dados_publicos)
        pipeline.normalizacao(conn, caso_id)
        pipeline.contextualizacao(conn, caso_id)
        pipeline.selecao_hipoteses(conn, caso_id)

        investigacao_concluida, _ = pipeline.investigacao(
            conn, 
            caso_id, 
            dados_usuario.get('respostas', {})
        )

        if not investigacao_concluida:
            pendentes = conn.execute(
                "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
            ).fetchall()
            conn.close()
            return jsonify({
                "status": "perguntas_pendentes",
                "perguntas": [{"texto": p["texto"], "lacuna": p["lacuna"]} for p in pendentes]
            })

        pipeline.calculo_certeza(conn, caso_id)
        pipeline.priorizacao(conn, caso_id)
        pipeline.decisao(conn, caso_id)
        pipeline.plano_acao(conn, caso_id)
        resultado = pipeline.saida(conn, caso_id)

        conn.close()
        return jsonify(resultado)

    except Exception as e:
        return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)