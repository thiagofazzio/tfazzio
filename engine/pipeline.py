"""
Implementação do pipeline de 11 módulos, seguindo:
- TFAZZIO_Contratos_do_Pipeline_v1.0 (contrato de cada módulo)
- TFAZZIO_Especificacao_do_Raciocinio_v1.0 (como o motor pensa por dentro)
- tfazzio-especificacao-camada-decisao-v1.0 (regra de seleção Constraint -> Decision Pattern)
- tfazzio-escopo-mvp-contrato-interface-v1.0 (contrato de saída: 3 resultados mutuamente exclusivos)

Módulo 2 (Enriquecimento) é MOCKADO conforme Blueprint §3: em vez de buscar em
fontes públicas, recebe `dados_publicos` já coletados manualmente por um humano.
Todos os demais módulos são reais.

Versão consolidada mais recente: inclui capacidade real como 3o fator de
impacto (Raciocinio §6.6), retroalimentação real Investigação -> Seleção de
Hipóteses (Raciocinio §3.4), e o protótipo de 3 mecanismos novos (gate de
objetivo, família de hipóteses por ponto de ruptura, concorrência declarada
entre hipóteses na KB).
"""
import datetime
from . import db

NIVEIS_CERTEZA = ["Indicio", "Plausivel", "Provavel", "Confirmada"]
_PESO_CERTEZA = {"Indicio": 0, "Plausivel": 1, "Provavel": 2, "Confirmada": 3}
_PESO_CERTEZA_MIN_DECISAO = _PESO_CERTEZA["Provavel"]

_PESO_CAPACIDADE = {"baixa": 0, "media": 1, "alta": 2}
_LABEL_CAPACIDADE = {v: k for k, v in _PESO_CAPACIDADE.items()}


def _capacidade_geral(empresa_row):
    """Raciocinio Sec.6.6: Capacidade nunca eh filtro binario, e um dos 3 fatores
    de impacto. Usamos o elo mais fraco entre caixa/RH/tempo do fundador como
    a capacidade geral da empresa neste ciclo (v0: capacidade ainda nao e
    modelada por Hypothesis - isso e a pendencia formal de Capability ja
    registrada na Regra de Governanca da KB)."""
    cap = db.loads(empresa_row["capacidade"]) if empresa_row["capacidade"] else {}
    cap = cap or {}
    dimensoes = ("caixa", "recursos_humanos", "tempo_fundador")
    pesos = [_PESO_CAPACIDADE.get(cap.get(d, "media"), 1) for d in dimensoes]
    peso_minimo = min(pesos)
    dimensao_fraca = dimensoes[pesos.index(peso_minimo)]
    return _LABEL_CAPACIDADE[peso_minimo], peso_minimo, dimensao_fraca


_STOPWORDS_PT = {
    "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e", "em", "um", "uma",
    "para", "por", "com", "sem", "que", "no", "na", "nos", "nas", "ao", "aos",
    "se", "sua", "seu", "suas", "seus",
}


def _keywords(descricao: str, n: int = 3):
    """Extrai até n palavras-chave significativas (ignora stopwords e palavras
    curtas), evitando que um casador ingênuo dispare por coincidência de
    substring em palavras irrelevantes."""
    palavras = [w.strip(".,;:!?/") for w in descricao.lower().split()]
    significativas = [w for w in palavras if w not in _STOPWORDS_PT and len(w) > 3]
    return significativas[:n] or palavras[:n]


def _evidencia_satisfaz(keywords, ev_texto: str) -> bool:
    """Match por palavra inteira (não substring) contra o texto da evidência.
    Exige pelo menos 2 palavras-chave batendo (ou todas, se houver menos de 2) —
    uma única palavra-chave genérica (ex.: 'projeto') não basta sozinha para
    considerar um Evidence Pattern satisfeito; isso evita falsos positivos
    quando um termo comum aparece em uma evidência não relacionada."""
    palavras_ev = set(w.strip(".,;:!?/") for w in ev_texto.split())
    hits = sum(1 for k in keywords if k in palavras_ev)
    limiar = min(2, len(keywords))
    return hits >= limiar


def _now():
    return datetime.datetime.utcnow().isoformat()


# ------------------------------------------------------------------
# 1. Entrada
# ------------------------------------------------------------------
def entrada(conn, cnpj, modelo_receita_percebido, objetivo_empresarial, versao_motor="v0.1", versao_kb="0.1.0-teste"):
    """Contratos §1. Só aceita 3 campos; nunca consulta fonte pública."""
    if not cnpj:
        raise ValueError("Erro Entrada: identificador legal ausente/ inválido")
    if not objetivo_empresarial:
        raise ValueError("Erro Entrada: Objetivo Empresarial é obrigatório para abrir o Caso")

    caso_id = db.new_id("caso")
    conn.execute(
        """INSERT INTO caso (id, timestamp_abertura, versao_motor, versao_kb, estado,
                              cnpj, modelo_receita_percebido, objetivo_empresarial)
           VALUES (?,?,?,?,?,?,?,?)""",
        (caso_id, _now(), versao_motor, versao_kb, "Entrada concluida",
         cnpj, modelo_receita_percebido, objetivo_empresarial),
    )

    empresa_id = db.new_id("empresa")
    conn.execute(
        "INSERT INTO empresa (id, caso_id, estado_normalizacao) VALUES (?,?,?)",
        (empresa_id, caso_id, "pendente"),
    )

    ev_id = db.new_id("ev")
    conn.execute(
        """INSERT INTO evidencia (id, caso_id, conteudo, fonte, data_coleta, confiabilidade, tipo, verificada)
           VALUES (?,?,?,?,?,?,?,0)""",
        (ev_id, caso_id, f"Percepção declarada de modelo de receita: {modelo_receita_percebido}",
         "empresario", _now(), "alta", "percepcao_declarada"),
    )
    conn.commit()
    return caso_id


