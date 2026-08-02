import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { calculateBreakEven, generateFullDiagnostic } from './src/utils/diagnosticCalculator';
import { DiagnosticFormData, EvidenceData, GooglePlacesEvidence, NewsItemEvidence } from './src/types';

async function fetchGooglePlacesEvidence(query: string): Promise<GooglePlacesEvidence> {
  if (!query) {
    return { rating: null, userRatingsTotal: null, status: 'not_found' };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { rating: null, userRatingsTotal: null, status: 'no_api_key' };
  }

  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      query
    )}&inputtype=textquery&fields=place_id,name,rating,user_ratings_total,formatted_address&key=${apiKey}`;
    const findRes = await fetch(findUrl);

    if (!findRes.ok) {
      return { rating: null, userRatingsTotal: null, status: 'error' };
    }

    const findData = await findRes.json();
    if (findData.candidates && findData.candidates.length > 0) {
      const place = findData.candidates[0];

      if (place.rating !== undefined) {
        return {
          name: place.name,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total || 0,
          address: place.formatted_address,
          status: 'success',
        };
      }

      if (place.place_id) {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,formatted_address&key=${apiKey}`;
        const detailsRes = await fetch(detailsUrl);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.result) {
            return {
              name: detailsData.result.name,
              rating: detailsData.result.rating || null,
              userRatingsTotal: detailsData.result.user_ratings_total || 0,
              address: detailsData.result.formatted_address || '',
              status: 'success',
            };
          }
        }
      }
    }

    return { rating: null, userRatingsTotal: null, status: 'not_found' };
  } catch (err: any) {
    console.warn('Google Places fetch failed:', err.message);
    return { rating: null, userRatingsTotal: null, status: 'error' };
  }
}

