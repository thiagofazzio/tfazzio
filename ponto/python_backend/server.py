import os
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from enriquecimento_automatico import buscar_dados_cnpj

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Ponto de Impacto Python Flask Server"})

@app.route('/api/cnpj/<string:cnpj>', methods=['GET'])
def api_cnpj(cnpj):
    dados, erro = buscar_dados_cnpj(cnpj)
    if erro:
        return jsonify({"error": erro}), 400
    return jsonify(dados)

@app.route('/api/diagnostico/calcular', methods=['POST'])
def api_diagnostico_calcular():
    try:
        data = request.json or {}
        monthly_revenue = max(1.0, float(data.get('monthlyRevenue', 1)))
        fixed_costs = float(data.get('fixedCosts', 0))
        owner_salary = float(data.get('ownerSalary', 0))
        var_percent = min(95.0, max(0.0, float(data.get('variableCostsPercent', 0))))
        tax_percent = min(95.0, max(0.0, float(data.get('taxesPercent', 0))))

        fixed_costs_total = fixed_costs + owner_salary
        contrib_margin_pct = max(2.0, 100.0 - (var_percent + tax_percent))
        
        break_even_revenue = round(fixed_costs_total / (contrib_margin_pct / 100.0))
        break_even_pct = min(200.0, round((break_even_revenue / monthly_revenue) * 100))
        margin_safety_pct = round(((monthly_revenue - break_even_revenue) / monthly_revenue) * 100)
        est_net_profit = round((monthly_revenue * contrib_margin_pct) / 100.0 - fixed_costs_total)
        est_net_margin = round((est_net_profit / monthly_revenue) * 100)

        # Retornar diagnóstico estruturado
        return jsonify({
            "monthlyRevenue": monthly_revenue,
            "fixedCostsTotal": fixed_costs_total,
            "contributionMarginPercent": contrib_margin_pct,
            "breakEvenRevenue": break_even_revenue,
            "breakEvenPercentage": break_even_pct,
            "marginOfSafetyPercent": margin_safety_pct,
            "estimatedNetProfit": est_net_profit,
            "estimatedNetMarginPercent": est_net_margin
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