# ------------------------------------------------------------------
# 1b. Gate "Objetivo pouco claro" (KB-001 / Hipotese de qualidade de input)
# ------------------------------------------------------------------
OBJETIVOS_CANONICOS = {
    "reduzir_dependencia_fundador",
    "crescer_faturamento",
    "aumentar_margem",
    "aumentar_caixa",
    "vender_a_empresa",
    "profissionalizar_gestao",
}


def verificar_objetivo(conn, caso_id):
    """Contratos §1 (extensao): bloqueia o pipeline com uma pergunta de
    calibracao se o Objetivo Empresarial declarado nao for um objetivo
    reconhecido e especifico o suficiente para orientar Priorizacao (modulo 8)
    e Decisao (modulo 9). Retorna True se o objetivo ja e claro (pipeline
    pode seguir para o Enriquecimento), False se abriu pergunta pendente."""
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Entrada concluida":
        raise RuntimeError("verificar_objetivo chamado fora de ordem")

    if caso["objetivo_empresarial"] in OBJETIVOS_CANONICOS:
        return True

    conn.execute(
        """INSERT INTO pergunta (id, caso_id, hipotese_id, tipo, lacuna, texto, estado)
           VALUES (?,?,?,?,?,?,?)""",
        (db.new_id("pq"), caso_id, None, "calibracao", "objetivo_pouco_claro",
         f"Você descreveu o objetivo como '{caso['objetivo_empresarial']}'. Isso ainda é amplo "
         f"demais para orientar uma decisão responsável. Qual seria, hoje, o único resultado que, "
         f"se acontecesse nos próximos 90 dias, você diria que valeu a pena?", "pendente"),
    )
    conn.execute("UPDATE caso SET estado='Entrada: objetivo pouco claro' WHERE id=?", (caso_id,))
    conn.commit()
    return False


def responder_objetivo(conn, caso_id, objetivo_reconciliado):
    """Fecha a pergunta 'objetivo_pouco_claro' e promove o objetivo declarado
    pelo empresário (em suas próprias palavras) a objetivo_empresarial do
    Caso, liberando o Enriquecimento. Não infere nem reescreve - só aceita
    o que o empresário mesmo disse, igual a responder_calibracao (modulo 2)."""
    conn.execute(
        """UPDATE pergunta SET estado='respondida', resposta=?
           WHERE caso_id=? AND lacuna='objetivo_pouco_claro' AND estado='pendente'""",
        (objetivo_reconciliado, caso_id),
    )
    conn.execute("UPDATE caso SET objetivo_empresarial=?, estado='Entrada concluida' WHERE id=?",
                 (objetivo_reconciliado, caso_id))
    conn.commit()


# ------------------------------------------------------------------
# 2. Enriquecimento (MOCKADO — humano cola os dados públicos)
# ------------------------------------------------------------------
def enriquecimento(conn, caso_id, dados_publicos: dict):
    """
    Contratos §2. `dados_publicos` é o que, em produção, viria de fontes
    públicas automatizadas; no v0 é fornecido manualmente pelo humano, mas
    o CONTRATO DE SAÍDA é respeitado integralmente (mesmos objetos Evidência,
    mesma checagem de congruência).

    dados_publicos esperado:
        {
          "setor": str, "porte": str, "idade_anos": int, "localizacao": str,
          "business_models": [str,...], "revenue_models": [str,...],
          "modelo_receita_publico": str,   # usado na checagem de congruência
          "capacidade": {"caixa": "...", "recursos_humanos": "...", "tempo_fundador": "...", ...},
          "evidencias": [ {"conteudo":..., "fonte":..., "confiabilidade":...}, ... ]
        }
    """
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Entrada concluida":
        raise RuntimeError("Enriquecimento chamado fora de ordem: Caso não está em 'Entrada concluida'")

    for ev in dados_publicos.get("evidencias", []):
        conn.execute(
            """INSERT INTO evidencia (id, caso_id, conteudo, fonte, data_coleta, confiabilidade, tipo, verificada)
               VALUES (?,?,?,?,?,?,?,1)""",
            (db.new_id("ev"), caso_id, ev["conteudo"], ev["fonte"], _now(),
             ev.get("confiabilidade", "media"), "publica"),
        )

    capacidade_default = {"caixa": "media", "recursos_humanos": "media", "tempo_fundador": "media"}
    capacidade = {**capacidade_default, **dados_publicos.get("capacidade", {})}

    conn.execute(
        """UPDATE empresa SET setor=?, porte=?, idade_anos=?, localizacao=?,
                              business_models=?, revenue_models=?, capacidade=?
           WHERE caso_id=?""",
        (dados_publicos.get("setor"), dados_publicos.get("porte"), dados_publicos.get("idade_anos"),
         dados_publicos.get("localizacao"), db.dumps(dados_publicos.get("business_models", [])),
         db.dumps(dados_publicos.get("revenue_models", [])), db.dumps(capacidade), caso_id),
    )

    # Checagem de congruência (Contratos §2 + Diagnóstico §5)
    percebido = caso["modelo_receita_percebido"]
    publico = dados_publicos.get("modelo_receita_publico")
    congruente = (percebido == publico) or (publico is None)

    novo_estado = "Enriquecimento concluido" if congruente else "Enriquecimento: pergunta de calibracao pendente"
    if not congruente:
        conn.execute(
            """INSERT INTO pergunta (id, caso_id, hipotese_id, tipo, lacuna, texto, estado)
               VALUES (?,?,?,?,?,?,?)""",
            (db.new_id("pq"), caso_id, None, "calibracao", "divergencia_modelo_receita",
             f"Você informou '{percebido}', porém os dados públicos indicam '{publico}'. "
             f"Explique brevemente como sua empresa realmente gera receita.", "pendente"),
        )

    conn.execute("UPDATE caso SET estado=? WHERE id=?", (novo_estado, caso_id))
    conn.commit()
    return {"congruente": congruente}


