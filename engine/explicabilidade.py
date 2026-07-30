"""
Módulo de Explicabilidade da TFAZZIO.
Traduz o pacote de saída do pipeline em uma narrativa acessível para o empresário,
usando a API da Anthropic (Claude) para gerar um relatório em linguagem natural,
respeitando a ordem obrigatória da Arquitetura da Explicabilidade:
1. A decisão (o que fazer)
2. Por que essa decisão foi escolhida (o raciocínio, incluindo perguntas reflexivas)
3. As evidências que a sustentam
4. O que foi considerado mas descartado
5. O que ainda é incerto
6. Os próximos passos
"""
import os
import json
from typing import Dict, List, Any, Optional

# Tenta importar a API da Anthropic (se disponível)
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

def gerar_explicacao(pacote_saida: Dict[str, Any], usar_api: bool = True) -> Dict[str, Any]:
    """
    Gera uma explicação narrativa para o pacote de saída do pipeline.

    Args:
        pacote_saida: Dicionário de saída do pipeline (módulo 11).
        usar_api: Se True, tenta usar a API da Anthropic. Se False, usa fallback.

    Returns:
        Dicionário com:
            - "explicacao": texto narrativo gerado.
            - "usou_api": booleano indicando se usou a API.
            - "erro": mensagem de erro, se houver.
    """
    if pacote_saida.get("tipo") != "decisao_concluida":
        return {
            "explicacao": _gerar_fallback_para_inconclusivo(pacote_saida),
            "usou_api": False,
            "erro": None
        }

    prompt = _construir_prompt(pacote_saida)

    if usar_api and ANTHROPIC_AVAILABLE:
        try:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY não configurada")
            
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                temperature=0.7,
                system="""
                Você é o assistente da TFAZZIO, uma consultoria estratégica especializada
                em identificar o próximo limitador de crescimento de PMEs.

                Sua tarefa é transformar um diagnóstico técnico em uma explicação clara,
                direta e acionável para um empresário.

                Use linguagem simples, evite jargões desnecessários, e seja prático.
                O empresário quer saber: O que fazer? Por quê? Como?
                """,
                messages=[{"role": "user", "content": prompt}]
            )
            explicacao = response.content[0].text
            return {
                "explicacao": explicacao,
                "usou_api": True,
                "erro": None
            }
        except Exception as e:
            # Se falhar, usa fallback
            return {
                "explicacao": _gerar_fallback(pacote_saida),
                "usou_api": False,
                "erro": str(e)
            }
    else:
        return {
            "explicacao": _gerar_fallback(pacote_saida),
            "usou_api": False,
            "erro": "API não disponível ou desativada"
        }


