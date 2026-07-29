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
    """Insere ou substitui as hipóteses coringas para garantir que sempre existam."""
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
        '[{"tipo": "confirma", "peso": "alto", "descricao": "vendas dependem principalmente fundador", "fecha_por": "empresario"}, '
        '{"tipo": "descarta", "peso": "alto", "descricao": "equipe comercial estruturada processo vendas", "fecha_por": "empresario"}]',
        '[{"nome": "situacao_comercial", "classe": "pergunta", "pergunta_canonica": "A empresa tem hoje um time comercial dedicado e um processo de vendas estruturado, ou as vendas dependem principalmente do dono?", "analogia": "E como uma bicicleta com uma roda so: pedala rapido, mas so anda enquanto uma pessoa empurra.", "se_resposta_sim": "Isso indica que a empresa ja tem musculatura comercial propria - o crescimento nao depende so do fundador.", "se_resposta_nao": "Isso e comum em empresas que cresceram pela rede de contatos do fundador. Funciona ate o volume passar da capacidade de uma pessoa so."}]',
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
        '[{"tipo": "confirma", "peso": "medio", "descricao": "cada area decide proprios rumos sem meta comum", "fecha_por": "empresario"}, '
        '{"tipo": "descarta", "peso": "alto", "descricao": "planejamento estrategico formal revisado periodicamente", "fecha_por": "empresario"}]',
        '[{"nome": "planejamento_atual", "classe": "pergunta", "pergunta_canonica": "A empresa tem um planejamento estratégico formal para os próximos 12 meses, com metas definidas?", "analogia": "E como dirigir a noite sem farol: da pra andar, mas so se ve o que esta bem na frente.", "se_resposta_sim": "Isso mostra que a empresa ja tem direcao clara - vale revisar se as metas ainda fazem sentido para o momento atual.", "se_resposta_nao": "Isso e comum em empresas que cresceram testando e ajustando no dia a dia. Sem uma meta comum, cada area acaba puxando para um lado diferente."}]',
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
            pendentes = conn.execute(
                "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
            ).fetchall()
            conn.close()
            return {
                "status": "perguntas_pendentes",
                "caso_id": caso_id,
                "perguntas": [{"lacuna": p["lacuna"], "texto": p["texto"]} for p in pendentes]
            }
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
@app.route('/debug', methods=['GET'])
def debug():
    conn = get_conn()
    resultado = {}

    try:
        templates = conn.execute(
            "SELECT id, nome, tipo, condition_of_applicability, decision_pattern_id FROM kb_hypothesis_template"
        ).fetchall()
        resultado["hipoteses_na_kb"] = [dict(t) for t in templates]
        resultado["total_hipoteses"] = len(templates)
    except Exception as e:
        resultado["erro_hipoteses"] = str(e)

    try:
        ultima_empresa = conn.execute(
            "SELECT setor, porte, business_models, revenue_models FROM empresa ORDER BY rowid DESC LIMIT 1"
        ).fetchone()
        resultado["ultima_empresa"] = dict(ultima_empresa) if ultima_empresa else None
    except Exception as e:
        resultado["erro_empresa"] = str(e)

    conn.close()
    return jsonify(resultado)

def responder_perguntas_e_continuar(caso_id, respostas):
    """Retoma um Caso com perguntas pendentes, aplicando as respostas e
    seguindo o pipeline a partir do Cálculo de Certeza."""
    from datetime import datetime
    conn = get_conn()

    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if not caso:
        conn.close()
        return {"erro": "Caso não encontrado. Reinicie o diagnóstico."}
    if caso["estado"] != "Investigacao concluida para o ciclo atual":
        conn.close()
        return {"erro": f"Caso em estado inesperado: {caso['estado']}"}

    pendentes = conn.execute(
        "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
    ).fetchall()

    for p in pendentes:
        resposta_texto = respostas.get(p["lacuna"])
        if not resposta_texto:
            continue
        conn.execute("UPDATE pergunta SET estado='respondida', resposta=? WHERE id=?",
                     (resposta_texto, p["id"]))
        conn.execute(
            """INSERT INTO evidencia (id, caso_id, conteudo, fonte, data_coleta,
                                       confiabilidade, tipo, verificada, hipotese_id)
               VALUES (?,?,?,?,?,?,?,1,?)""",
            (db.new_id("ev"), caso_id, resposta_texto, "empresario",
             datetime.utcnow().isoformat(), "alta", "resposta_pergunta", p["hipotese_id"]),
        )
    conn.commit()

    try:
        if not pipeline.calculo_certeza(conn, caso_id):
            conn.close()
            return {"status": "certeza_insuficiente", "mensagem": "Nenhuma hipótese atingiu certeza suficiente."}
    except Exception as e:
        conn.close(); return {"erro": f"Erro no cálculo de certeza: {str(e)}"}

    try:
        if not pipeline.priorizacao(conn, caso_id):
            conn.close()
            return {"status": "nenhuma_hipotese_priorizavel", "mensagem": "Nenhuma hipótese sobreviveu à priorização."}
    except Exception as e:
        conn.close(); return {"erro": f"Erro na priorização: {str(e)}"}

    try:
        if not pipeline.decisao(conn, caso_id):
            conn.close()
            return {"status": "sem_padrao_de_decisao", "mensagem": "Sem padrão de decisão catalogado."}
    except Exception as e:
        conn.close(); return {"erro": f"Erro na decisão: {str(e)}"}

    try:
        pipeline.plano_acao(conn, caso_id)
    except Exception as e:
        conn.close(); return {"erro": f"Erro no plano de ação: {str(e)}"}

    try:
        resultado = pipeline.saida(conn, caso_id)
    except Exception as e:
        conn.close(); return {"erro": f"Erro na saída: {str(e)}"}

    conn.close()
    return resultado


@app.route('/responder', methods=['POST'])
def responder():
    data = request.get_json()
    if not data or not data.get('caso_id'):
        return jsonify({"erro": "caso_id é obrigatório"}), 400
    try:
        resultado = responder_perguntas_e_continuar(data['caso_id'], data.get('respostas', {}))
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"erro": f"Erro ao processar respostas: {str(e)}"}), 500
        
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