def responder_calibracao(conn, caso_id, resposta_texto):
    """Fecha a pergunta de calibração pendente, promove a percepção reconciliada, libera Normalização."""
    conn.execute(
        """UPDATE pergunta SET estado='respondida', resposta=?
           WHERE caso_id=? AND lacuna='divergencia_modelo_receita' AND estado='pendente'""",
        (resposta_texto, caso_id),
    )
    conn.execute(
        """INSERT INTO evidencia (id, caso_id, conteudo, fonte, data_coleta, confiabilidade, tipo, verificada)
           VALUES (?,?,?,?,?,?,?,1)""",
        (db.new_id("ev"), caso_id, resposta_texto, "empresario", _now(), "alta", "resposta_pergunta"),
    )
    conn.execute("UPDATE caso SET estado='Enriquecimento concluido' WHERE id=?", (caso_id,))
    conn.commit()


# ------------------------------------------------------------------
# 3. Normalização
# ------------------------------------------------------------------
_PORTE_MAP = {"micro": "micro", "pequena": "pequena", "media": "media", "grande": "grande"}


def normalizacao(conn, caso_id):
    """Contratos §3. Traduz, nunca interpreta."""
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Enriquecimento concluido":
        raise RuntimeError("Normalização chamada fora de ordem")

    empresa = conn.execute("SELECT * FROM empresa WHERE caso_id=?", (caso_id,)).fetchone()
    porte_norm = _PORTE_MAP.get((empresa["porte"] or "").lower(), empresa["porte"] or "indeterminado")
    conn.execute("UPDATE empresa SET porte=?, estado_normalizacao='concluida' WHERE caso_id=?",
                 (porte_norm, caso_id))
    conn.execute("UPDATE caso SET estado='Normalizacao concluida' WHERE id=?", (caso_id,))
    conn.commit()


# ------------------------------------------------------------------
# 4. Contextualização
# ------------------------------------------------------------------
def contextualizacao(conn, caso_id):
    """Contratos §4. Produz Contexto + SistemaDeValor. Não diagnostica nada."""
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Normalizacao concluida":
        raise RuntimeError("Contextualização chamada fora de ordem")

    empresa = conn.execute("SELECT * FROM empresa WHERE caso_id=?", (caso_id,)).fetchone()
    business_models = db.loads(empresa["business_models"]) or ["indeterminado"]
    revenue_models = db.loads(empresa["revenue_models"]) or ["indeterminado"]

    evidencias_ids = [r["id"] for r in conn.execute(
        "SELECT id FROM evidencia WHERE caso_id=?", (caso_id,)).fetchall()]

    ctx_id = db.new_id("ctx")
    conn.execute(
        """INSERT INTO contexto (id, caso_id, modelo_negocio, mecanismo_receita, estagio_empresa,
                                  dependencia_fundador, evidencias_sustentacao)
           VALUES (?,?,?,?,?,?,?)""",
        (ctx_id, caso_id, business_models[0] if len(business_models) == 1 else "misto",
         revenue_models[0] if len(revenue_models) == 1 else "misto",
         "indeterminado", "indeterminado", db.dumps(evidencias_ids)),
    )

    sv_id = db.new_id("sv")
    estagios = ["Geracao de demanda", "Venda/Qualificacao", "Delivery/Execucao", "Encerramento e Expansao"]
    conn.execute("INSERT INTO sistema_valor (id, caso_id, estagios) VALUES (?,?,?)",
                 (sv_id, caso_id, db.dumps(estagios)))

    conn.execute("UPDATE empresa SET business_models=?, revenue_models=? WHERE caso_id=?",
                 (db.dumps(business_models), db.dumps(revenue_models), caso_id))
    conn.execute("UPDATE caso SET estado='Contexto definido' WHERE id=?", (caso_id,))
    conn.commit()
    return ctx_id, sv_id


