import requests
import re
from datetime import datetime

def _safe_get(data, *keys, default=""):
    """Pega um valor aninhado de forma segura, retornando default se algo falhar."""
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key)
        else:
            return default
    if data is None:
        return default
    return data

def enriquecer_cnpj(cnpj):
    """
    Busca dados públicos de uma empresa via BrasilAPI.
    Retorna um dicionário no formato dados_publicos esperado pelo pipeline.
    """
    # Limpa o CNPJ
    cnpj_limpo = re.sub(r'\D', '', cnpj)
    
    url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        return {"erro": f"Falha na consulta à BrasilAPI: {str(e)}"}

    # --- Mapeamento SEGURO (funciona com int, string ou dict) ---
    
    # 1. CNAE Principal
    cnae_fiscal_raw = data.get("cnae_fiscal")
    if isinstance(cnae_fiscal_raw, dict):
        cnae_principal = cnae_fiscal_raw.get("descricao", "")
    else:
        # Se for int ou string, tenta pegar a descrição direta do campo específico
        cnae_principal = data.get("cnae_fiscal_descricao", "")
        if not cnae_principal:
            # fallback: se veio como número, tenta buscar em cnaes_secundarios
            cnae_principal = str(cnae_fiscal_raw) if cnae_fiscal_raw else ""

    # 2. CNAEs Secundários
    cnaes_secundarios = []
    for c in data.get("cnaes_secundarios", []):
        if isinstance(c, dict):
            desc = c.get("descricao", "")
        else:
            desc = str(c) if c else ""
        if desc:
            cnaes_secundarios.append(desc)

    # 3. Porte
    porte_raw = data.get("porte")
    if isinstance(porte_raw, dict):
        porte = porte_raw.get("descricao", "")
    else:
        porte = str(porte_raw) if porte_raw else ""

    # 4. Sócios (QSA)
    socios = []
    for qsa in data.get("qsa", []):
        if isinstance(qsa, dict):
            qualificacao_raw = qsa.get("qualificacao", {})
            if isinstance(qualificacao_raw, dict):
                qualificacao = qualificacao_raw.get("descricao", "")
            else:
                qualificacao = str(qualificacao_raw) if qualificacao_raw else ""
            
            socios.append({
                "nome": qsa.get("nome", ""),
                "qualificacao": qualificacao,
                "data_entrada": qsa.get("data_entrada_sociedade", "")
            })

    # 5. Endereço
    endereco = {
        "logradouro": data.get("logradouro", ""),
        "numero": data.get("numero", ""),
        "complemento": data.get("complemento", ""),
        "bairro": data.get("bairro", ""),
        "cidade": data.get("municipio", ""),
        "uf": data.get("uf", ""),
        "cep": data.get("cep", "")
    }

    # 6. Dados básicos
    razao_social = data.get("razao_social", "")
    nome_fantasia = data.get("nome_fantasia", "")
    data_abertura = data.get("data_inicio_atividade", "")
    capital_social = data.get("capital_social", 0)
    if not isinstance(capital_social, (int, float)):
        capital_social = 0

    # 7. Heurística para modelo de receita (Público/Privado, etc.)
    # Baseado em palavras chave do CNAE e porte
    cnae_lower = cnae_principal.lower()
    if "comercio" in cnae_lower:
        modelo = "Comercio"
    elif "industria" in cnae_lower:
        modelo = "Industria"
    elif "servico" in cnae_lower or "consultoria" in cnae_lower:
        modelo = "Prestacao de servicos"
    else:
        modelo = "Prestacao de servicos"  # valor padrão

    # Percebido: baseado no porte e capital
    porte_lower = porte.lower()
    if "mei" in porte_lower or "micro" in porte_lower or capital_social < 100000:
        percebido = "Micro"
    elif "epp" in porte_lower or "pequeno" in porte_lower or capital_social < 500000:
        percebido = "Pequeno"
    elif "medio" in porte_lower or capital_social < 1000000:
        percebido = "Medio"
    else:
        percebido = "Grande"

    # --- Monta o retorno final ---
    return {
        "razao_social": razao_social,
        "nome_fantasia": nome_fantasia,
        "cnpj": cnpj_limpo,
        "cnae_principal": cnae_principal,
        "cnaes_secundarios": cnaes_secundarios,
        "porte": porte,
        "data_abertura": data_abertura,
        "capital_social": capital_social,
        "endereco": endereco,
        "socios": socios,
        "modelo_receita_publico": modelo,
        "percebido_publico": percebido,
        "fonte": "BrasilAPI"
    }