def _construir_prompt(pacote: Dict[str, Any]) -> str:
    """Constrói o prompt para a API, incluindo perguntas e reflexões."""
    constraint = pacote.get("constraint_dominante", "não identificada")
    natureza = pacote.get("natureza", "restrição")
    certeza = pacote.get("certeza", "Indício")
    primeira_acao = pacote.get("primeira_acao_recomendada", "")
    demais_acoes = pacote.get("demais_acoes_do_plano", [])
    evidencias = pacote.get("evidencias_citadas", [])
    perguntas_reflexoes = pacote.get("perguntas_e_reflexoes", [])

    # Monta o texto das perguntas reflexivas
    reflexoes_texto = ""
    if perguntas_reflexoes:
        reflexoes_texto = "\n--- Perguntas e Respostas do Empresário ---\n"
        for item in perguntas_reflexoes:
            pergunta = item.get("pergunta", "")
            resposta = item.get("resposta", "")
            analogia = item.get("analogia")
            reflexoes_texto += f"Pergunta: {pergunta}\n"
            reflexoes_texto += f"Resposta: {resposta}\n"
            if analogia:
                reflexoes_texto += f"Reflexão associada: {analogia}\n"
            # Nota: se_resposta_sim/se_resposta_nao podem ser usados pela IA para enriquecer
            reflexoes_texto += "\n"

    prompt = f"""
Diagnóstico TFAZZIO:

- Restrição/Constrain dominante: {constraint}
- Natureza: {natureza}
- Certeza: {certeza}

Ação recomendada (primeiro passo):
{primeira_acao}

Próximas ações do plano:
{chr(10).join(f'- {a}' for a in demais_acoes) if demais_acoes else 'Nenhuma ação adicional definida.'}

Evidências que sustentam esta decisão:
{chr(10).join(f'- {e["conteudo"]} (fonte: {e["fonte"]})' for e in evidencias) if evidencias else '- Nenhuma evidência específica citada.'}

{reflexoes_texto}

Agora, escreva uma explicação clara e direta para o empresário seguindo EXATAMENTE esta ordem:

1. DECISÃO: Comece com uma frase direta sobre o que fazer. Seja específico e acionável.
2. POR QUE: Explique o raciocínio que levou a essa decisão. Use a pergunta reflexiva e a resposta do empresário (se disponíveis) para conectar a decisão à realidade da empresa. Não force analogias se elas não encaixarem naturalmente. Se a analogia fizer sentido, use-a para ilustrar.
3. EVIDÊNCIAS: Mencione brevemente os fatos que sustentam essa decisão.
4. DESCONSIDERADO: Não há itens descartados neste diagnóstico simplificado.
5. INCERTEZAS: Mencione que a certeza é {certeza}, indicando que há espaço para aprendizado.
6. PRÓXIMOS PASSOS: Reforce a primeira ação e incentive a execução.

Lembre-se: seja prático, evite jargões e foque no que o empresário precisa fazer.
"""
    return prompt


def _gerar_fallback(pacote: Dict[str, Any]) -> str:
    """Gera uma explicação fallback sem usar a API."""
    constraint = pacote.get("constraint_dominante", "não identificada")
    primeira_acao = pacote.get("primeira_acao_recomendada", "")
    demais_acoes = pacote.get("demais_acoes_do_plano", [])
    evidencias = pacote.get("evidencias_citadas", [])
    perguntas = pacote.get("perguntas_e_reflexoes", [])
    certeza = pacote.get("certeza", "Indício")

    texto = f"""
--- DECISÃO TFAZZIO ---

1. O QUE FAZER:
   {primeira_acao}

2. POR QUE:
   A principal restrição identificada foi: {constraint}.
   """
    
    if perguntas:
        for p in perguntas:
            texto += f"\n   Você respondeu à pergunta '{p.get('pergunta')}' com: '{p.get('resposta')}'."
            if p.get('analogia'):
                texto += f" Isso se conecta com: {p.get('analogia')}."
        texto += "\n   Essa troca nos ajudou a entender melhor sua realidade e nos levou a recomendar a ação acima."
    else:
        texto += f"\n   As evidências disponíveis indicam que atuar sobre {constraint} tem alto potencial de impacto."

    texto += "\n\n3. EVIDÊNCIAS QUE SUSTENTAM:"
    if evidencias:
        for e in evidencias:
            texto += f"\n   - {e['conteudo']} (fonte: {e['fonte']})"
    else:
        texto += "\n   - Diagnóstico baseado nas informações fornecidas."

    texto += f"\n\n4. PRÓXIMOS PASSOS:"
    texto += f"\n   - {primeira_acao}"
    for i, acao in enumerate(demais_acoes, 1):
        texto += f"\n   - {acao}"

    texto += f"\n\nCerteza: {certeza} (baseado nas evidências disponíveis, a confiança nesta decisão é moderada)."

    return texto