# ------------------------------------------------------------------
# 5. Seleção de Hipóteses
# ------------------------------------------------------------------
def selecao_hipoteses(conn, caso_id):
    """Contratos §5. Casamento de padrão determinístico contra a KB — nunca inventa hipótese.

    Trata os tipos especiais de template (protótipo): 'gate' nunca entra no
    pool diagnóstico; 'familia_filha' só é ativada através do seu 'familia_pai'
    (nunca diretamente); 'familia_pai' nunca vira Hypothesis instanciada -
    ele apenas libera as filhas, cada uma competindo depois na Priorização
    pelo seu próprio elo de capacidade.
    """
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] not in ("Contexto definido",):
        raise RuntimeError("Seleção de Hipóteses chamada fora de ordem")

    ctx = conn.execute("SELECT * FROM contexto WHERE caso_id=?", (caso_id,)).fetchone()
    empresa = conn.execute("SELECT * FROM empresa WHERE caso_id=?", (caso_id,)).fetchone()
    bms = db.loads(empresa["business_models"]) or []
    rms = db.loads(empresa["revenue_models"]) or []

    templates = conn.execute("SELECT * FROM kb_hypothesis_template").fetchall()
    selecionadas = []
    for t in templates:
        if t["tipo"] == "gate":
            continue  # gates (ex: objetivo pouco claro) nunca entram no pool diagnostico
        if t["tipo"] == "familia_filha":
            continue  # filhas so sao ativadas via o pai (abaixo), nunca por conta propria
        cond = db.loads(t["condition_of_applicability"])
        bm_ok = not cond.get("business_model") or any(bm in cond["business_model"] for bm in bms)
        rm_ok = not cond.get("revenue_model") or any(rm in cond["revenue_model"] for rm in rms)
        if not (bm_ok and rm_ok):
            continue

        if t["tipo"] == "familia_pai":
            filhas = conn.execute(
                "SELECT * FROM kb_hypothesis_template WHERE familia_pai_id=?", (t["id"],)
            ).fetchall()
            for filha in filhas:
                hid = db.new_id("hyp")
                lacunas = db.loads(filha["lacunas_tipicas"])
                conn.execute(
                    """INSERT INTO hipotese (id, caso_id, template_id, natureza, estado, lacunas)
                       VALUES (?,?,?,?,?,?)""",
                    (hid, caso_id, filha["id"], filha["natureza"], "ativa", db.dumps(lacunas)),
                )
                selecionadas.append(hid)
            continue

        hid = db.new_id("hyp")
        lacunas = db.loads(t["lacunas_tipicas"])
        conn.execute(
            """INSERT INTO hipotese (id, caso_id, template_id, natureza, estado, lacunas)
               VALUES (?,?,?,?,?,?)""",
            (hid, caso_id, t["id"], t["natureza"], "ativa", db.dumps(lacunas)),
        )
        selecionadas.append(hid)

    if not selecionadas:
        conn.execute("UPDATE caso SET estado='sem hipotese aplicavel' WHERE id=?", (caso_id,))
        conn.commit()
        return []

    conn.execute("UPDATE caso SET estado='Hipoteses selecionadas' WHERE id=?", (caso_id,))
    conn.commit()
    return selecionadas


