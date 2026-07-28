from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import sqlite3
import os
import json
from datetime import datetime

# Importa os módulos do motor
from enriquecimento_automatico import enriquecer_cnpj

# Importa o pipeline real (agora disponível)
from engine import pipeline, db

app = Flask(__name__)
CORS(app)

# Banco de dados SQLite (criado na pasta do app)
DB_PATH = os.path.join(os.path.dirname(__file__), 'tfazzio.db')

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def executar_pipeline_completo(dados_publicos, dados_usuario):
    """
    Executa todo o pipeline do início ao fim, com tratamento de cada módulo.
    Retorna o diagnóstico estruturado ou um status com pendências.
    """
    conn = get_conn()

    # --- 1. Entrada ---
    try:
        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=dados_usuario.get("modelo_receita_percebido", "indeterminado"),
            objetivo_empresarial=dados_usuario.get("desafio_atual", "melhorar resultados")
        )
    except Exception as e:
        conn.close()
        return {"erro": f"Entrada: {str(e)}"}

    # --- 1b. Verificar objetivo (gate) ---
    objetivo_claro = pipeline.verificar_objetivo(conn, caso_id)
    if not objetivo_claro:
        conn.close()
        return {
            "status": "objetivo_pouco_claro",
            "mensagem": "O objetivo declarado é amplo demais. Por favor, refine-o."
        }

    # --- 2. Enriquecimento (mockado – usa dados_publicos) ---
    try:
        resultado_enriquecimento = pipeline.enriquecimento(conn, caso_id, dados_publicos)
        if not resultado_enriquecimento.get("congruente", True):
            conn.close()
            return {
                "status": "calibracao_necessaria",
                "mensagem": "Divergência no modelo de receita. Responda a pergunta de calibração."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Enriquecimento: {str(e)}"}

    # --- 3. Normalização ---
    try:
        pipeline.normalizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Normalização: {str(e)}"}

    # --- 4. Contextualização ---
    try:
        pipeline.contextualizacao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Contextualização: {str(e)}"}

    # --- 5. Seleção de Hipóteses ---
    try:
        hipoteses = pipeline.selecao_hipoteses(conn, caso_id)
        if not hipoteses:
            conn.close()
            return {
                "status": "sem_hipotese_aplicavel",
                "mensagem": "Nenhuma hipótese aplicável foi encontrada para este caso."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Seleção de hipóteses: {str(e)}"}

    # --- 6. Investigação ---
    respostas = dados_usuario.get("respostas", {})
    try:
        concluido, novas_hipoteses = pipeline.investigacao(conn, caso_id, respostas)
        if not concluido:
            # Há perguntas pendentes
            pendentes = conn.execute(
                "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
            ).fetchall()
            conn.close()
            return {
                "status": "perguntas_pendentes",
                "perguntas": [p["texto"] for p in pendentes]
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Investigação: {str(e)}"}

    # --- 7. Cálculo de Certeza ---
    try:
        certeza_suficiente = pipeline.calculo_certeza(conn, caso_id)
        if not certeza_suficiente:
            conn.close()
            return {
                "status": "certeza_insuficiente",
                "mensagem": "Nenhuma hipótese atingiu certeza suficiente."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Cálculo de certeza: {str(e)}"}

    # --- 8. Priorização ---
    try:
        pma_id = pipeline.priorizacao(conn, caso_id)
        if not pma_id:
            conn.close()
            return {
                "status": "nenhuma_hipotese_priorizavel",
                "mensagem": "Nenhuma hipótese com certeza suficiente sobreviveu à priorização."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Priorização: {str(e)}"}

    # --- 9. Decisão ---
    try:
        dec_id = pipeline.decisao(conn, caso_id)
        if not dec_id:
            conn.close()
            return {
                "status": "sem_padrao_de_decisao",
                "mensagem": "A hipótese vencedora não possui padrão de decisão catalogado."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Decisão: {str(e)}"}

    # --- 10. Plano de Ação ---
    try:
        plano_id = pipeline.plano_acao(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Plano de ação: {str(e)}"}

    # --- 11. Saída ---
    try:
        resultado = pipeline.saida(conn, caso_id)
    except Exception as e:
        conn.close()
        return {"erro": f"Saída: {str(e)}"}

    conn.close()
    return resultado


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

    # Monta dados do usuário
    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": data.get('desafio'),
        "modelo_receita_percebido": data.get('modelo_receita', 'indeterminado'),
        "respostas": data.get('respostas', {})
    }

    # Executa o pipeline real
    try:
        diagnostico = executar_pipeline_completo(dados_publicos, dados_usuario)
        return jsonify(diagnostico)
    except Exception as e:
        return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500


if __name__ == '__main__':
    # Inicializa o banco de dados (se não existir)
    if not os.path.exists(DB_PATH):
        try:
            # Tenta usar db.init_db se existir
            init_func = getattr(db, 'init_db', None)
            if callable(init_func):
                conn = get_conn()
                init_func(conn)
                conn.close()
        except Exception as e:
            print("Erro ao inicializar banco:", e)
    app.run(host='0.0.0.0', port=5000, debug=True)
