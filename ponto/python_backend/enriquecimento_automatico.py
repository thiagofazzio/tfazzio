import requests
import re

def buscar_dados_cnpj(cnpj_input):
    """
    Busca dados públicos da empresa através da BrasilAPI com fallback para CNPJ.ws
    """
    cnpj_limpo = re.sub(r'\D', '', str(cnpj_input))
    if len(cnpj_limpo) != 14:
        return None, "CNPJ deve conter 14 dígitos válidos."

    # 1. Tentar BrasilAPI
    try:
        url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {
                "cnpj": cnpj_limpo,
                "razaoSocial": data.get("razao_social") or data.get("nome", "Razão Social não informada"),
                "nomeFantasia": data.get("nome_fantasia") or data.get("fantasia") or data.get("razao_social"),
                "porte": data.get("porte", "PME"),
                "cnaeCodigo": str(data.get("cnae_fiscal", "")),
                "cnaeDescricao": data.get("cnae_fiscal_descricao", "Atividade principal"),
                "logradouro": data.get("logradouro", ""),
                "municipio": data.get("municipio") or data.get("cidade", ""),
                "uf": data.get("uf") or data.get("estado", ""),
                "situacaoCadastral": data.get("descricao_situacao_cadastral", "Ativa"),
                "capitalSocial": float(data.get("capital_social", 0)),
                "dataAbertura": data.get("data_inicio_atividade") or data.get("data_abertura", "")
            }, None
    except Exception as e:
        print(f"Erro BrasilAPI: {e}")

    # 2. Fallback CNPJ.ws
    try:
        url_ws = f"https://publica.cnpj.ws/cnpj/{cnpj_limpo}"
        res_ws = requests.get(url_ws, timeout=5)
        if res_ws.status_code == 200:
            raw = res_ws.json()
            est = raw.get("estabelecimento", {})
            atv = est.get("atividade_principal", {})
            return {
                "cnpj": cnpj_limpo,
                "razaoSocial": raw.get("razao_social", "Razão Social não informada"),
                "nomeFantasia": est.get("nome_fantasia") or raw.get("razao_social"),
                "porte": raw.get("porte", {}).get("descricao", "PME"),
                "cnaeCodigo": str(atv.get("id", "")),
                "cnaeDescricao": atv.get("descricao", "Atividade principal"),
                "logradouro": f"{est.get('tipo_logradouro', '')} {est.get('logradouro', '')}".strip(),
                "municipio": est.get("cidade", {}).get("nome", ""),
                "uf": est.get("estado", {}).get("sigla", ""),
                "situacaoCadastral": est.get("situacao_cadastral", "Ativa"),
                "capitalSocial": float(raw.get("capital_social", 0)),
                "dataAbertura": est.get("data_inicio_atividade", "")
            }, None
    except Exception as e:
        print(f"Erro Fallback CNPJ.ws: {e}")

    return None, "Não foi possível encontrar o CNPJ nas APIs públicas."