# ------------------------------------------------------------------
# 6. Investigação
# ------------------------------------------------------------------
def investigacao(conn, caso_id, respostas: dict = None,
                  business_models_revelados: list = None, revenue_models_revelados: list = None):
    """
    Contratos §6. Para cada lacuna: tenta fonte pública (já coletada no
    Enriquecimento mockado) antes de perguntar; nunca completa com suposição.
    `respostas` simula, no v0, o empresário respondendo no mesmo ciclo
    (em produção isso pausaria o Caso até a resposta chegar).

    `business_models_revelados` / `revenue_models_revelados`: quando uma
    resposta do empresário revela que a empresa opera sob um Business Model
    ou Revenue Model adicional (dimensao do Contexto antes indeterminada -
    Raciocinio Sec.3.4), o motor executa uma nova passada de casamento de
    padrao contra o catalogo COMPLETO de hipoteses, nao apenas as ja ativas.
    Esta e a UNICA retroalimentacao permitida no pipeline: Investigacao pode
    reabrir Selecao de Hipoteses, nunca o contrario (Raciocinio Sec.3.4;
    Arquitetura Logica v1.2, pipeline com retroalimentacao controlada).

    Retorna (concluido_sem_bloqueio, hipoteses_novas_por_retroalimentacao).
    """
    respostas = respostas or {}
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Hipoteses selecionadas":
        raise RuntimeError("Investigação chamada fora de ordem")

    evidencias_conteudo = [r["conteudo"] for r in
                           conn.execute("SELECT conteudo FROM evidencia WHERE caso_id=?", (caso_id,)).fetchall()]

    hipoteses = conn.execute(
        "SELECT * FROM hipotese WHERE caso_id=? AND estado='ativa'", (caso_id,)).fetchall()

    bloqueada_alguma = False
    for h in hipoteses:
        lacunas = db.loads(h["lacunas"])
        template = conn.execute("SELECT * FROM kb_hypothesis_template WHERE id=?", (h["template_id"],)).fetchone()
        evidence_patterns = db.loads(template["evidence_patterns"])

        for lac in lacunas:
            # tenta fechar por fonte pública antes de qualquer pergunta (Raciocínio §4.1):
            # existe evidence_pattern "confirma" e "fecha_por=publica" cujas palavras-chave já
            # aparecem em alguma evidência pública coletada no Enriquecimento?
            ep_confirma_publica = [ep for ep in evidence_patterns
                                    if ep["tipo"] == "confirma" and ep.get("fecha_por") == "publica"]
            tem_publica = any(
                _evidencia_satisfaz(_keywords(ep["descricao"]), ev)
                for ep in ep_confirma_publica for ev in evidencias_conteudo
            )
            if tem_publica:
                continue  # lacuna fechada por fonte pública, nunca vira Pergunta

            if lac["classe"] == "pergunta":
                pq_existente = conn.execute(
                    "SELECT * FROM pergunta WHERE caso_id=? AND hipotese_id=? AND lacuna=?",
                    (caso_id, h["id"], lac["nome"]),
                ).fetchone()
                if pq_existente and pq_existente["estado"] == "respondida":
                    continue
                if not pq_existente:
                    conn.execute(
                        """INSERT INTO pergunta (id, caso_id, hipotese_id, tipo, lacuna, texto, estado)
                           VALUES (?,?,?,?,?,?,?)""",
                        (db.new_id("pq"), caso_id, h["id"], "lacuna", lac["nome"], lac["pergunta_canonica"], "pendente"),
                    )
                if lac["nome"] in respostas:
                    resp_texto = respostas[lac["nome"]]
                    conn.execute(
                        "UPDATE pergunta SET estado='respondida', resposta=? WHERE caso_id=? AND lacuna=?",
                        (resp_texto, caso_id, lac["nome"]),
                    )
                    ev_id = db.new_id("ev")
                    conn.execute(
                        """INSERT INTO evidencia (id, caso_id, conteudo, fonte, data_coleta,
                                                   confiabilidade, tipo, verificada, hipotese_id)
                           VALUES (?,?,?,?,?,?,?,1,?)""",
                        (ev_id, caso_id, resp_texto, "empresario", _now(), "alta", "resposta_pergunta", h["id"]),
                    )
                    evidencias_conteudo.append(resp_texto)
                else:
                    bloqueada_alguma = True
                    conn.execute("UPDATE hipotese SET estado='ativa', motivo_estado='bloqueada: pergunta pendente' "
                                 "WHERE id=?", (h["id"],))

    hipoteses_novas_por_retroalimentacao = []
    if business_models_revelados or revenue_models_revelados:
        empresa = conn.execute("SELECT * FROM empresa WHERE caso_id=?", (caso_id,)).fetchone()
        bms = set(db.loads(empresa["business_models"]) or [])
        rms = set(db.loads(empresa["revenue_models"]) or [])
        bms |= set(business_models_revelados or [])
        rms |= set(revenue_models_revelados or [])
        conn.execute("UPDATE empresa SET business_models=?, revenue_models=? WHERE caso_id=?",
                     (db.dumps(sorted(bms)), db.dumps(sorted(rms)), caso_id))

        # Contratos do Pipeline modulo 5, invariante: "nenhuma hipotese e
        # selecionada duas vezes para o mesmo Caso" - so consideramos
        # templates que este Caso ainda nao selecionou.
        ja_selecionados = {r["template_id"] for r in conn.execute(
            "SELECT DISTINCT template_id FROM hipotese WHERE caso_id=?", (caso_id,)).fetchall()}
        templates = conn.execute("SELECT * FROM kb_hypothesis_template").fetchall()
        for t in templates:
            if t["id"] in ja_selecionados:
                continue
            if t["tipo"] in ("gate", "familia_filha"):
                continue
            cond = db.loads(t["condition_of_applicability"])
            bm_ok = not cond.get("business_model") or any(bm in cond["business_model"] for bm in bms)
            rm_ok = not cond.get("revenue_model") or any(rm in cond["revenue_model"] for rm in rms)
            if bm_ok and rm_ok:
                hid = db.new_id("hyp")
                lacunas = db.loads(t["lacunas_tipicas"])
                conn.execute(
                    """INSERT INTO hipotese (id, caso_id, template_id, natureza, estado, lacunas)
                       VALUES (?,?,?,?,?,?)""",
                    (hid, caso_id, t["id"], t["natureza"], "ativa", db.dumps(lacunas)),
                )
                hipoteses_novas_por_retroalimentacao.append(hid)

    novo_estado = "Investigacao concluida para o ciclo atual"
    conn.execute("UPDATE caso SET estado=? WHERE id=?", (novo_estado, caso_id))
    conn.commit()
    return not bloqueada_alguma, hipoteses_novas_por_retroalimentacao


