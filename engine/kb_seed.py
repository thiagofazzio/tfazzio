"""
Popula a Knowledge Base mínima exigida pelo Blueprint (Seção 2):
- 3 Signals (embutidos dentro do Hypothesis Template, ver kb.signals)
- 2 Evidence Patterns (1 confirma, 1 descarta — falseabilidade)
- 2 Hypotheses (para Priorização ter o que comparar)
- 1 Condition of Applicability por Hypothesis
- 1 Confidence Modifier por Evidence Pattern (embutido em evidence_patterns.peso)
- 1 Decision Pattern
- 1 Action Pattern (ordem = 1)

Conteúdo adaptado do "Objeto de Referência — Consultoria B2B / Revenue Model
por Projeto". Marcado Status=Teste em todas as tabelas, nunca Oficial —
conforme o próprio documento de origem exige.

seed_extensoes_prototipo() adiciona o protótipo dos 3 padrões novos
(gate / família / concorrência declarada) — ver docstring da função.
"""
from . import db


def seed(conn):
    cur = conn.cursor()

    dp_id = "kb_dp_descentralizacao_comercial"
    cur.execute(
        """INSERT INTO kb_decision_pattern
           (id, descricao_decisao, constraint_associada, condition_of_applicability, exceptions, status)
           VALUES (?,?,?,?,?,?)""",
        (
            dp_id,
            "Resolver a dependência comercial do fundador antes de investir em outras frentes.",
            "Dependência comercial do fundador",
            db.dumps({"business_model": ["consultoria_b2b_projeto"], "revenue_model": ["projeto_escopo_fechado"]}),
            db.dumps([]),
            "Teste",
        ),
    )

    ap_id = "kb_ap_mapear_processo_comercial"
    cur.execute(
        """INSERT INTO kb_action_pattern
           (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        (
            ap_id,
            dp_id,
            1,
            "Semana 1: mapear o processo comercial que hoje só existe na cabeça do fundador.",
            db.dumps(["Investir em marketing antes de descentralizar a venda"]),
            "Teste",
        ),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern
           (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        (
            "kb_ap_definir_papel_comercial",
            dp_id,
            2,
            "Semana 2: definir um papel comercial dedicado e um roteiro de venda replicável.",
            db.dumps([]),
            "Teste",
        ),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern
           (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        (
            "kb_ap_acompanhar_primeira_venda",
            dp_id,
            3,
            "Semana 3: acompanhar a primeira venda conduzida por essa pessoa, fundador em apoio.",
            db.dumps([]),
            "Teste",
        ),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern
           (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        (
            "kb_ap_revisar_meta",
            dp_id,
            4,
            "Semana 4: revisar e ajustar, com meta de uma segunda venda conduzida de forma independente.",
            db.dumps([]),
            "Teste",
        ),
    )

    # Hypothesis principal: dependência comercial do fundador (natureza = restricao)
    hyp1_id = "kb_hyp_dependencia_comercial_fundador"
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            hyp1_id,
            "Dependência comercial do fundador",
            "restricao",
            db.dumps({"business_model": ["consultoria_b2b_projeto"], "revenue_model": ["projeto_escopo_fechado"]}),
            db.dumps([
                "presenca_publica_concentrada_1_pessoa",
                "nenhuma_vaga_cargo_comercial_publicado",
                "contratacao_picos_irregulares",
            ]),
            db.dumps([
                {"nome": "EV1_linkedin_vagas", "tipo": "confirma", "peso": "alto",
                 "fecha_por": "publica", "descricao": "LinkedIn + vagas mostram concentração comercial no fundador"},
                {"nome": "EV_projeto_fechado_sem_fundador", "tipo": "descarta", "peso": "alto",
                 "fecha_por": "pergunta", "descricao": "Projeto fechado sem envolvimento do fundador refuta a hipótese"},
            ]),
            db.dumps([
                {"nome": "algum_projeto_fechado_sem_fundador", "classe": "pergunta",
                 "pergunta_canonica": "Nos últimos 12 meses, algum projeto foi fechado sem envolvimento direto do fundador na etapa comercial?"}
            ]),
            dp_id,
            "Teste",
        ),
    )

    # Segunda Hypothesis (para Priorização ter o que comparar), natureza = oportunidade
    hyp2_id = "kb_hyp_expansao_pos_projeto"
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            hyp2_id,
            "Expansão pós-projeto não sistematizada",
            "oportunidade",
            db.dumps({"business_model": ["consultoria_b2b_projeto"], "revenue_model": ["projeto_escopo_fechado"]}),
            db.dumps([
                "nenhuma_oferta_publica_pos_projeto",
                "casos_publicos_sem_fase_2_mesmo_cliente",
            ]),
            db.dumps([
                {"nome": "EV2_site_casos", "tipo": "confirma", "peso": "medio",
                 "fecha_por": "publica", "descricao": "Site/casos publicados sem continuidade por cliente"},
                {"nome": "EV_processo_formal_pos_venda", "tipo": "descarta", "peso": "alto",
                 "fecha_por": "pergunta", "descricao": "Existência de processo formal de pós-venda refuta a hipótese"},
            ]),
            db.dumps([
                {"nome": "existe_processo_pos_venda", "classe": "pergunta",
                 "pergunta_canonica": "Existe algum processo formal, mesmo simples, para oferecer um próximo passo a clientes que terminam um projeto satisfeitos?"}
            ]),
            None,  # sem Decision Pattern catalogado no v0 -> testa o resultado (c) do Escopo do MVP §2
            "Teste",
        ),
    )

    conn.commit()
    return {"decision_pattern_id": dp_id, "hyp1_id": hyp1_id, "hyp2_id": hyp2_id}


def seed_extensoes_prototipo(conn):
    """Prototipo dos 3 padroes novos discutidos (camada/familia/concorrencia/gate),
    ANTES de escrever as 20 hipoteses universais completas - conforme decidido:
    validar o schema com poucos casos reais em vez de escrever 20 no formato errado.

    Adiciona:
    - 1 gate: 'Empresa sem objetivo claro' (KB-001, qualidade de input, nao entra no pool)
    - 1 familia: 'Crescimento acima da capacidade de absorcao' (pai) com 2 filhas
      (comercial, caixa) - mesma hipotese-guarda-chuva, decisao muda conforme
      qual capacidade rompe primeiro.
    - 1 par concorrente declarado: 'Comercial e o gargalo' vs 'Restricao comercial
      falsa' - mutuamente exclusivos por definicao, nao so por score generico.

    Todas com condition_of_applicability generica (qualquer business/revenue
    model), Status='Teste', porque sao prototipo, nao conhecimento validado.
    """
    cur = conn.cursor()
    cond_generica = db.dumps({"business_model": [], "revenue_model": []})

    # --- Gate: Empresa sem objetivo claro (KB-001) ---
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (
            "kb_hyp_objetivo_pouco_claro", "Empresa sem objetivo claro", "risco", cond_generica,
            db.dumps(["prioridades_mudam_semanalmente", "muitos_projetos_iniciados_ao_mesmo_tempo"]),
            db.dumps([]), db.dumps([]), None, "Teste", "gate",
        ),
    )

    # --- Familia: Crescimento acima da capacidade de absorcao ---
    dp_crescimento_comercial = "kb_dp_fortalecer_comercial_antes"
    cur.execute(
        """INSERT INTO kb_decision_pattern
           (id, descricao_decisao, constraint_associada, condition_of_applicability, exceptions, status)
           VALUES (?,?,?,?,?,?)""",
        (dp_crescimento_comercial,
         "Fortalecer o comercial antes de investir em mais aquisição/marketing.",
         "Crescimento acima da capacidade comercial", cond_generica, db.dumps([]), "Teste"),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        ("kb_ap_estruturar_processo_comercial", dp_crescimento_comercial, 1,
         "Estruturar um processo comercial replicável antes de acelerar a geração de demanda.",
         db.dumps(["Investir em marketing com comercial ainda amador"]), "Teste"),
    )

    dp_crescimento_caixa = "kb_dp_fortalecer_caixa_antes"
    cur.execute(
        """INSERT INTO kb_decision_pattern
           (id, descricao_decisao, constraint_associada, condition_of_applicability, exceptions, status)
           VALUES (?,?,?,?,?,?)""",
        (dp_crescimento_caixa,
         "Fortalecer o caixa/capital de giro antes de aceitar mais crescimento.",
         "Crescimento acima da capacidade financeira", cond_generica, db.dumps([]), "Teste"),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        ("kb_ap_ajustar_capital_giro", dp_crescimento_caixa, 1,
         "Ajustar prazos de recebimento/pagamento e necessidade de capital de giro antes de crescer mais.",
         db.dumps(["Vender mais e quebrar por falta de caixa"]), "Teste"),
    )

    pai_id = "kb_hyp_crescimento_acima_capacidade"
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo, camada)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (
            pai_id, "Crescimento acima da capacidade de absorção", "restricao", cond_generica,
            db.dumps(["vendas_crescendo", "reclamacoes_de_atraso_ou_qualidade"]),
            db.dumps([]), db.dumps([]), None, "Teste", "familia_pai", "escala",
        ),
    )
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo, camada, familia_pai_id, dimensao_capacidade)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            "kb_hyp_crescimento_por_comercial", "Crescimento travado pela capacidade comercial",
            "restricao", cond_generica, db.dumps(["equipe_comercial_pequena_para_o_volume_de_leads"]),
            db.dumps([
                {"nome": "EV_lead_sem_resposta", "tipo": "confirma", "peso": "alto", "fecha_por": "publica",
                 "descricao": "Leads relatam demora ou ausencia de resposta comercial"},
            ]),
            db.dumps([]), dp_crescimento_comercial, "Teste", "familia_filha", "escala",
            pai_id, "comercial",
        ),
    )
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo, camada, familia_pai_id, dimensao_capacidade)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            "kb_hyp_crescimento_por_caixa", "Crescimento travado pelo caixa",
            "restricao", cond_generica, db.dumps(["cada_venda_aumenta_necessidade_de_capital_de_giro"]),
            db.dumps([
                {"nome": "EV_prazo_recebimento_maior_pagamento", "tipo": "confirma", "peso": "alto",
                 "fecha_por": "publica", "descricao": "Prazo de recebimento maior que prazo de pagamento a fornecedores"},
            ]),
            db.dumps([]), dp_crescimento_caixa, "Teste", "familia_filha", "escala",
            pai_id, "caixa",
        ),
    )

    # --- Par concorrente declarado: Comercial é o gargalo vs Restrição comercial falsa ---
    dp_investir_comercial = "kb_dp_investir_time_comercial"
    cur.execute(
        """INSERT INTO kb_decision_pattern
           (id, descricao_decisao, constraint_associada, condition_of_applicability, exceptions, status)
           VALUES (?,?,?,?,?,?)""",
        (dp_investir_comercial, "Investir em mais capacidade comercial (gente/processo de vendas).",
         "Comercial é o gargalo", cond_generica, db.dumps([]), "Teste"),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        ("kb_ap_ampliar_time_comercial", dp_investir_comercial, 1,
         "Ampliar ou treinar o time comercial para dar conta do volume de leads já existente.",
         db.dumps([]), "Teste"),
    )
    dp_melhorar_entrega = "kb_dp_melhorar_entrega_antes_de_vender_mais"
    cur.execute(
        """INSERT INTO kb_decision_pattern
           (id, descricao_decisao, constraint_associada, condition_of_applicability, exceptions, status)
           VALUES (?,?,?,?,?,?)""",
        (dp_melhorar_entrega, "Melhorar a entrega/qualidade antes de vender mais (não é problema comercial).",
         "Restrição comercial falsa", cond_generica, db.dumps([]), "Teste"),
    )
    cur.execute(
        """INSERT INTO kb_action_pattern (id, decision_pattern_id, ordem, descricao, erros_classicos_evitados, status)
           VALUES (?,?,?,?,?,?)""",
        ("kb_ap_corrigir_entrega", dp_melhorar_entrega, 1,
         "Corrigir os pontos de entrega/qualidade que estão gerando cancelamento e recompra baixa.",
         db.dumps(["Contratar mais vendedor achando que resolve a raiz do problema"]), "Teste"),
    )

    id_comercial_gargalo = "kb_hyp_comercial_e_o_gargalo"
    id_restricao_falsa = "kb_hyp_restricao_comercial_falsa"
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo, camada, hipoteses_concorrentes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            id_comercial_gargalo, "Comercial é o gargalo", "restricao", cond_generica,
            db.dumps(["muito_lead", "pouca_conversao"]),
            db.dumps([
                {"nome": "EV_muitos_leads_poucas_propostas", "tipo": "confirma", "peso": "alto",
                 "fecha_por": "publica", "descricao": "Muitos leads recebidos mas poucas propostas enviadas"},
            ]),
            db.dumps([]), dp_investir_comercial, "Teste", "diagnostica", "comercial",
            db.dumps([id_restricao_falsa]),
        ),
    )
    cur.execute(
        """INSERT INTO kb_hypothesis_template
           (id, nome, natureza, condition_of_applicability, signals, evidence_patterns, lacunas_tipicas,
            decision_pattern_id, status, tipo, camada, hipoteses_concorrentes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            id_restricao_falsa, "Restrição comercial falsa", "restricao", cond_generica,
            db.dumps(["cliente_cancela_ou_nao_recompra", "indicacao_baixa_apesar_de_muita_venda"]),
            db.dumps([
                {"nome": "EV_baixa_recompra_e_indicacao", "tipo": "confirma", "peso": "alto",
                 "fecha_por": "publica", "descricao": "Baixa recompra e baixa indicacao apesar de volume de vendas"},
            ]),
            db.dumps([]), dp_melhorar_entrega, "Teste", "diagnostica", "comercial",
            db.dumps([id_comercial_gargalo]),
        ),
    )

    conn.commit()
    return {
        "gate_id": "kb_hyp_objetivo_pouco_claro",
        "familia_pai_id": pai_id,
        "concorrentes": [id_comercial_gargalo, id_restricao_falsa],
    }
