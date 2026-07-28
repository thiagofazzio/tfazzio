PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS caso (
    id                          TEXT PRIMARY KEY,
    timestamp_abertura          TEXT,
    versao_motor                TEXT,
    versao_kb                   TEXT,
    estado                      TEXT,
    cnpj                        TEXT,
    modelo_receita_percebido    TEXT,
    objetivo_empresarial        TEXT
);

CREATE TABLE IF NOT EXISTS empresa (
    id                  TEXT PRIMARY KEY,
    caso_id             TEXT,
    setor               TEXT,
    porte               TEXT,
    idade_anos          INTEGER,
    localizacao         TEXT,
    business_models     TEXT,
    revenue_models      TEXT,
    capacidade          TEXT,
    estado_normalizacao TEXT
);

CREATE TABLE IF NOT EXISTS evidencia (
    id              TEXT PRIMARY KEY,
    caso_id         TEXT,
    conteudo        TEXT,
    fonte           TEXT,
    data_coleta     TEXT,
    confiabilidade  TEXT,
    tipo            TEXT,
    verificada      INTEGER,
    hipotese_id     TEXT
);

CREATE TABLE IF NOT EXISTS pergunta (
    id          TEXT PRIMARY KEY,
    caso_id     TEXT,
    hipotese_id TEXT,
    tipo        TEXT,
    lacuna      TEXT,
    texto       TEXT,
    estado      TEXT,
    resposta    TEXT
);

CREATE TABLE IF NOT EXISTS contexto (
    id                      TEXT PRIMARY KEY,
    caso_id                 TEXT,
    modelo_negocio          TEXT,
    mecanismo_receita       TEXT,
    estagio_empresa         TEXT,
    dependencia_fundador    TEXT,
    evidencias_sustentacao  TEXT
);

CREATE TABLE IF NOT EXISTS sistema_valor (
    id          TEXT PRIMARY KEY,
    caso_id     TEXT,
    estagios    TEXT
);

CREATE TABLE IF NOT EXISTS hipotese (
    id                      TEXT PRIMARY KEY,
    caso_id                 TEXT,
    template_id             TEXT,
    natureza                TEXT,
    estado                  TEXT,
    motivo_estado           TEXT,
    lacunas                 TEXT,
    certeza                 TEXT,
    certeza_justificativa   TEXT
);

CREATE TABLE IF NOT EXISTS ponto_maior_alavancagem (
    id                  TEXT PRIMARY KEY,
    caso_id             TEXT,
    hipotese_id         TEXT,
    potencial_resultado TEXT,
    forca_evidencia     TEXT,
    capacidade_execucao TEXT
);

CREATE TABLE IF NOT EXISTS decisao (
    id                          TEXT PRIMARY KEY,
    caso_id                     TEXT,
    ponto_alavancagem_id        TEXT,
    decision_pattern_id         TEXT,
    acao_recomendada_id         TEXT,
    alternativas_descartadas    TEXT
);

CREATE TABLE IF NOT EXISTS plano_acao (
    id          TEXT PRIMARY KEY,
    caso_id     TEXT,
    decisao_id  TEXT,
    passos      TEXT
);

CREATE TABLE IF NOT EXISTS kb_hypothesis_template (
    id                          TEXT PRIMARY KEY,
    nome                        TEXT,
    natureza                    TEXT,
    tipo                        TEXT,
    condition_of_applicability  TEXT,
    evidence_patterns           TEXT,
    lacunas_tipicas             TEXT,
    decision_pattern_id         TEXT,
    familia_pai_id              TEXT,
    dimensao_capacidade         TEXT,
    hipoteses_concorrentes      TEXT
);

CREATE TABLE IF NOT EXISTS kb_decision_pattern (
    id          TEXT PRIMARY KEY,
    nome        TEXT,
    descricao   TEXT,
    exceptions  TEXT
);

CREATE TABLE IF NOT EXISTS kb_action_pattern (
    id                      TEXT PRIMARY KEY,
    decision_pattern_id     TEXT,
    ordem                   INTEGER,
    descricao               TEXT
);
