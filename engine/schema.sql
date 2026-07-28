-- TFAZZIO Intelligence Engine — Schema v0 (versão consolidada mais recente)
-- Mapeia 1:1 a Estrutura de Planilha MVP (12 tabelas + extensões de protótipo).
-- Metade "Caso" (execução), metade "Knowledge Base" (conhecimento reutilizável).

PRAGMA foreign_keys = ON;

-- ============================================================
-- CAMADA CASO (transitória, por execução do motor)
-- ============================================================

CREATE TABLE caso (
    id                          TEXT PRIMARY KEY,
    timestamp_abertura          TEXT NOT NULL,
    versao_motor                TEXT NOT NULL,
    versao_kb                   TEXT NOT NULL,
    estado                      TEXT NOT NULL,   -- ver Contratos do Pipeline, seção 0
    cnpj                        TEXT NOT NULL,
    modelo_receita_percebido    TEXT NOT NULL,
    objetivo_empresarial        TEXT NOT NULL
);

CREATE TABLE empresa (
    id                  TEXT PRIMARY KEY,
    caso_id             TEXT NOT NULL REFERENCES caso(id),
    -- atributos normalizados (Contratos do Pipeline, módulo 3)
    setor               TEXT,
    porte               TEXT,
    idade_anos          INTEGER,
    localizacao         TEXT,
    business_models     TEXT,   -- JSON list (uma empresa pode ter mais de um, ver KB spec §2)
    revenue_models      TEXT,   -- JSON list
    capacidade          TEXT,   -- JSON: {"caixa":"baixa|media|alta","recursos_humanos":"baixa|media|alta","tempo_fundador":"baixa|media|alta", ...} (Arq. Logica v1.2, objeto 3.5)
    estado_normalizacao TEXT NOT NULL DEFAULT 'pendente'  -- pendente|concluida
);

CREATE TABLE evidencia (
    id                  TEXT PRIMARY KEY,
    caso_id             TEXT NOT NULL REFERENCES caso(id),
    conteudo            TEXT NOT NULL,
    fonte               TEXT NOT NULL,
    data_coleta         TEXT NOT NULL,
    confiabilidade      TEXT NOT NULL,   -- alta|media|baixa (Manual de Extração §9)
    tipo                TEXT NOT NULL,   -- 'percepcao_declarada' | 'publica' | 'resposta_pergunta'
    verificada          INTEGER NOT NULL DEFAULT 0,
    hipotese_id         TEXT REFERENCES hipotese(id)  -- pode ser NULL antes de associada
);

CREATE TABLE contexto (
    id                          TEXT PRIMARY KEY,
    caso_id                     TEXT NOT NULL REFERENCES caso(id),
    modelo_negocio              TEXT,   -- pode ser "misto"
    mecanismo_receita           TEXT,   -- pode ser "indeterminado"
    estagio_empresa             TEXT,   -- pode ser "hibrido/atipico"
    dependencia_fundador        TEXT,
    evidencias_sustentacao      TEXT NOT NULL   -- JSON list de evidencia.id
);

CREATE TABLE sistema_valor (
    id              TEXT PRIMARY KEY,
    caso_id         TEXT NOT NULL REFERENCES caso(id),
    estagios        TEXT NOT NULL   -- JSON list ordenada de atividades
);

CREATE TABLE hipotese (
    id                      TEXT PRIMARY KEY,
    caso_id                 TEXT NOT NULL REFERENCES caso(id),
    template_id             TEXT REFERENCES kb_hypothesis_template(id),
    natureza                TEXT NOT NULL,  -- restricao|oportunidade|risco|decisao_estrutural
    estado                  TEXT NOT NULL,  -- ativa|descartada|bloqueada|promovida|sintoma
    motivo_estado           TEXT,
    lacunas                 TEXT NOT NULL,  -- JSON list
    certeza                 TEXT,           -- Indicio|Plausivel|Provavel|Confirmada
    certeza_justificativa   TEXT
);

CREATE TABLE pergunta (
    id              TEXT PRIMARY KEY,
    caso_id         TEXT NOT NULL REFERENCES caso(id),
    hipotese_id     TEXT REFERENCES hipotese(id),  -- NULL para pergunta de calibracao (Arq. Diagnostico Sec.5)
    tipo            TEXT NOT NULL DEFAULT 'lacuna',  -- 'calibracao' | 'lacuna'
    lacuna          TEXT NOT NULL,
    texto           TEXT NOT NULL,
    estado          TEXT NOT NULL,  -- pendente|respondida
    resposta        TEXT
);

