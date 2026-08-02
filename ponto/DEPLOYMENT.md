# 🚀 Guia de Deploy - Ponto de Impacto

Este documento fornece as instruções passo a passo para colocar a aplicação **Ponto de Impacto** em produção.

---

## 🛠️ Opção 1: Full-Stack na Cloud Run / Render / Railway (Recomendado)

### Backend Express + Frontend Vite Bundled

A aplicação já possui configuração nativa de build em um único servidor Express estático:

1. **Defina as Variáveis de Ambiente na Plataforma**:
   - `GEMINI_API_KEY`: Sua chave do Gemini API para análises por IA (opcional, o sistema possui algoritmo de fallback determinístico se omitida).
   - `NODE_ENV`: `production`

2. **Comando de Build**:
   ```bash
   npm run build
   ```

3. **Comando de Start**:
   ```bash
   npm start
   ```

---

## 🐍 Opção 2: Backend em Python + Flask no Render / Railway e Frontend no Vercel / GitHub Pages

Se preferir utilizar a camada backend em Python presente na pasta `/python_backend`:

### Deploy do Backend Python no Render:
1. Conecte seu repositório no [Render](https://render.com).
2. Escolha **Web Service** e selecione a pasta `/python_backend`.
3. Configure:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
   - **Environment Variables**:
     - `GEMINI_API_KEY`: (opcional)

### Deploy do Frontend no Vercel / GitHub Pages:
1. No [Vercel](https://vercel.com), importe o repositório.
2. Defina a variável de ambiente:
   - `VITE_API_URL`: URL do seu backend Python hospedado no Render.
3. Clique em **Deploy**.

---

## 📋 Checklist de Funcionalidades
- [x] Integração automática de CNPJ via **BrasilAPI** com fallback
- [x] Cálculo do **Índice de Clareza** (0 a 100)
- [x] Identificação de **Gargalo Principal e Secundário**
- [x] Cálculo do **Ponto de Equilíbrio (Break-Even)** e Margem de Segurança
- [x] **Plano de Ação de 90 Dias** em 3 fases táticas de 30 dias
- [x] **Gráficos Visuais**: Radar Chart (Recharts) e Mapa de Calor
- [x] Exportação de **Relatório em PDF**