def _gerar_fallback_para_inconclusivo(pacote: Dict[str, Any]) -> str:
    """Gera explicação para casos inconclusivos."""
    tipo = pacote.get("tipo", "desconhecido")
    motivo = pacote.get("motivo_especifico", "")
    pergunta = pacote.get("pergunta_mais_critica", "")

    if tipo == "pergunta_pendente":
        return f"""
--- DIAGNÓSTICO EM ANDAMENTO ---

Para chegar a uma decisão clara, precisamos de mais uma informação:

{pergunta}

Assim que você responder, o motor poderá prosseguir com a análise.
        """
    else:
        return f"""
--- DIAGNÓSTICO INCONCLUSIVO ---

Com base nas informações fornecidas, não foi possível chegar a uma decisão clara.
Motivo: {motivo}

Recomendamos fornecer mais dados sobre sua empresa ou buscar uma análise mais aprofundada com a consultoria TFAZZIO.
        """


# --- Self-test offline ---
if __name__ == "__main__":
    print("=== Teste offline da Explicabilidade ===\n")

    # Caso 1: Decisão concluída com perguntas reflexivas
    pacote_teste = {
        "tipo": "decisao_concluida",
        "constraint_dominante": "Restrição Comercial",
        "natureza": "restricao",
        "certeza": "Provavel",
        "primeira_acao_recomendada": "Diagnosticar o funil de vendas atual em 7 dias.",
        "demais_acoes_do_plano": [
            "Definir processo comercial padronizado",
            "Treinar equipe e ajustar metas"
        ],
        "evidencias_citadas": [
            {"conteudo": "Dificuldade em vender mais", "fonte": "empresario"},
            {"conteudo": "CNAE: Comércio varejista", "fonte": "BrasilAPI"}
        ],
        "perguntas_e_reflexoes": [
            {
                "pergunta": "Como você avalia a qualificação da sua equipe comercial?",
                "resposta": "Eles conhecem bem o produto, mas têm dificuldade em lidar com objeções.",
                "analogia": "É como ter bons ingredientes, mas não saber seguir a receita.",
                "se_resposta_sim": "Talvez o problema esteja no processo, não na equipe.",
                "se_resposta_nao": "Talvez seja hora de investir em treinamento específico."
            }
        ]
    }

    print("Caso 1: Decisão concluída com reflexão")
    resultado = gerar_explicacao(pacote_teste, usar_api=False)
    print(resultado["explicacao"])
    print("\n" + "="*50 + "\n")

    # Caso 2: Decisão concluída sem reflexão
    pacote_teste2 = {
        "tipo": "decisao_concluida",
        "constraint_dominante": "Oportunidade de Crescimento",
        "natureza": "oportunidade",
        "certeza": "Confirmada",
        "primeira_acao_recomendada": "Análise de mercado e posicionamento.",
        "demais_acoes_do_plano": [
            "Definir metas e indicadores",
            "Estruturar plano de 12 meses"
        ],
        "evidencias_citadas": [
            {"conteudo": "Faturamento consistente", "fonte": "empresario"},
            {"conteudo": "Porte: média empresa", "fonte": "BrasilAPI"}
        ],
        "perguntas_e_reflexoes": []
    }

    print("Caso 2: Decisão concluída sem reflexão")
    resultado2 = gerar_explicacao(pacote_teste2, usar_api=False)
    print(resultado2["explicacao"])
    print("\n" + "="*50 + "\n")

    # Caso 3: Pergunta pendente
    pacote_teste3 = {
        "tipo": "pergunta_pendente",
        "pergunta_mais_critica": "Qual é o giro médio de estoque da sua empresa?"
    }

    print("Caso 3: Pergunta pendente")
    resultado3 = gerar_explicacao(pacote_teste3, usar_api=False)
    print(resultado3["explicacao"])
    print("\n" + "="*50 + "\n")

    # Caso 4: Inconclusivo
    pacote_teste4 = {
        "tipo": "caso_inconclusivo",
        "motivo_especifico": "Nenhuma hipótese aplicável foi encontrada."
    }

    print("Caso 4: Inconclusivo")
    resultado4 = gerar_explicacao(pacote_teste4, usar_api=False)
    print(resultado4["explicacao"])

    print("\n=== Todos os testes concluídos ===")
