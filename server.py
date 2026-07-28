from flask import Flask, request, jsonify
from flask_cors import CORS
import re

# Importa os módulos do motor
from enriquecimento_automatico import enriquecer_cnpj

# Importa o pipeline (a "cabeça" do motor)
try:
    from engine.pipeline import executar_pipeline
except ImportError:
    # Fallback caso o pipeline ainda não esteja 100% integrado
    executar_pipeline = None

app = Flask(__name__)
CORS(app)

@app.route('/enrich', methods=['GET'])
def enrich():
    """Endpoint existente: retorna dados brutos da BrasilAPI."""
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
    """
    NOVO ENDPOINT: recebe CNPJ + dados do usuário, processa o pipeline 
    e devolve um diagnóstico estratégico.
    """
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

    # 2. Monta os dados fornecidos pelo usuário
    dados_usuario = {
        "faturamento_anual": data.get('faturamento'),
        "numero_funcionarios": data.get('equipe'),
        "desafio_atual": data.get('desafio'),
        "margem_liquida": data.get('margem'),  # opcional
        "tempo_mercado": data.get('tempo_mercado')  # opcional
    }

    # 3. Se o pipeline estiver disponível, usa ele. Senão, gera um diagnóstico simulado
    if executar_pipeline:
        try:
            diagnostico = executar_pipeline(dados_publicos, dados_usuario)
            return jsonify(diagnostico)
        except Exception as e:
            return jsonify({"erro": f"Erro no pipeline: {str(e)}"}), 500
    else:
        # FALLBACK INTELIGENTE: gera uma análise básica com base nos dados
        diagnostico = gerar_diagnostico_fallback(dados_publicos, dados_usuario)
        return jsonify(diagnostico)


def gerar_diagnostico_fallback(dados_publicos, dados_usuario):
    """Gera um diagnóstico estruturado mesmo sem o pipeline completo."""
    razao = dados_publicos.get("razao_social", "Empresa")
    porte = dados_publicos.get("porte", "não informado")
    cnae = dados_publicos.get("cnae_principal", "não informado")
    capital = dados_publicos.get("capital_social", 0)
    faturamento = dados_usuario.get("faturamento_anual", "não informado")
    equipe = dados_usuario.get("numero_funcionarios", "não informado")
    desafio = dados_usuario.get("desafio_atual", "não informado")

    # Lógica simples de diagnóstico
    restricoes = []
    if capital < 100000 and faturamento != "não informado":
        try:
            if float(faturamento) > 500000:
                restricoes.append("Capital social baixo para o faturamento declarado. Pode indicar necessidade de capital de giro.")
        except:
            pass

    if "servico" in cnae.lower() and equipe != "não informado":
        try:
            if int(equipe) < 5:
                restricoes.append("Empresa de serviços com equipe pequena. A capacidade de entrega pode estar limitada.")
        except:
            pass

    if not restricoes:
        restricoes.append("Nenhuma restrição crítica identificada com base nos dados fornecidos.")

    return {
        "empresa": razao,
        "porte": porte,
        "cnae": cnae,
        "dados_coletados": {
            "capital_social": capital,
            "faturamento_informado": faturamento,
            "equipe_informada": equipe
        },
        "diagnostico": {
            "hipoteses": [
                "A empresa possui estrutura formal definida.",
                f"O desafio principal informado ('{desafio}') é comum em empresas de porte {porte}."
            ],
            "restricoes": restricoes,
            "recomendacoes": [
                "Validar a estrutura de capital antes de novos investimentos.",
                "Revisar processos internos para reduzir dependência do dono."
            ]
        },
        "status": "diagnóstico gerado pelo motor (versão base)"
    }


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