# ------------------------------------------------------------------
# 7. Cálculo de Certeza
# ------------------------------------------------------------------
def calculo_certeza(conn, caso_id):
    """
    Raciocínio §5. Julgamento composto qualitativo (4 níveis, doc de
    referência): Indicio -> Plausivel -> Provavel -> Confirmada.
    Contradição (evidence_pattern tipo='descarta' satisfeita) tem poder de veto.

    Segunda passada: exclusao explicita entre hipoteses concorrentes
    declaradas na KB (kb_hypothesis_template.hipoteses_concorrentes) - isto
    e diferente do desempate generico da Priorizacao (modulo 8): aqui a
    incompatibilidade e logica/definicional (ex: "Comercial e o gargalo"
    vs "Restricao comercial falsa" nao podem coexistir como ativas).
    """
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Investigacao concluida para o ciclo atual":
        raise RuntimeError("Cálculo de Certeza chamado fora de ordem")

    hipoteses = conn.execute("SELECT * FROM hipotese WHERE caso_id=?", (caso_id,)).fetchall()
    evidencias = conn.execute("SELECT * FROM evidencia WHERE caso_id=?", (caso_id,)).fetchall()
    ev_textos = [e["conteudo"].lower() for e in evidencias]

    alguma_com_certeza_suficiente = False
    for h in hipoteses:
        if h["estado"] not in ("ativa",):
            continue
        template = conn.execute("SELECT * FROM kb_hypothesis_template WHERE id=?", (h["template_id"],)).fetchone()
        eps = db.loads(template["evidence_patterns"])

        satisfeitos_confirma_alto = 0
        satisfeitos_confirma_qualquer = 0
        contradicao_forte = False
        justificativa = []

        for ep in eps:
            kw = _keywords(ep["descricao"])
            satisfeito = any(_evidencia_satisfaz(kw, txt) for txt in ev_textos)
            if satisfeito and ep["tipo"] == "confirma":
                satisfeito_alto = ep.get("peso") == "alto"
                satisfeitos_confirma_qualquer += 1
                if satisfeito_alto:
                    satisfeitos_confirma_alto += 1
                justificativa.append("A favor (%s): %s" % (ep["peso"], ep["descricao"]))
            elif satisfeito and ep["tipo"] == "descarta":
                contradicao_forte = True
                justificativa.append("CONTRADICAO (poder de veto): %s" % ep["descricao"])

        pergs_pendentes = conn.execute(
            "SELECT COUNT(*) c FROM pergunta WHERE caso_id=? AND hipotese_id=? AND estado='pendente'",
            (caso_id, h["id"]),
        ).fetchone()["c"]

        if contradicao_forte:
            nivel = "Indicio"
            estado_final = "descartada"
            motivo = "Contradicao forte nao resolvida (poder de veto) - Raciocinio 5.2/5.3"
        elif pergs_pendentes > 0:
            nivel = "Provavel" if satisfeitos_confirma_qualquer >= 1 else "Plausivel"
            estado_final = "bloqueada"
            motivo = "Pergunta discriminante pendente - Contratos 6"
        elif satisfeitos_confirma_alto >= 1:
            nivel = "Confirmada"
            estado_final = "ativa"
            motivo = None
        elif satisfeitos_confirma_qualquer >= 1:
            nivel = "Provavel"
            estado_final = "ativa"
            motivo = None
        else:
            nivel = "Indicio"
            estado_final = "ativa"
            motivo = "Evidencia insuficiente ate o momento"

        conn.execute(
            "UPDATE hipotese SET certeza=?, certeza_justificativa=?, estado=?, motivo_estado=? WHERE id=?",
            (nivel, db.dumps(justificativa), estado_final, motivo, h["id"]),
        )
        if estado_final == "ativa" and _PESO_CERTEZA_MIN_DECISAO <= _PESO_CERTEZA.get(nivel, 0):
            alguma_com_certeza_suficiente = True

    hipoteses_atuais = conn.execute(
        "SELECT h.*, t.hipoteses_concorrentes AS concorrentes, t.id AS template_id "
        "FROM hipotese h JOIN kb_hypothesis_template t ON h.template_id = t.id "
        "WHERE h.caso_id=? AND h.estado='ativa'", (caso_id,)
    ).fetchall()
    ja_resolvidos = set()
    for h in hipoteses_atuais:
        concorrentes_ids = db.loads(h["concorrentes"]) or []
        if not concorrentes_ids or h["id"] in ja_resolvidos:
            continue
        for h2 in hipoteses_atuais:
            if h2["template_id"] not in concorrentes_ids or h2["id"] in ja_resolvidos:
                continue
            # Ambas ativas e concorrentes declaradas: vence a de maior certeza;
            # empate resolvido a favor da que ja estava sendo avaliada primeiro
            # (ordem estavel, nunca aleatoria - determinismo, Blueprint §5).
            peso_h, peso_h2 = _PESO_CERTEZA.get(h["certeza"], 0), _PESO_CERTEZA.get(h2["certeza"], 0)
            perdedora, vencedora_nome = (h2, h["template_id"]) if peso_h >= peso_h2 else (h, h2["template_id"])
            conn.execute(
                "UPDATE hipotese SET estado='descartada', "
                "motivo_estado=? WHERE id=?",
                (f"descartada por concorrencia explicita na KB, vencida por {vencedora_nome}", perdedora["id"]),
            )
            ja_resolvidos.add(perdedora["id"])

    if ja_resolvidos:
        restantes = conn.execute(
            "SELECT certeza FROM hipotese WHERE caso_id=? AND estado='ativa'", (caso_id,)
        ).fetchall()
        alguma_com_certeza_suficiente = any(
            _PESO_CERTEZA.get(r["certeza"], 0) >= _PESO_CERTEZA_MIN_DECISAO for r in restantes
        )

    if alguma_com_certeza_suficiente:
        conn.execute("UPDATE caso SET estado='Certeza calculada' WHERE id=?", (caso_id,))
    else:
        conn.execute("UPDATE caso SET estado='certeza insuficiente para decisao' WHERE id=?", (caso_id,))
    conn.commit()
    return alguma_com_certeza_suficiente