CREATE TABLE ponto_maior_alavancagem (
    id                  TEXT PRIMARY KEY,
    caso_id             TEXT NOT NULL REFERENCES caso(id),
    hipotese_id         TEXT NOT NULL REFERENCES hipotese(id),
    potencial_resultado TEXT NOT NULL,
    forca_evidencia     TEXT NOT NULL,
    capacidade_execucao TEXT NOT NULL
);

CREATE TABLE decisao (
    id                          TEXT PRIMARY KEY,
    caso_id                     TEXT NOT NULL REFERENCES caso(id),
    ponto_alavancagem_id        TEXT NOT NULL REFERENCES ponto_maior_alavancagem(id),
    decision_pattern_id         TEXT REFERENCES kb_decision_pattern(id),
    acao_recomendada_id         TEXT REFERENCES kb_action_pattern(id),
    alternativas_descartadas    TEXT NOT NULL   -- JSON list [{alternativa, motivo}]
);

CREATE TABLE plano_acao (
    id              TEXT PRIMARY KEY,
    caso_id         TEXT NOT NULL REFERENCES caso(id),
    decisao_id      TEXT NOT NULL REFERENCES decisao(id),
    passos          TEXT NOT NULL   -- JSON list ordenada [{ordem, descricao, action_pattern_id}]
);

-- ============================================================
-- CAMADA KNOWLEDGE BASE (reutilizável, curada, versão própria)
-- ============================================================

CREATE TABLE kb_hypothesis_template (
    id                          TEXT PRIMARY KEY,
    nome                        TEXT NOT NULL,
    natureza                    TEXT NOT NULL,
    condition_of_applicability  TEXT NOT NULL,  -- JSON: {"business_model": [...], "revenue_model": [...]}
    signals                     TEXT NOT NULL,  -- JSON list de nomes de Signal
    evidence_patterns           TEXT NOT NULL,  -- JSON list [{tipo, descricao, fecha_por}]
    lacunas_tipicas             TEXT NOT NULL,  -- JSON list [{nome, classe: publica|pergunta, pergunta_canonica}]
    decision_pattern_id         TEXT REFERENCES kb_decision_pattern(id),
    status                      TEXT NOT NULL DEFAULT 'Teste',  -- Teste|Oficial (Manual Extração/Validação)

    -- === Extensão protótipo "camadas / família / concorrência / gate" ===
    camada                      TEXT,                     -- ex: 'comercial','operacao','financeiro','gestao','objetivo','escala'
    tipo                        TEXT NOT NULL DEFAULT 'diagnostica',
                                 -- 'diagnostica' (hipotese normal) | 'familia_pai' | 'familia_filha' | 'gate'
    familia_pai_id              TEXT REFERENCES kb_hypothesis_template(id),
                                 -- preenchido só em filhas: aponta para o template pai da familia
    dimensao_capacidade         TEXT,
                                 -- só em filhas de familia: qual dimensao de capacidade ela representa
                                 -- (deve bater com uma chave em empresa.capacidade, ex: 'caixa','comercial')
    hipoteses_concorrentes      TEXT NOT NULL DEFAULT '[]'
                                 -- JSON list de kb_hypothesis_template.id mutuamente exclusivos com este
);

CREATE TABLE kb_decision_pattern (
    id                          TEXT PRIMARY KEY,
    descricao_decisao           TEXT NOT NULL,
    constraint_associada        TEXT NOT NULL,  -- referencia natureza/nome da hipótese-template
    condition_of_applicability  TEXT NOT NULL,  -- JSON
    exceptions                  TEXT NOT NULL DEFAULT '[]',  -- JSON list
    status                      TEXT NOT NULL DEFAULT 'Teste'
);

CREATE TABLE kb_action_pattern (
    id                      TEXT PRIMARY KEY,
    decision_pattern_id     TEXT NOT NULL REFERENCES kb_decision_pattern(id),
    ordem                   INTEGER NOT NULL,
    descricao               TEXT NOT NULL,
    erros_classicos_evitados TEXT NOT NULL DEFAULT '[]',  -- JSON list
    status                  TEXT NOT NULL DEFAULT 'Teste'
);
