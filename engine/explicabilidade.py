"""
Modulo de traducao da Saida (Contratos do Pipeline, modulo 11) para linguagem
do empresario, seguindo a Arquitetura da Explicabilidade v1.0.

Este modulo NAO reprocessa nem altera o conteudo de `pipeline.saida()` - ele
so traduz o pacote ja estruturado (decisao, evidencias, certeza) para prosa
legivel, respeitando a sequencia definida na Arquitetura da Explicabilidade,
Sec.2: Decisao Prioritaria -> Por que -> Evidencias -> O que foi descartado
-> O que ainda e incerto -> Proximos passos.

Requer ANTHROPIC_API_KEY no ambiente.
"""
import os
import json
import urllib.request
import urllib.error


ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"


def _montar_prompt(pacote_saida: dict) -> str:
    """Monta o prompt seguindo a ordem da Arquitetura da Explicabilidade,
    Sec.2 - a estrutura da resposta, nao a mecanica interna do motor."""
    if pacote_saida["tipo"] == "pergunta_pendente":
        return f"""Você é um consultor de negócios explicando, a um empresário sem
conhecimento técnico, por que ainda não é possível dar uma decisão responsável.

Não invente informação nenhuma além do que está abaixo. Não use jargão técnico
(nunca diga "hipótese", "certeza calculada", "motor"). Escreva como se estivesse
conversando diretamente com o empresário.

Pergunta pendente mais crítica: {pacote_saida['pergunta_mais_critica']}
Motivo (traduzir para linguagem natural, sem termos técnicos): {pacote_saida['motivo']}

Escreva 2-3 parágrafos curtos explicando que ainda falta uma informação
específica para dar uma recomendação responsável, qual é essa informação,
e por que ela importa. Termine convidando o empresário a responder."""

    if pacote_saida["tipo"] == "caso_inconclusivo":
        return f"""Você é um consultor de negócios explicando, a um empresário sem
conhecimento técnico, que a análise desta rodada não chegou a uma decisão
fechada - e por quê. Não use jargão técnico.

Motivo técnico interno (traduzir para linguagem natural): {pacote_saida['motivo_especifico']}

Escreva 2 parágrafos curtos, honestos, sem soar como falha do sistema -
explique que isso significa que a base de conhecimento ainda está aprendendo
esse tipo de situação, não que a empresa não tem solução."""

    # decisao_concluida
    evidencias_texto = "\n".join(
        f"- {e['conteudo']} (fonte: {e['fonte']})" for e in pacote_saida.get("evidencias_citadas", [])
    )
    return f"""Você é um consultor de negócios entregando um diagnóstico a um
empresário sem conhecimento técnico. Siga EXATAMENTE esta ordem (Arquitetura
da Explicabilidade, Sec.2): 1) a decisão prioritária primeiro, sem preâmbulo;
2) por que essa decisão foi escolhida; 3) as evidências principais que a
sustentam; 4) o que ainda é incerto (sempre inclua isso, mesmo com certeza
alta); 5) o próximo passo concreto.

Nunca use os termos técnicos: "hipótese", "constraint", "certeza calculada",
"motor", "Decision Pattern", "Action Pattern". Traduza tudo para a
experiência concreta do dono do negócio.

Dados do diagnóstico:
- Restrição/oportunidade identificada (nome técnico interno, traduza):
  {pacote_saida['constraint_dominante']}
- Natureza: {pacote_saida['natureza']}
- Grau de certeza interno: {pacote_saida['certeza']}
- Primeira ação recomendada: {pacote_saida['primeira_acao_recomendada']}
- Demais ações do plano: {json.dumps(pacote_saida.get('demais_acoes_do_plano', []), ensure_ascii=False)}

Evidências principais que sustentam a decisão:
{evidencias_texto if evidencias_texto else "(nenhuma evidência pública específica registrada neste caso)"}

Escreva a entrega final, em português, pronta para o empresário ler."""


def _chamar_api(prompt: str, api_key: str) -> str:
    """Chamada simples ao endpoint /v1/messages. Sem dependências externas
    (usa urllib da stdlib) para manter o v0 sem exigir instalar SDK."""
    body = json.dumps({
        "model": MODEL,
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        ANTHROPIC_API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Erro na API da Anthropic: {e.code} {e.read().decode('utf-8')}") from e

    partes_texto = [bloco["text"] for bloco in data.get("content", []) if bloco.get("type") == "text"]
    return "\n".join(partes_texto)


def traduzir_para_empresario(pacote_saida: dict, api_key: str = None) -> str:
    """Ponto de entrada público deste módulo. Recebe exatamente o dict que
    `pipeline.saida()` já retorna (um dos 3 tipos mutuamente exclusivos) e
    devolve uma string em prosa, pronta para entrega.

    NÃO altera nem reinterpreta o conteúdo de `pacote_saida` - conforme
    Contratos do Pipeline, módulo 11: "nunca pode alterar o conteúdo de
    Decisão ou PlanoDeAção - apenas formatá-los para entrega".
    """
    api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente "
            "ou passe api_key explicitamente."
        )
    prompt = _montar_prompt(pacote_saida)
    return _chamar_api(prompt, api_key)


if __name__ == "__main__":
    exemplos = [
        {"tipo": "pergunta_pendente", "pergunta_mais_critica": "Algum projeto foi fechado sem o fundador?",
         "motivo": "Nenhuma hipotese atingiu certeza suficiente para decisao."},
        {"tipo": "caso_inconclusivo", "motivo_especifico": "restricao sem padrao de decisao catalogado"},
        {"tipo": "decisao_concluida", "constraint_dominante": "Dependência comercial do fundador",
         "natureza": "restricao", "certeza": "Confirmada",
         "primeira_acao_recomendada": "Mapear o processo comercial que hoje só existe na cabeça do fundador.",
         "demais_acoes_do_plano": ["Definir um papel comercial dedicado."],
         "evidencias_citadas": [{"conteudo": "LinkedIn mostra concentração comercial no fundador",
                                  "fonte": "LinkedIn + job boards"}]},
    ]
    for ex in exemplos:
        prompt = _montar_prompt(ex)
        assert isinstance(prompt, str) and len(prompt) > 50
        assert "jargão" in prompt.lower() or "termos técnicos" in prompt.lower(), \
            "Prompt deveria conter instrucao explicita para evitar jargao tecnico"
        print(f"Prompt gerado para tipo='{ex['tipo']}': OK ({len(prompt)} caracteres)")

    print("\nPASSOU (offline) — montagem de prompt testada para os 3 tipos de saída.")