# ------------------------------------------------------------------
# 8. Priorização
# ------------------------------------------------------------------
def priorizacao(conn, caso_id):
    """
    Raciocínio §6. Impacto = potencial de resultado + força de evidência +
    capacidade de execução. Objetivo Empresarial relativiza o potencial.

    Filhas de familia (ex: "Crescimento acima da capacidade de absorcao")
    nao competem pelo elo mais fraco GERAL da empresa - cada filha representa
    uma dimensao especifica (template.dimensao_capacidade), e o ponto de
    ruptura especifico e o que define qual filha vence.
    """
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Certeza calculada":
        raise RuntimeError("Priorização chamada fora de ordem")

    objetivo = caso["objetivo_empresarial"]
    empresa = conn.execute("SELECT * FROM empresa WHERE caso_id=?", (caso_id,)).fetchone()
    capacidade_label, capacidade_peso, capacidade_dimensao_fraca = _capacidade_geral(empresa)

    candidatas = conn.execute(
        "SELECT * FROM hipotese WHERE caso_id=? AND estado='ativa' AND certeza IS NOT NULL",
        (caso_id,),
    ).fetchall()
    candidatas = [h for h in candidatas if _PESO_CERTEZA.get(h["certeza"], 0) >= _PESO_CERTEZA["Provavel"]]

    if not candidatas:
        conn.execute("UPDATE caso SET estado='nenhuma hipotese com certeza suficiente sobrevive' WHERE id=?",
                     (caso_id,))
        conn.commit()
        return None

    def score(h):
        template = conn.execute("SELECT * FROM kb_hypothesis_template WHERE id=?", (h["template_id"],)).fetchone()
        alinhado_objetivo = 2 if (
            (objetivo == "reduzir_dependencia_fundador" and template["natureza"] == "restricao")
            or (objetivo != "reduzir_dependencia_fundador" and template["natureza"] == "oportunidade")
        ) else 0

        if template["dimensao_capacidade"]:
            cap_dict = db.loads(empresa["capacidade"]) or {}
            peso_dimensao = _PESO_CAPACIDADE.get(cap_dict.get(template["dimensao_capacidade"], "media"), 1)
            capacidade_score = 2 - peso_dimensao  # elo mais fraco desta dimensao = prioridade maior
        else:
            capacidade_score = capacidade_peso

        # Raciocinio Sec.6.2: os 3 fatores nao sao somados numa media simples,
        # mas para v0 usamos a ordem (alinhamento, certeza, capacidade) como
        # criterio de comparacao/desempate estrito, coerente com a ideia de
        # que capacidade nunca desqualifica sozinha (Sec.6.6) - ela so pesa
        # quando os dois fatores anteriores ja estao empatados.
        return (alinhado_objetivo, _PESO_CERTEZA[h["certeza"]], capacidade_score)

    vencedora = max(candidatas, key=score)
    for h in candidatas:
        if h["id"] != vencedora["id"]:
            conn.execute("UPDATE hipotese SET estado='sintoma', motivo_estado='rebaixada na Priorizacao' WHERE id=?",
                         (h["id"],))

    # Sec.6.6: ausencia/baixa capacidade nunca desqualifica a vencedora sozinha,
    # mas precisa ficar registrada explicitamente para a Decisao (modulo 9)
    # saber que a acao correta pode ser ampliar capacidade antes de atacar
    # o ponto de alavancagem diretamente.
    if capacidade_label == "baixa":
        capacidade_execucao_registro = "baixa (elo mais fraco: %s) - Decisao deve considerar ampliar capacidade antes de atacar diretamente" % capacidade_dimensao_fraca
    else:
        capacidade_execucao_registro = capacidade_label

    pma_id = db.new_id("pma")
    conn.execute(
        """INSERT INTO ponto_maior_alavancagem
           (id, caso_id, hipotese_id, potencial_resultado, forca_evidencia, capacidade_execucao)
           VALUES (?,?,?,?,?,?)""",
        (pma_id, caso_id, vencedora["id"], "alinhado a '%s'" % objetivo, vencedora["certeza"], capacidade_execucao_registro),
    )
    conn.execute("UPDATE hipotese SET estado='promovida' WHERE id=?", (vencedora["id"],))
    conn.execute("UPDATE caso SET estado='Ponto de maior alavancagem definido' WHERE id=?", (caso_id,))
    conn.commit()
    return pma_id


# ------------------------------------------------------------------
# 9. Decisão  (regra da Especificação da Camada de Decisão §5)
# ------------------------------------------------------------------
def decisao(conn, caso_id):
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Ponto de maior alavancagem definido":
        raise RuntimeError("Decisão chamada fora de ordem")

    pma = conn.execute("SELECT * FROM ponto_maior_alavancagem WHERE caso_id=?", (caso_id,)).fetchone()
    hipotese = conn.execute("SELECT * FROM hipotese WHERE id=?", (pma["hipotese_id"],)).fetchone()
    template = conn.execute("SELECT * FROM kb_hypothesis_template WHERE id=?", (hipotese["template_id"],)).fetchone()

    if not template["decision_pattern_id"]:
        # Camada de Decisão 5.7 - sem Decision Pattern catalogado: sinal de evolução da KB, não erro.
        conn.execute("UPDATE caso SET estado='restricao sem padrao de decisao catalogado' WHERE id=?", (caso_id,))
        conn.commit()
        return None

    dp = conn.execute("SELECT * FROM kb_decision_pattern WHERE id=?", (template["decision_pattern_id"],)).fetchone()
    exceptions = db.loads(dp["exceptions"]) or []
    if exceptions:
        pass  # v0 nao popula exceptions ativas; aqui ficaria a checagem contra o Caso

    aps = conn.execute(
        "SELECT * FROM kb_action_pattern WHERE decision_pattern_id=? ORDER BY ordem ASC", (dp["id"],)
    ).fetchall()
    primeira_acao = aps[0]

    dec_id = db.new_id("dec")
    conn.execute(
        """INSERT INTO decisao (id, caso_id, ponto_alavancagem_id, decision_pattern_id,
                                 acao_recomendada_id, alternativas_descartadas)
           VALUES (?,?,?,?,?,?)""",
        (dec_id, caso_id, pma["id"], dp["id"], primeira_acao["id"], db.dumps([])),
    )
    conn.execute("UPDATE caso SET estado='Decisao formulada' WHERE id=?", (caso_id,))
    conn.commit()
    return dec_id