async function fetchNewsEvidence(query: string): Promise<NewsItemEvidence[]> {
  if (!query) return [];

  // Try SerpAPI first if key exists
  const serpApiKey = process.env.SERP_API_KEY;
  if (serpApiKey) {
    try {
      const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=nws&hl=pt-br&gl=br&api_key=${serpApiKey}`;
      const serpRes = await fetch(serpUrl);
      if (serpRes.ok) {
        const serpData = await serpRes.json();
        if (serpData.news_results && Array.isArray(serpData.news_results)) {
          return serpData.news_results.slice(0, 5).map((item: any) => ({
            title: item.title,
            source: item.source || 'Notícias',
            date: item.date || 'Recente',
            link: item.link,
            snippet: item.snippet,
          }));
        }
      }
    } catch (serpErr) {
      console.warn('SerpAPI fetch error, using Google News RSS fallback:', serpErr);
    }
  }

  // Fallback to Google News RSS
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const rssRes = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (rssRes.ok) {
      const xmlText = await rssRes.text();
      const itemRegex = /<item>[\s\S]*?<\/item>/gi;
      const matches = xmlText.match(itemRegex) || [];
      return matches.slice(0, 5).map((itemXml) => {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);

        let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1') : 'Menção na Imprensa';
        title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1') : 'Google News';

        let rawDate = pubDateMatch ? pubDateMatch[1] : '';
        let dateStr = rawDate ? new Date(rawDate).toLocaleDateString('pt-BR') : 'Recente';

        return {
          title,
          source,
          date: dateStr,
          link: linkMatch ? linkMatch[1] : '',
        };
      });
    }
  } catch (rssErr) {
    console.warn('Google News RSS parse failed:', rssErr);
  }

  return [];
}

async function getEvidenceData(companyName: string, cityState: string): Promise<EvidenceData> {
  const queryPlaces = `${companyName} ${cityState}`.trim();
  const queryNews = companyName.trim();

  const [googlePlaces, news] = await Promise.all([
    fetchGooglePlacesEvidence(queryPlaces),
    fetchNewsEvidence(queryNews),
  ]);

  return {
    googlePlaces,
    news,
    fetchedAt: new Date().toLocaleDateString('pt-BR'),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Ponto de Impacto Diagnostic API (TFAZZIO)', timestamp: new Date().toISOString() });
  });

  // API Route: CNPJ Search via BrasilAPI with CNPJ.ws fallback
  app.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
      const cleanCnpj = req.params.cnpj.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) {
        return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' });
      }

      let data: any = null;
      let source = 'brasilapi';

      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        console.warn('BrasilAPI fetch failed, trying fallback...');
      }

      // Fallback to publica.cnpj.ws
      if (!data) {
        try {
          const fallbackRes = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
          if (fallbackRes.ok) {
            const raw = await fallbackRes.json();
            source = 'cnpj.ws';
            data = {
              cnpj: cleanCnpj,
              razao_social: raw.razao_social,
              nome_fantasia: raw.estabelecimento?.nome_fantasia || raw.razao_social,
              porte: raw.porte?.descricao || 'PME',
              cnae_fiscal: raw.estabelecimento?.atividade_principal?.id,
              cnae_fiscal_descricao: raw.estabelecimento?.atividade_principal?.descricao,
              logradouro: `${raw.estabelecimento?.tipo_logradouro || ''} ${raw.estabelecimento?.logradouro || ''}`.trim(),
              municipio: raw.estabelecimento?.cidade?.nome,
              uf: raw.estabelecimento?.estado?.sigla,
              descricao_situacao_cadastral: raw.estabelecimento?.situacao_cadastral,
              capital_social: raw.capital_social,
              data_inicio_atividade: raw.estabelecimento?.data_inicio_atividade,
            };
          }
        } catch (e) {
          console.warn('Fallback CNPJ fetch failed too');
        }
      }

      if (!data) {
        return res.status(444).json({
          error: 'Não foi possível obter dados automáticos do CNPJ nas bases públicas. Você pode preencher os dados manualmente.',
        });
      }

      // Format response cleanly
      const formattedCompany = {
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social || data.nome || 'Razão Social não informada',
        nomeFantasia: data.nome_fantasia || data.fantasia || data.razao_social || 'Nome Fantasia não informado',
        porte: data.porte || 'PME',
        cnaeCodigo: String(data.cnae_fiscal || data.cnae_fiscal_principal || ''),
        cnaeDescricao: data.cnae_fiscal_descricao || data.cnae_fiscal_principal_descricao || 'Atividade principal',
        logradouro: data.logradouro || '',
        municipio: data.municipio || data.cidade || '',
        uf: data.uf || data.estado || '',
        situacaoCadastral: data.descricao_situacao_cadastral || 'Ativa',
        capitalSocial: Number(data.capital_social || 0),
        dataAbertura: data.data_inicio_atividade || data.data_abertura || '',
        source,
      };

      return res.json(formattedCompany);
    } catch (error: any) {
      console.error('Error fetching CNPJ:', error);
      return res.status(500).json({ error: 'Erro ao consultar CNPJ', details: error.message });
    }
  });

  // API Route: Google Places rating endpoint
  app.get('/api/google-places', async (req, res) => {
    try {
      const query = String(req.query.query || req.query.q || '').trim();
      const placesData = await fetchGooglePlacesEvidence(query);
      return res.json(placesData);
    } catch (err: any) {
      console.error('Error in /api/google-places:', err);
      return res.json({ rating: null, userRatingsTotal: null, status: 'error' });
    }
  });

  // API Route: Google Places parameter in path (e.g. /api/google-places/:query)
  app.get('/api/google-places/:query', async (req, res) => {
    try {
      const query = String(req.params.query || '').trim();
      const placesData = await fetchGooglePlacesEvidence(query);
      return res.json(placesData);
    } catch (err: any) {
      console.error('Error in /api/google-places/:query:', err);
      return res.json({ rating: null, userRatingsTotal: null, status: 'error' });
    }
  });

  // API Route: News Search endpoint
  app.get('/api/news', async (req, res) => {
    try {
      const query = String(req.query.query || req.query.q || '').trim();
      const news = await fetchNewsEvidence(query);
      return res.json({ news });
    } catch (err: any) {
      console.error('Error in /api/news:', err);
      return res.json({ news: [] });
    }
  });

  // API Route: Calculate Diagnostic Engine
  app.post('/api/diagnostico/calcular', async (req, res) => {
    try {
      const formData: DiagnosticFormData = req.body;
      const baseResult = generateFullDiagnostic(formData);

      const companyName = formData.companyName || formData.cnpjData?.razaoSocial || '';
      const cityState = formData.cityState || '';
      const evidence = await getEvidenceData(companyName, cityState);

      const result = {
        ...baseResult,
        evidenceData: evidence,
      };

      return res.json(result);
    } catch (error: any) {
      console.error('Error calculating diagnostic:', error);
      return res.status(500).json({ error: 'Erro ao processar diagnóstico', details: error.message });
    }
  });

  // API Route: AI Enhanced Executive Strategic Synthesis
  app.post('/api/diagnostico/ia-gerar', async (req, res) => {
    const formData: DiagnosticFormData = req.body;
    const baseResult = generateFullDiagnostic(formData);

    const companyName = formData.companyName || formData.cnpjData?.razaoSocial || '';
    const cityState = formData.cityState || '';
    
    // Fetch evidence in parallel
    const evidencePromise = getEvidenceData(companyName, cityState);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const evidence = await evidencePromise;
      return res.json({
        ...baseResult,
        evidenceData: evidence,
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const breakEven = baseResult.breakEven;
      const prompt = `
Você é um consultor empresarial executivo sênior do grupo TFAZZIO, especialista em reestruturação e aceleração de PMEs brasileiras.
Analise os dados reais do diagnóstico empresarial "Ponto de Impacto" para a seguinte empresa:

DADOS DA EMPRESA:
- Razão Social/Nome: ${formData.companyName || formData.cnpjData?.razaoSocial || 'Empresa PME'}
- CNPJ: ${formData.cnpj || 'Não informado'}
- Porte / CNAE: ${formData.cnpjData?.porte || 'PME'} - ${formData.cnpjData?.cnaeDescricao || formData.segment}
- Segmento: ${formData.segment}
- Tempo no Mercado: ${formData.timeInMarket}
- Funcionários: ${formData.employeesCount}
- Regime Tributário: ${formData.taxRegime}

DADOS FINANCEIROS & METRICAS:
- Faturamento Mensal Atual: R$ ${formData.monthlyRevenue}
- Custos Fixos Totais (com Pró-labore): R$ ${breakEven.fixedCostsTotal}
- Ponto de Equilíbrio (Break-Even): R$ ${breakEven.breakEvenRevenue} (${breakEven.breakEvenPercentage}% do faturamento)
- Margem de Contribuição: ${breakEven.contributionMarginPercent}%
- Lucro Líquido Estimado: R$ ${breakEven.estimatedNetProfit} (${breakEven.estimatedNetMarginPercent}%)
- Clientes Necessários p/ Break-Even: ${breakEven.breakEvenClientsNeeded} clientes/mês (Ticket Médio: R$ ${formData.averageTicket})

PONTUAÇÃO DAS ÁREAS (1 a 10) & GARGALOS:
- Financeiro: ${baseResult.areaScores.Financeiro.score}/10
- Comercial: ${baseResult.areaScores.Comercial.score}/10
- Operação: ${baseResult.areaScores.Operacao.score}/10
- Gestão: ${baseResult.areaScores.Gestao.score}/10
- Pessoas: ${baseResult.areaScores.Pessoas.score}/10
- Estratégia: ${baseResult.areaScores.Estrategia.score}/10

- GARGALO PRINCIPAL: ${baseResult.primaryBottleneck.name} (Nota ${baseResult.primaryBottleneck.score})
- GARGALO SECUNDÁRIO: ${baseResult.secondaryBottleneck.name} (Nota ${baseResult.secondaryBottleneck.score})

RESPOSTAS ESTRATÉGICAS:
- Funciona sem o dono 30 dias? ${formData.runsWithoutOwner30Days ? 'Sim' : 'Não'}
- Conhece a margem líquida exata? ${formData.knowsNetMargin ? 'Sim' : 'Não'}
- Possui fluxo de caixa projetado? ${formData.hasProjectedCashFlow ? 'Sim' : 'Não'}
- Possui metas e plano de crescimento? ${formData.hasGrowthGoalsAndPlan ? 'Sim' : 'Não'}
- Objetivo Principal do Empresário: "${formData.mainGoal || 'Expandir de forma estruturada'}"
- Maior Dificuldade Atual: "${formData.biggestDifficulty || 'Gargalo operacional e retenção de margem'}"

TAREFA:
Gere uma análise estratégica executiva curta, contundente e altamente personalizada para o empresário em formato JSON com o seguinte schema:
{
  "executiveSummary": "Resumo executivo de 2-3 parágrafos relacionando o momento da empresa, seu setor de atuação, a saúde financeira em relação ao Ponto de Equilíbrio e o objetivo principal informado.",
  "textualDiagnosis": "Análise detalhada humanizada (3 parágrafos) aprofundando no gargalo principal (${baseResult.primaryBottleneck.name}) e secundário (${baseResult.secondaryBottleneck.name}), demonstrando os riscos práticos e os atritos do day-to-day se nada for feito.",
  "strategicRecommendations": [
    "Recomendação tática 1 direta e pragmática",
    "Recomendação tática 2 focada em processo/tecnologia",
    "Recomendação tática 3 focada na equipe/liderança",
    "Recomendação tática 4 focada no crescimento/margem"
  ]
}

Responda APENAS em JSON válido em português do Brasil sem explicações extras.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const responseText = response.text || '';
      const evidence = await evidencePromise;

      try {
        const aiParsed = JSON.parse(responseText.trim());
        const mergedResult = {
          ...baseResult,
          executiveSummary: aiParsed.executiveSummary || baseResult.executiveSummary,
          textualDiagnosis: aiParsed.textualDiagnosis || baseResult.textualDiagnosis,
          strategicRecommendations: aiParsed.strategicRecommendations || baseResult.strategicRecommendations,
          aiGenerated: true,
          evidenceData: evidence,
        };
        return res.json(mergedResult);
      } catch (pErr) {
        console.warn('Failed to parse AI JSON output, returning base result with evidence:', pErr);
        return res.json({
          ...baseResult,
          evidenceData: evidence,
        });
      }
    } catch (aiErr: any) {
      console.error('Gemini API call failed:', aiErr);
      const evidence = await evidencePromise;
      return res.json({
        ...baseResult,
        evidenceData: evidence,
      });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server "Ponto de Impacto (TFAZZIO)" running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
