import os
import sys
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

# Inicializa as tabelas
print(">>> Inicializando banco de dados...")
try:
    conn = get_conn()
    db.init_db(conn)
    conn.close()
    print(">>> Banco de dados inicializado com sucesso.")
except Exception as e:
    print(f">>> ERRO ao inicializar banco: {e}")
    try:
        conn = get_conn()
        schema_path = os.path.join(os.path.dirname(__file__), 'engine', 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()
        print(">>> Fallback: schema.sql executado manualmente.")
    except Exception as e2:
        print(f">>> Fallback também falhou: {e2}")

# Importa o pipeline (precisa vir depois da inicialização)
import engine.pipeline as pipeline

app = Flask(__name__)
CORS(app)

# --------------------------------------------------------------
# Conjunto de objetivos canônicos (igual ao do pipeline)
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
    
    # --- PEGA O OBJETIVO E NORMALIZA ---
    objetivo = dados_usuario.get("desafio_atual", "crescer_faturamento")
    # Se o objetivo não estiver na lista de canônicos, usa "crescer_faturamento" como padrão
    if objetivo not in OBJETIVOS_CANONICOS:
        print(f"Objetivo '{objetivo}' não reconhecido. Usando 'crescer_faturamento' como fallback.")
        objetivo = "crescer_faturamento"

    # --- USA O MODELO DE RECEITA PÚBLICO PARA EVITAR CALIBRAÇÃO DESNECESSÁRIA ---
    modelo_receita = dados_publicos.get("modelo_receita_publico", "Prestacao de servicos")

    try:
        # 1. Entrada (já com os dados corrigidos)
        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=modelo_receita,  # <--- CORREÇÃO AQUI
            objetivo_empresarial=objetivo
        )
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na entrada: {str(e)}"}

    # 1b. Verificar objetivo (agora deve passar sempre)
    objetivo_claro = pipeline.verificar_objetivo(conn, caso_id)
    if not objetivo_claro:
        conn.close()
        return {"status": "objetivo_pouco_claro", "mensagem": "O objetivo declarado é amplo demais. Por favor, refine-o."}

    # 2. Enriquecimento (agora modelo_receita_percebido == modelo_receita_publico, então passa!)
    try:
        resultado_enriquecimento = pipeline.enriquecimento(conn, caso_id, dados_publicos)
        if not resultado_enriquecimento.get("congruente", True):
            conn.close()
            return {"status": "calibracao_necessaria", "mensagem": "Há divergência entre o modelo de receita informado e os dados públicos."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no enriquecimento: {str(e)}"}

    # 3. Normalização
    try:
        pipeline.normalizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na normalização: {str(e)}"}

    # 4. Contextualização
    try:
        pipeline.contextualizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na contextualização: {str(e)}"}

    # 5. Seleção de Hipóteses
    try:
        hipoteses_selecionadas = pipeline.selecao_hipoteses(conn, caso_id)
        if not hipoteses_selecionadas:
            conn.close()
            return {"status": "sem_hipotese_aplicavel", "mensagem": "Nenhuma hipótese aplicável foi encontrada."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na seleção de hipóteses: {str(e)}"}

    # 6. Investigação
    respostas = dados_usuario.get("respostas", {})
    try:
        investigacao_concluida, novas_hipoteses = pipeline.investigacao(conn, caso_id, respostas)
        if not investigacao_concluida:
            pendentes = conn.execute(
                "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
            ).fetchall()
            conn.close()
            return {"status": "perguntas_pendentes", "perguntas": [p["texto"] for p in pendentes]}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na investigação: {str(e)}"}

    # 7. Cálculo de Certeza
    try:
        certeza_suficiente = pipeline.calculo_certeza(conn, caso_id)
        if not certeza_suficiente:
            conn.close()
            return {"status": "certeza_insuficiente", "mensagem": "Nenhuma hipótese atingiu certeza suficiente."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no cálculo de certeza: {str(e)}"}

    # 8. Priorização
    try:
        pma_id = pipeline.priorizacao(conn, caso_id)
        if not pma_id:
            conn.close()
            return {"status": "nenhuma_hipotese_priorizavel", "mensagem": "Nenhuma hipótese sobreviveu à priorização."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na priorização: {str(e)}"}

    # 9. Decisão
    try:
        dec_id = pipeline.decisao(conn, caso_id)
        if not dec_id:
            conn.close()
            return {"status": "sem_padrao_de_decisao", "mensagem": "A hipótese vencedora não possui padrão de decisão."}
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na decisão: {str(e)}"}

    # 10. Plano de Ação
    try:
        pipeline.plano_acao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no plano de ação: {str(e)}"}

    # 11. Saída
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

    # Busca dados públicos
    try:
        dados_publicos = enriquecer_cnpj(cnpj_limpo)
        if "erro" in dados_publicos:
            return jsonify({"erro": dados_publicos["erro"]}), 400
    except Exception as e:
        return jsonify({"erro": f"Erro ao buscar CNPJ: {str(e)}"}), 500

    # --- TRATAMENTO DO OBJETIVO (inclusive "Outro") ---
    desafio = data.get('desafio')
    # Se o desafio não estiver na lista de canônicos, assume "crescer_faturamento"
    if desafio not in OBJETIVOS_CANONICOS:
        desafio = "crescer_faturamento"

    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": desafio,  # <-- agora sempre canônico
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