# ------------------------------------------------------------------
# 10. Plano de Ação
# ------------------------------------------------------------------
def plano_acao(conn, caso_id):
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    if caso["estado"] != "Decisao formulada":
        raise RuntimeError("Plano de Ação chamado fora de ordem")

    dec = conn.execute("SELECT * FROM decisao WHERE caso_id=?", (caso_id,)).fetchone()
    aps = conn.execute(
        "SELECT * FROM kb_action_pattern WHERE decision_pattern_id=? ORDER BY ordem ASC",
        (dec["decision_pattern_id"],),
    ).fetchall()
    passos = [{"ordem": ap["ordem"], "descricao": ap["descricao"], "action_pattern_id": ap["id"]} for ap in aps]

    plano_id = db.new_id("plano")
    conn.execute("INSERT INTO plano_acao (id, caso_id, decisao_id, passos) VALUES (?,?,?,?)",
                 (plano_id, caso_id, dec["id"], db.dumps(passos)))
    conn.execute("UPDATE caso SET estado='Plano definido' WHERE id=?", (caso_id,))
    conn.commit()
    return plano_id


# ------------------------------------------------------------------
# 11. Saída - contrato de 3 resultados mutuamente exclusivos
#      (tfazzio-escopo-mvp-contrato-interface-v1.0, secao 2)
# ------------------------------------------------------------------
def saida(conn, caso_id):
    caso = conn.execute("SELECT * FROM caso WHERE id=?", (caso_id,)).fetchone()
    estado = caso["estado"]

    if estado in ("certeza insuficiente para decisao",):
        pendentes = conn.execute(
            "SELECT * FROM pergunta WHERE caso_id=? AND estado='pendente'", (caso_id,)
        ).fetchall()
        conn.execute("UPDATE caso SET estado='encerrado' WHERE id=?", (caso_id,))
        conn.commit()
        return {
            "tipo": "pergunta_pendente",
            "pergunta_mais_critica": pendentes[0]["texto"] if pendentes else None,
            "motivo": "Nenhuma hipotese atingiu certeza suficiente para decisao.",
        }

    if estado in ("sem hipotese aplicavel", "restricao sem padrao de decisao catalogado",
                  "nenhuma hipotese com certeza suficiente sobrevive"):
        conn.execute("UPDATE caso SET estado='encerrado' WHERE id=?", (caso_id,))
        conn.commit()
        return {
            "tipo": "caso_inconclusivo",
            "motivo_especifico": estado,
        }

    if estado != "Plano definido":
        raise RuntimeError("Saida chamada em estado inesperado: %s" % estado)

    plano = conn.execute("SELECT * FROM plano_acao WHERE caso_id=?", (caso_id,)).fetchone()
    dec = conn.execute("SELECT * FROM decisao WHERE id=?", (plano["decisao_id"],)).fetchone()
    pma = conn.execute("SELECT * FROM ponto_maior_alavancagem WHERE id=?", (dec["ponto_alavancagem_id"],)).fetchone()
    hipotese = conn.execute("SELECT * FROM hipotese WHERE id=?", (pma["hipotese_id"],)).fetchone()
    template = conn.execute("SELECT * FROM kb_hypothesis_template WHERE id=?", (hipotese["template_id"],)).fetchone()
    passos = db.loads(plano["passos"])
    evidencias = conn.execute("SELECT * FROM evidencia WHERE caso_id=?", (caso_id,)).fetchall()

    # --- COLETA PERGUNTAS E REFLEXÕES DA HIPÓTESE VENCEDORA ---
    perguntas_reflexoes = []
    lacunas = db.loads(hipotese["lacunas"]) or []
    for lacuna in lacunas:
        # Busca perguntas respondidas associadas a esta hipótese
        pergs = conn.execute(
            "SELECT * FROM pergunta WHERE caso_id=? AND hipotese_id=? AND lacuna=? AND estado='respondida'",
            (caso_id, hipotese["id"], lacuna)
        ).fetchall()
        for p in pergs:
            # Tenta extrair metadados do template (analogia, se_resposta_sim, se_resposta_nao)
            # Se o template tiver lacunas_tipicas com esses campos, eles estarão no JSON
            # Vamos buscar a definição da lacuna no template (se existir)
            template_lacunas = db.loads(template["lacunas_tipicas"]) or []
            meta = {}
            for tl in template_lacunas:
                if tl.get("nome") == lacuna:
                    meta = tl
                    break
            
            perguntas_reflexoes.append({
                "pergunta": p["texto"],
                "resposta": p["resposta"],
                "analogia": meta.get("analogia"),
                "se_resposta_sim": meta.get("se_resposta_sim"),
                "se_resposta_nao": meta.get("se_resposta_nao"),
                "lacuna": lacuna
            })

    # --- CORREÇÃO: Incluir respostas do empresário em evidencias_citadas ---
    evidencias_citadas = []
    for e in evidencias:
        if e["tipo"] in ("publica", "resposta_pergunta"):
            evidencias_citadas.append({
                "conteudo": e["conteudo"],
                "fonte": e["fonte"]
            })

    conn.execute("UPDATE caso SET estado='encerrado' WHERE id=?", (caso_id,))
    conn.commit()
    return {
        "tipo": "decisao_concluida",
        "constraint_dominante": template["nome"],
        "natureza": template["natureza"],
        "certeza": hipotese["certeza"],
        "decision_pattern": dec["decision_pattern_id"],
        "primeira_acao_recomendada": passos[0]["descricao"],
        "demais_acoes_do_plano": [p["descricao"] for p in passos[1:]],
        "evidencias_citadas": evidencias_citadas,
        "perguntas_e_reflexoes": perguntas_reflexoes  # <-- NOVO CAMPO
    }
