from flask import Flask, request, jsonify
from enriquecimento_automatico import enriquecer_cnpj
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Libera qualquer site (inclusive o da GoDaddy) a chamar esta API

@app.route('/enrich', methods=['GET'])
def enrich():
    cnpj = request.args.get('cnpj')
    if not cnpj:
        return jsonify({"erro": "CNPJ não informado"}), 400
    
    # Limpa o CNPJ (tira pontos, traços, barras)
    cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
    
    if len(cnpj_limpo) != 14:
        return jsonify({"erro": "CNPJ deve ter 14 dígitos"}), 400
    
    try:
        resultado = enriquecer_cnpj(cnpj_limpo)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

if __name__ == '__main__':
    # Roda na porta 5000 localmente; no Render usará a porta definida por eles
    app.run(host='0.0.0.0', port=5000, debug=True)