import os
import sys
import sqlite3
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- INICIALIZAÇÃO DO BANCO DE DADOS (FORA DO IF __NAME__) ---
from engine import db
from enriquecimento_automatico import enriquecer_cnpj

DB_PATH = os.environ.get('DATABASE_URL', 'tfazzio.db')
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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

import engine.pipeline as pipeline

app = Flask(__name__)
CORS(app)

# Mapeamento para normalizar objetivos
MAP_OBJETIVO = {
    "reduzir_dependencia_fundador": "reduzir_dependencia_fundador",
    "crescer_faturamento": "crescer_faturamento",
    "aumentar_margem": "aumentar_margem",
    "aumentar_caixa": "aumentar_caixa",
    "vender_a_empresa": "vender_a_empresa",
    "profissionalizar_gestao": "profissionalizar_gestao",
    # Sinônimos comuns
    "dificuldade_em_vender_mais": "crescer_faturamento",
    "falta_de_capital_de_giro": "aumentar_caixa",
    "equipe_desmotivada_ou_ineficiente": "profissionalizar_gestao",
    "processos_ineficientes": "profissionalizar_gestao",
    "concorrencia_acirrada": "crescer_faturamento",
    "dificuldade_em_reter_talentos": "profissionalizar_gestao",
    "margem_baixa": "aumentar_margem",
    "crescimento_descontrolado": "profissionalizar_gestao",
    "dependencia_do_fundador": "reduzir_dependencia_fundador",
    "falta_de_planejamento_estrategico": "profissionalizar_gestao",
    "dificuldade_em_inovar": "crescer_faturamento",
    "problemas_com_fornecedores": "aumentar_margem",
    "outro": None  # será tratado separadamente
}

def normalizar_objetivo(texto):
    if not texto:
        return None
    # Remove espaços, substitui por underscore, lower
    chave = texto.lower().strip().replace(' ', '_').replace('-', '_')
    # Remove acentos? Simples: substitui ç por c, etc.
    chave = chave.replace('ç', 'c').replace('ã', 'a').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
    return MAP_OBJETIVO.get(chave, chave)  # se não mapeado, retorna a própria chave

# ------------------------------------------------------------------
# Função que orquestra o pipeline completo
# ------------------------------------------------------------------
def executar_pipeline_completo(dados_publicos, dados_usuario):
    conn = get_conn()
    try:
        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=dados_usuario.get("modelo_receita_percebido", "indeterminado"),
            objetivo_empresarial=dados_usuario.get("desafio_atual", "melhorar resultados")
        )
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na entrada: {str(e)}"}

    objetivo_claro = pipeline.verificar_objetivo(conn, caso_id)
    if not objetivo_claro:
        conn.close()
        return {"status": "objetivo_pouco_claro", "mensagem": "O objetivo declarado é amplo demais. Por favor, refine-o."}

    try:
        resultado_enriquecimento = pipeline.enriquecimento(conn, caso_id, dados_publicos)
        if not resultado_enriquecimento.get("congruente", True):
            conn.close()
            return {"status": "calibracao_necessaria", "mensagem": "Há divergência entre o modelo de receita informado e os dados públicos."}
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


# ------------------------------------------------------------------
# Rotas
# ------------------------------------------------------------------
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

    # Pega o desafio e normaliza
    desafio = data.get('desafio')
    print(f"[LOG] Desafio recebido: {desafio}")  # Isso vai aparecer nos logs do Render
    objetivo_normalizado = normalizar_objetivo(desafio)
    print(f"[LOG] Objetivo normalizado: {objetivo_normalizado}")

    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": objetivo_normalizado if objetivo_normalizado else "melhorar_resultados",
        "modelo_receita_percebido": data.get('modelo_receita', 'indeterminado'),
        "respostas": data.get('respostas', {})
    }

    try:
        diagnostico = executar_pipeline_completo(dados_publicos, dados_usuario)
        return jsonify(diagnostico)
    except Exception as e:
        return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
