import os
import sqlite3
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from enriquecimento_automatico import enriquecer_cnpj

# Importa o pipeline real
import engine.pipeline as pipeline
from engine import db

app = Flask(__name__)
CORS(app)

# Define o caminho do banco de dados (persistente no Render)
DB_PATH = os.environ.get('DATABASE_URL', 'tfazzio.db')
if DB_PATH.startswith('sqlite:///'):
    DB_PATH = DB_PATH.replace('sqlite:///', '')

def get_conn():
    """Retorna uma conexão com o banco SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- Função que orquestra o pipeline completo ---
def executar_pipeline_completo(dados_publicos, dados_usuario):
    conn = get_conn()
    try:
        # 1. Entrada
        caso_id = pipeline.entrada(
            conn,
            cnpj=dados_publicos.get("cnpj"),
            modelo_receita_percebido=dados_usuario.get("modelo_receita_percebido", "indeterminado"),
            objetivo_empresarial=dados_usuario.get("desafio_atual", "melhorar resultados")
        )
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na entrada: {str(e)}"}

    # 1b. Verificar objetivo
    objetivo_claro = pipeline.verificar_objetivo(conn, caso_id)
    if not objetivo_claro:
        conn.close()
        return {
            "status": "objetivo_pouco_claro",
            "mensagem": "O objetivo declarado é amplo demais. Por favor, refine-o."
        }

    # 2. Enriquecimento
    try:
        resultado_enriquecimento = pipeline.enriquecimento(conn, caso_id, dados_publicos)
        if not resultado_enriquecimento.get("congruente", True):
            conn.close()
            return {
                "status": "calibracao_necessaria",
                "mensagem": "Há divergência entre o modelo de receita informado e os dados públicos."
            }
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
            return {
                "status": "sem_hipotese_aplicavel",
                "mensagem": "Nenhuma hipótese aplicável foi encontrada para este caso."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na seleção de hipóteses: {str(e)}"}

    # 6. Investigação (considera respostas do usuário)
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
                "perguntas": [p["texto"] for p in pendentes]
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Erro na investigação: {str(e)}"}

    # 7. Cálculo de Certeza
    try:
        certeza_suficiente = pipeline.calculo_certeza(conn, caso_id)
        if not certeza_suficiente:
            conn.close()
            return {
                "status": "certeza_insuficiente",
                "mensagem": "Nenhuma hipótese atingiu nível de certeza suficiente para decisão."
            }
    except Exception as e:
        conn.close()
        return {"erro": f"Erro no cálculo de certeza: {str(e)}"}

    # 8. Priorização
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
        return {"erro": f"Erro na priorização: {str(e)}"}

    # 9. Decisão
    try:
        dec_id = pipeline.decisao(conn, caso_id)
        if not dec_id:
            conn.close()
            return {
                "status": "sem_padrao_de_decisao",
                "mensagem": "A hipótese vencedora não possui um padrão de decisão catalogado."
            }
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

    # 1. Busca dados públicos
    try:
        dados_publicos = enriquecer_cnpj(cnpj_limpo)
        if "erro" in dados_publicos:
            return jsonify({"erro": dados_publicos["erro"]}), 400
    except Exception as e:
        return jsonify({"erro": f"Erro ao buscar CNPJ: {str(e)}"}), 500

    # 2. Dados do usuário
    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": data.get('desafio'),
        "modelo_receita_percebido": data.get('modelo_receita', 'indeterminado'),
        "respostas": data.get('respostas', {})
    }

    # 3. Executa o pipeline
    try:
        diagnostico = executar_pipeline_completo(dados_publicos, dados_usuario)
        return jsonify(diagnostico)
    except Exception as e:
        return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500


if __name__ == '__main__':
    # Inicializa o banco de dados com as tabelas (CRÍTICO)
    print("Inicializando banco de dados...")
    try:
        conn = get_conn()
        db.init_db(conn)
        conn.close()
        print("Banco de dados inicializado com sucesso.")
    except Exception as e:
        print(f"ERRO ao inicializar banco: {e}")
        # Mesmo com erro, tenta rodar o app – o erro será capturado nas rotas

    # Roda o servidor
    app.run(host='0.0.0.0', port=5000, debug=True)
