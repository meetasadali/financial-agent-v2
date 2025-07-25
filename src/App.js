import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    LucideNewspaper, LucideTrendingUp, LucideTrendingDown, LucideCircleDot, 
    LucidePlay, LucidePause, LucideSearch, LucideLoader2, LucideAlertTriangle, 
    LucideWallet, LucidePlusCircle, LucideTrash2, LucideLightbulb, LucideKeyRound,
    LucideBrainCircuit, LucideBot, LucideShieldCheck, LucideShieldAlert,
    LucideDownload, LucideUpload, LucidePencil, LucideSave, LucideXCircle, LucideTarget,
    LucideGauge, LucideSparkles
} from 'lucide-react';

// --- Helper Components ---

const Badge = ({ children, className }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
    {children}
  </span>
);

const IconButton = ({ icon: Icon, onClick, children, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center px-4 py-2 font-semibold text-white transition-colors duration-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    <Icon className="w-5 h-5 mr-2" />
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden ${className}`}>
        {children}
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- API Helper ---
const fetchWithRetry = async (url, options, maxRetries = 3, setError) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, options);
        if (response.ok) {
            return response.json();
        }
        if (response.status === 429 && attempt < maxRetries - 1) {
            const retryDelay = 5000 * Math.pow(2, attempt);
            const message = `Rate limit hit. Retrying in ${retryDelay / 1000} seconds...`;
            console.log(message);
            if (setError) setError(message);
            // eslint-disable-next-line no-loop-func
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
            throw new Error(`API call failed: ${response.status}`);
        }
    }
    throw new Error(`API call failed after ${maxRetries} retries.`);
};

const extractJson = (text, type = 'object') => {
    if (!text || typeof text !== 'string') return null;
    const pattern = type === 'array' ? /\[.*\]/s : /\{.*\}/s;
    const match = text.match(pattern);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            console.error("Failed to parse extracted JSON:", e);
            console.error("Original text:", text);
            return null;
        }
    }
    return null;
};


// --- Main Application Component ---

const App = () => {
  // --- ⬇️ PASTE YOUR DEFAULT API KEYS HERE ⬇️ ---
  const DEFAULT_GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
  const DEFAULT_CHATGPT_API_KEY = "YOUR_CHATGPT_API_KEY";
  const DEFAULT_COHERE_API_KEY = "YOUR_COHERE_API_KEY";
  const DEFAULT_FMP_API_KEY = "YOUR_FMP_API_KEY"; // Financial Modeling Prep Key
  // --- ⬆️ PASTE YOUR DEFAULT API KEYS HERE ⬆️ ---

  // Agent State
  const [isRunning, setIsRunning] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(DEFAULT_GEMINI_API_KEY);
  const [chatGptApiKey, setChatGptApiKey] = useState(DEFAULT_CHATGPT_API_KEY);
  const [cohereApiKey, setCohereApiKey] = useState(DEFAULT_COHERE_API_KEY);
  const [fmpApiKey, setFmpApiKey] = useState(DEFAULT_FMP_API_KEY);
  const [keywords, setKeywords] = useState('US stocks, interest rate, inflation, acquisition');
  const [sector, setSector] = useState('Technology');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioPrices, setPortfolioPrices] = useState({});
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [editingTicker, setEditingTicker] = useState(null);
  const [editingShares, setEditingShares] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [portfolioReview, setPortfolioReview] = useState('');
  const [loadingReview, setLoadingReview] = useState(false);

  // Market Sentiment State
  const [marketSentiment, setMarketSentiment] = useState(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);


  // Recommendation State
  const [geminiRec, setGeminiRec] = useState([]);
  const [analystRec, setAnalystRec] = useState([]);
  const [chatGptRec, setChatGptRec] = useState([]);
  const [cohereRec, setCohereRec] = useState([]);
  const [loadingGeminiRec, setLoadingGeminiRec] = useState(false);
  const [loadingAnalystRec, setLoadingAnalystRec] = useState(false);
  const [loadingChatGptRec, setLoadingChatGptRec] = useState(false);
  const [loadingCohereRec, setLoadingCohereRec] = useState(false);

  const newsIntervalRef = useRef(null);
  const pricesIntervalRef = useRef(null);
  const recommendationIntervalRef = useRef(null);
  const sentimentIntervalRef = useRef(null);
  const fileInputRef = useRef(null);


  const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary', 'Industrials', 'Energy', 'All'];

  useEffect(() => {
    try {
      const savedPortfolio = localStorage.getItem('financialAgentPortfolio');
      if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio));
      
      setGeminiApiKey(localStorage.getItem('geminiApiKey') || DEFAULT_GEMINI_API_KEY);
      setChatGptApiKey(localStorage.getItem('chatGptApiKey') || DEFAULT_CHATGPT_API_KEY);
      setCohereApiKey(localStorage.getItem('cohereApiKey') || DEFAULT_COHERE_API_KEY);
      setFmpApiKey(localStorage.getItem('fmpApiKey') || DEFAULT_FMP_API_KEY);

    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
  }, []);

  const handleGeminiApiKeyChange = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };
  
  const handleChatGptApiKeyChange = (key) => {
    setChatGptApiKey(key);
    localStorage.setItem('chatGptApiKey', key);
  };
  
  const handleCohereApiKeyChange = (key) => {
    setCohereApiKey(key);
    localStorage.setItem('cohereApiKey', key);
  };

  const handleFmpApiKeyChange = (key) => {
    setFmpApiKey(key);
    localStorage.setItem('fmpApiKey', key);
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'Positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };
  
  const getRecommendationColor = (rec) => {
    switch (rec) {
      case 'Buy':
      case 'Buy New':
      case 'Add More':
        return 'bg-green-500 text-white';
      case 'Sell': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-gray-200 text-gray-800';
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('low')) return 'bg-green-100 text-green-800';
    if (riskLower.includes('moderate')) return 'bg-yellow-100 text-yellow-800';
    if (riskLower.includes('high')) return 'bg-red-100 text-red-800';
    return 'bg-gray-200 text-gray-800';
  }

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'text-gray-500';
    const sentimentLower = sentiment.toLowerCase();
    if (sentimentLower.includes('bullish')) return 'text-green-500';
    if (sentimentLower.includes('bearish')) return 'text-red-500';
    return 'text-yellow-500';
  }

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'Positive': return <LucideTrendingUp className="w-5 h-5 text-green-500" />;
      case 'Negative': return <LucideTrendingDown className="w-5 h-5 text-red-500" />;
      default: return <LucideCircleDot className="w-5 h-5 text-yellow-500" />;
    }
  };
  
  const handleApiError = (error, context) => {
      console.error(`Error in ${context}:`, error);
      if (String(error.message).includes("400")) {
        setError(`API call failed (400 Bad Request) for ${context}. This may be due to an invalid API key format. Please check your keys.`);
      } else if (String(error.message).includes("401")) {
        setError(`API call failed (401 Unauthorized) for ${context}. Please check your API Key and permissions.`);
      } else if (String(error.message).includes("429")) {
        setError(`Rate limit exceeded for ${context}. Please check your API plan or try again later.`);
      } else if (String(error.message).includes("503")) {
        setError(`The ${context} service is temporarily unavailable (503). Please try again in a few moments.`);
      }
      else {
        setError(error.message);
      }
  }

  const fetchWithGeminiFallback = useCallback(async (geminiPrompt, coherePrompt, context) => {
      try {
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const geminiPayload = { contents: [{ role: "user", parts: [{ text: geminiPrompt }] }], generationConfig: { responseMimeType: "application/json" } };
        const result = await fetchWithRetry(geminiApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) }, 2, setError);
        return result.candidates[0].content.parts[0].text;
      } catch (err) {
          if (String(err.message).includes("429") && cohereApiKey) {
              console.log(`Gemini rate limit hit for ${context}. Falling back to Cohere.`);
              setError(`Gemini rate limit hit for ${context}. Falling back to Cohere...`);
              const cohereApiUrl = 'https://api.cohere.ai/v1/chat';
              const coherePayload = { message: coherePrompt, connectors: [{"id": "web-search"}] };
              const cohereHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cohereApiKey}` };
              const cohereResult = await fetchWithRetry(cohereApiUrl, { method: 'POST', headers: cohereHeaders, body: JSON.stringify(coherePayload) }, 3, setError);
              setError(null);
              return cohereResult.text;
          } else {
              throw err;
          }
      }
  }, [geminiApiKey, cohereApiKey]);

  const fetchAndAnalyzeNews = useCallback(async () => {
    if (!geminiApiKey) {
      setError("Gemini API Key is missing. Please add it in the configuration panel.");
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const portfolioTickers = portfolio.map(p => p.ticker).join(', ');
      
      const prompt = `First, for each of the following tickers: ${portfolioTickers || 'none'}, find the single most recent and relevant news event. Then, find additional significant financial news related to these general keywords: ${keywords}, to make a total of 5-7 events. For each news item, return a JSON object. The JSON array must contain objects with these keys: "headline", "source", "summary", "impact" ('Positive', 'Negative', 'Neutral'), "affected_stocks" (array of tickers), "published_at" (ISO string), "recommendation" ('Buy', 'Sell', 'Hold'), "reason" (a brief one-sentence explanation), "suggested_shares" (integer, e.g., 100), and "risk_level" ('Low Risk', 'Moderate Risk', 'High Risk'). Ensure valid JSON format.`;
      
      const rawText = await fetchWithGeminiFallback(prompt, prompt, "News Feed");
      const newEvents = extractJson(rawText, 'array');

      if (newEvents && Array.isArray(newEvents)) {
          setEvents(prev => [...newEvents, ...prev].filter((v,i,a)=>a.findIndex(t=>(t.headline === v.headline))===i).sort((a,b) => new Date(b.published_at) - new Date(a.published_at)));
          setLastUpdated(new Date());
          return newEvents;
      } else {
          throw new Error("Could not find a valid JSON array in the AI response for News Feed.");
      }
    } catch (err) {
      handleApiError(err, 'News Feed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [keywords, portfolio, geminiApiKey, fetchWithGeminiFallback]);
  
  const fetchAllStockPrices = useCallback(async (tickers) => {
    if (tickers.length === 0 || !fmpApiKey) {
        if(!fmpApiKey && tickers.length > 0) setError("Financial Modeling Prep API Key is missing for price data.");
        return;
    }
    setLoadingPrices(true);
    try {
        const tickerString = tickers.join(',');
        const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${tickerString}?apikey=${fmpApiKey}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && Array.isArray(data)) {
            const newPrices = {};
            data.forEach(quote => {
                newPrices[quote.symbol] = {
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changesPercentage
                };
            });
            setPortfolioPrices(currentPrices => ({...currentPrices, ...newPrices}));
        } else {
            console.warn("No price data returned from FMP API. Response:", data);
        }
    } catch (err) {
        console.error("Error fetching portfolio prices from FMP:", err);
        handleApiError(err, "Portfolio Prices");
    } finally {
        setLoadingPrices(false);
    }
  }, [fmpApiKey]);

  const fetchRecommendations = useCallback(async (modelType) => {
    if (modelType === 'chatgpt' && !chatGptApiKey) {
        setError("ChatGPT API Key is missing.");
        return;
    };
    if (modelType === 'cohere' && !cohereApiKey) {
        setError("Cohere API Key is missing.");
        return;
    };
    if ((modelType === 'gemini' || modelType === 'analyst') && !geminiApiKey) {
        setError("Gemini API Key is missing.");
        return;
    };

    if (modelType === 'gemini') setLoadingGeminiRec(true);
    else if (modelType === 'analyst') setLoadingAnalystRec(true);
    else if (modelType === 'chatgpt') setLoadingChatGptRec(true);
    else setLoadingCohereRec(true);
    
    setError(null);

    try {
        const portfolioString = portfolio.map(p => `${p.shares} shares of ${p.ticker}`).join(', ');
        const newsHeadlines = events.slice(0, 5).map(e => e.headline).join('; ');
        
        let apiUrl, payload, headers;
        
        const basePrompt = `Based on the user's current portfolio (${portfolioString || 'empty'}) and recent news ("${newsHeadlines || 'none'}"), suggest 2-3 stocks to buy or add to. Include 'cheap' or 'undervalued' stocks. For each, provide a JSON object with keys: "ticker", "action" ('Buy New' or 'Add More'), "reason", "prospect", "risk", "suggested_shares" (integer), "risk_level" ('Low Risk', 'Moderate Risk', 'High Risk'), "share_price" (current price as a number), and "limit_price" (suggested buy limit as a number). Ensure that "share_price" is always included as a numeric value, even if approximate.`

        if (modelType === 'chatgpt') {
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            const prompt = `You are a helpful financial assistant. ${basePrompt} Return a valid JSON object with a single key "ideas" that contains an array of these objects.`;
            payload = {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                response_format: { "type": "json_object" }
            };
            headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chatGptApiKey}` };

            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers, body: JSON.stringify(payload) }, 3, setError);
            const recommendations = JSON.parse(result.choices[0].message.content).ideas;
            setChatGptRec(recommendations);

        } else if (modelType === 'cohere') {
            apiUrl = 'https://api.cohere.ai/v1/chat';
            const prompt = `You are a helpful financial assistant. ${basePrompt} Return ONLY a valid JSON array of these objects, without any surrounding text or markdown.`;
            payload = {
                message: prompt,
                connectors: [{"id": "web-search"}]
            };
            headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cohereApiKey}` };
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers, body: JSON.stringify(payload) }, 3, setError);
            const recommendations = JSON.parse(result.text);
            setCohereRec(recommendations);

        } else { // Gemini or Analyst
            const persona = modelType === 'gemini' 
                ? "You are a sophisticated financial analyst AI, known for your data-driven and balanced insights."
                : "You are an aggressive, growth-oriented financial analyst AI, always looking for high-potential, disruptive opportunities.";
            const prompt = `${persona} ${basePrompt} Return a valid JSON array of these objects.`;
            
            const rawText = await fetchWithGeminiFallback(prompt, prompt, `${modelType} Recommendations`);
            const recommendations = extractJson(rawText, 'array');

            if (recommendations) {
                if (modelType === 'gemini') setGeminiRec(recommendations);
                else setAnalystRec(recommendations);
            } else {
                throw new Error("Could not find a valid JSON array in the AI recommendation response.");
            }
        }

    } catch (err) {
        handleApiError(err, `${modelType} Recommendations`);
    } finally {
        if (modelType === 'gemini') setLoadingGeminiRec(false);
        else if (modelType === 'analyst') setLoadingAnalystRec(false);
        else if (modelType === 'chatgpt') setLoadingChatGptRec(false);
        else setLoadingCohereRec(false);
    }
  }, [geminiApiKey, chatGptApiKey, cohereApiKey, portfolio, events, fetchWithGeminiFallback]);

  const fetchMarketSentiment = useCallback(async (currentEvents) => {
    if (!geminiApiKey) return;
    setLoadingSentiment(true);
    try {
        const newsHeadlines = (currentEvents || events).slice(0, 10).map(e => e.headline).join('; ');
        if (!newsHeadlines) {
            setLoadingSentiment(false);
            return;
        };

        const prompt = `Based on the following recent news headlines, determine the overall market sentiment. The headlines are: "${newsHeadlines}". Return a JSON object with two keys: "sentiment" (either 'Bullish', 'Bearish', 'Neutral') and "reason" (a brief, one-sentence explanation for the sentiment).`;
        
        const rawText = await fetchWithGeminiFallback(prompt, prompt, "Market Sentiment");
        const sentimentData = extractJson(rawText, 'object');
        
        if (sentimentData) {
            setMarketSentiment(sentimentData);
        }
    } catch (err) {
        console.error("Error fetching market sentiment:", err);
    } finally {
        setLoadingSentiment(false);
    }
  }, [geminiApiKey, events, fetchWithGeminiFallback]);

  const fetchPortfolioReview = useCallback(async () => {
    if (!geminiApiKey || portfolio.length === 0) {
        setError("Please add stocks to your portfolio to get a review.");
        return;
    }
    setLoadingReview(true);
    setIsReviewModalOpen(true);
    try {
        const portfolioString = portfolio.map(p => `${p.shares} shares of ${p.ticker}`).join(', ');
        const prompt = `Analyze the following stock portfolio: ${portfolioString}. Provide a comprehensive review covering: 1. Sector concentration and diversification. 2. Overall risk assessment. 3. Potential strengths and weaknesses. Format the response as a single string of text with paragraphs separated by newline characters (\\n).`;
        
        const rawText = await fetchWithGeminiFallback(prompt, prompt, "Portfolio Review");
        setPortfolioReview(rawText);

    } catch (err) {
        handleApiError(err, "Portfolio Review");
    } finally {
        setLoadingReview(false);
    }
  }, [geminiApiKey, cohereApiKey, portfolio, fetchWithGeminiFallback]);
  
  const allPotentialBuys = useMemo(() => {
    const buys = [];
    
    // From News Feed
    if(Array.isArray(events)) {
        events.forEach(e => {
            if (e && (e.recommendation === 'Buy' || e.recommendation === 'Buy New') && e.affected_stocks && e.affected_stocks.length > 0) {
                const ticker = e.affected_stocks[0];
                buys.push({
                    ticker: ticker,
                    reason: e.reason,
                    suggested_shares: e.suggested_shares,
                    risk_level: e.risk_level,
                    source: 'News Feed',
                    share_price: e.share_price,
                    limit_price: e.limit_price,
                    action: e.recommendation
                });
            }
        });
    }

    // From Idea Generators
    const ideaSources = [
        { data: geminiRec, source: 'Gemini' },
        { data: analystRec, source: 'Analyst AI' },
        { data: chatGptRec, source: 'ChatGPT' },
        { data: cohereRec, source: 'Cohere' },
    ];

    ideaSources.forEach(source => {
        if(Array.isArray(source.data)) {
            source.data.forEach(rec => {
                if (rec && (rec.action === 'Buy New' || rec.action === 'Add More')) {
                    buys.push({
                        ticker: rec.ticker,
                        reason: rec.reason,
                        suggested_shares: rec.suggested_shares,
                        risk_level: rec.risk_level,
                        source: source.source,
                        share_price: rec.share_price,
                        limit_price: rec.limit_price,
                        action: rec.action
                    });
                }
            });
        }
    });

    // Remove duplicates, keeping the first one found
    const uniqueBuys = buys.filter((buy, index, self) =>
        buy && buy.ticker && index === self.findIndex((b) => (
            b && b.ticker === buy.ticker
        ))
    );

    return uniqueBuys;
  }, [events, geminiRec, analystRec, chatGptRec, cohereRec]);
  
  const allTickers = useMemo(() => {
    const tickersInPortfolio = portfolio.map(p => p.ticker);
    const tickersInBuys = allPotentialBuys.map(b => b.ticker);
    return Array.from(new Set([...tickersInPortfolio, ...tickersInBuys]));
  }, [portfolio, allPotentialBuys]);

  useEffect(() => {
    const startAgent = async () => {
      const delay = ms => new Promise(res => setTimeout(res, ms));

      const newEvents = await fetchAndAnalyzeNews();
      if (newEvents && newEvents.length > 0) {
        await fetchMarketSentiment(newEvents);
      }
      
      await delay(1000);
      fetchRecommendations('gemini');
      
      await delay(1000);
      fetchRecommendations('analyst');

      newsIntervalRef.current = setInterval(fetchAndAnalyzeNews, 60 * 60 * 1000);
      recommendationIntervalRef.current = setInterval(() => {
        fetchRecommendations('gemini');
        fetchRecommendations('analyst');
      }, 3 * 60 * 60 * 1000);
      sentimentIntervalRef.current = setInterval(fetchMarketSentiment, 5 * 60 * 1000);
    };

    if (isRunning) {
      startAgent();
    } else {
      clearInterval(newsIntervalRef.current);
      clearInterval(recommendationIntervalRef.current);
      clearInterval(sentimentIntervalRef.current);
    }

    return () => {
      clearInterval(newsIntervalRef.current);
      clearInterval(recommendationIntervalRef.current);
      clearInterval(sentimentIntervalRef.current);
    };
  }, [isRunning, fetchAndAnalyzeNews, fetchRecommendations, fetchMarketSentiment]);
  
  useEffect(() => {
    if (allTickers.length > 0) {
        fetchAllStockPrices(allTickers);
        pricesIntervalRef.current = setInterval(() => fetchAllStockPrices(allTickers), 120 * 1000);
    }
    return () => clearInterval(pricesIntervalRef.current);
  }, [allTickers, fetchAllStockPrices]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
    if (!isRunning) setError(null);
  };

  const openEventModal = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newTicker || !newShares || isNaN(parseFloat(newShares))) return;
    const newStock = { ticker: newTicker.toUpperCase().trim(), shares: parseFloat(newShares) };
    
    setPortfolio(prevPortfolio => {
        const existingStockIndex = prevPortfolio.findIndex(s => s.ticker === newStock.ticker);
        if (existingStockIndex > -1) {
            const updatedPortfolio = [...prevPortfolio];
            updatedPortfolio[existingStockIndex].shares += newStock.shares;
            return updatedPortfolio;
        }
        return [...prevPortfolio, newStock];
    });

    setNewTicker('');
    setNewShares('');
  };

  const handleEditClick = (stock) => {
    setEditingTicker(stock.ticker);
    setEditingShares(stock.shares);
  };
  
  const handleCancelEdit = () => {
    setEditingTicker(null);
    setEditingShares('');
  };

  const handleSaveEdit = (ticker) => {
    const newSharesValue = parseFloat(editingShares);
    if (isNaN(newSharesValue) || newSharesValue < 0) {
        setError("Please enter a valid number of shares.");
        return;
    }
    const updatedPortfolio = portfolio.map(stock => 
        stock.ticker === ticker ? { ...stock, shares: newSharesValue } : stock
    );
    setPortfolio(updatedPortfolio);
    localStorage.setItem('financialAgentPortfolio', JSON.stringify(updatedPortfolio));
    handleCancelEdit();
  };


  const handleRemoveStock = (tickerToRemove) => {
    setPortfolio(portfolio.filter(p => p.ticker !== tickerToRemove));
    setPortfolioPrices(prevPrices => {
        const newPrices = {...prevPrices};
        delete newPrices[tickerToRemove];
        return newPrices;
    });
  };

  const handleExport = () => {
    if (portfolio.length === 0) {
      setError("Portfolio is empty. Nothing to export.");
      return;
    }
    const header = "ticker,shares\n";
    const csvContent = portfolio.map(p => `${p.ticker},${p.shares}`).join("\n");
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "portfolio.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const header = lines.shift().toLowerCase().split(',').map(h => h.trim());
        const tickerIndex = header.indexOf('ticker');
        const sharesIndex = header.indexOf('shares');

        if (tickerIndex === -1 || sharesIndex === -1) {
          throw new Error("CSV must have 'ticker' and 'shares' columns.");
        }

        const newPortfolio = lines.map(line => {
          const values = line.split(',');
          const ticker = values[tickerIndex]?.trim().toUpperCase();
          const shares = parseFloat(values[sharesIndex]?.trim());
          if (ticker && !isNaN(shares)) {
            return { ticker, shares };
          }
          return null;
        }).filter(Boolean); // Filter out any null entries from malformed lines

        setPortfolio(newPortfolio);
        localStorage.setItem('financialAgentPortfolio', JSON.stringify(newPortfolio));
      } catch (err) {
        setError(`Failed to import CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };
  
  const totalPortfolioValue = useMemo(() => {
    return portfolio.reduce((total, stock) => {
      const price = portfolioPrices[stock.ticker]?.price || 0;
      return total + (stock.shares * price);
    }, 0);
  }, [portfolio, portfolioPrices]);


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center">
            <LucideNewspaper className="w-8 h-8 text-blue-500 mr-3"/>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Financial News Agent</h1>
        </div>
        <IconButton
            icon={isRunning ? LucidePause : LucidePlay}
            onClick={handleStartStop}
            disabled={!geminiApiKey}
            className={isRunning ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-green-500 hover:bg-green-600 focus:ring-green-400'}
        >
            {isRunning ? 'Stop Agent' : 'Start Agent'}
        </IconButton>
      </header>

      <div className="flex">
        <aside className="w-96 bg-white dark:bg-gray-800 p-6 h-screen sticky top-16 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Configuration</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="fmpApiKey" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <LucideKeyRound className="w-4 h-4 mr-2"/> FMP API Key
                </label>
                <input id="fmpApiKey" type="password" value={fmpApiKey} onChange={(e) => handleFmpApiKeyChange(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Enter FMP API key"/>
              </div>
              <div>
                <label htmlFor="geminiApiKey" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <LucideKeyRound className="w-4 h-4 mr-2"/> Gemini API Key
                </label>
                <input id="geminiApiKey" type="password" value={geminiApiKey} onChange={(e) => handleGeminiApiKeyChange(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Enter Gemini API key"/>
              </div>
              <div>
                <label htmlFor="chatGptApiKey" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <LucideKeyRound className="w-4 h-4 mr-2"/> ChatGPT API Key
                </label>
                <input id="chatGptApiKey" type="password" value={chatGptApiKey} onChange={(e) => handleChatGptApiKeyChange(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Enter ChatGPT API key"/>
              </div>
              <div>
                <label htmlFor="cohereApiKey" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <LucideKeyRound className="w-4 h-4 mr-2"/> Cohere API Key
                </label>
                <input id="cohereApiKey" type="password" value={cohereApiKey} onChange={(e) => handleCohereApiKeyChange(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Enter Cohere API key"/>
              </div>
              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keywords</label>
                <textarea id="keywords" rows="3" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="sector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sector</label>
                <select id="sector" value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500">
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-2">Agent Status</h3>
                <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span>{isRunning ? 'Running' : 'Stopped'}</span>
                </div>
                {lastUpdated && <p className="text-xs text-gray-500 mt-2">Last update: {lastUpdated.toLocaleTimeString()}</p>}
            </div>
          </aside>

          <main className="flex-1 p-4 md:p-8">
            <section className="space-y-8">
                <Card>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <LucideGauge className="w-7 h-7 text-blue-500 mr-3"/>
                                <h2 className="text-2xl font-bold">Market Sentiment</h2>
                            </div>
                            {loadingSentiment && <LucideLoader2 className="w-6 h-6 animate-spin text-blue-500" />}
                        </div>
                        {marketSentiment ? (
                            <div>
                                <p className={`text-3xl font-bold text-center mb-2 ${getSentimentColor(marketSentiment.sentiment)}`}>{marketSentiment.sentiment}</p>
                                <p className="text-center text-sm text-gray-600 dark:text-gray-400 italic">"{marketSentiment.reason}"</p>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 p-4">Start the agent to analyze market sentiment.</p>
                        )}
                    </div>
                </Card>

                {/* --- Portfolio Watchlist --- */}
                <Card>
                    <div className="p-5">
                        <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                            <div className="flex items-center">
                                <LucideWallet className="w-7 h-7 text-blue-500 mr-3"/>
                                <h2 className="text-2xl font-bold">Portfolio Watchlist</h2>
                            </div>
                            <div className="flex items-center gap-2">
                               <IconButton onClick={() => fileInputRef.current.click()} icon={LucideUpload} className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-xs px-3 py-1.5">Import</IconButton>
                               <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv" className="hidden" />
                               <IconButton onClick={handleExport} icon={LucideDownload} className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-xs px-3 py-1.5">Export</IconButton>
                               <IconButton onClick={fetchPortfolioReview} icon={LucideSparkles} disabled={loadingReview} className="bg-purple-500 hover:bg-purple-600 focus:ring-purple-400 text-xs px-3 py-1.5">Review Portfolio</IconButton>
                               {loadingPrices && <LucideLoader2 className="w-6 h-6 animate-spin text-blue-500" />}
                            </div>
                        </div>
                        <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <input type="text" value={newTicker} onChange={e => setNewTicker(e.target.value)} placeholder="Stock Ticker (e.g., AAPL)" className="sm:col-span-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
                            <input type="number" value={newShares} onChange={e => setNewShares(e.target.value)} placeholder="Number of Shares" className="sm:col-span-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" />
                            <IconButton icon={LucidePlusCircle} type="submit" className="sm:col-span-1 bg-blue-500 hover:bg-blue-600 focus:ring-blue-400">Add Stock</IconButton>
                        </form>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b dark:border-gray-700">
                                        <th className="p-3">Ticker</th><th className="p-3">Shares</th><th className="p-3">Price</th><th className="p-3">Day's Change</th><th className="p-3">Value</th><th className="p-3">Latest Signal</th><th className="p-3">Reason</th><th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center p-8 text-gray-500">Add stocks to your portfolio or import a CSV file.</td></tr>
                                    ) : portfolio.map(stock => {
                                        const data = portfolioPrices[stock.ticker];
                                        const price = data?.price || 0;
                                        const change = data?.change || 0;
                                        const changePercent = data?.changePercent || 0;
                                        const value = price * stock.shares;
                                        const changeColor = change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500';
                                        const latestEvent = events.find(e => e.affected_stocks && Array.isArray(e.affected_stocks) && e.affected_stocks.includes(stock.ticker));
                                        const isEditing = editingTicker === stock.ticker;
                                        return (
                                            <tr key={stock.ticker} className="border-b dark:border-gray-700 last:border-b-0">
                                                <td className="p-3 font-bold">{stock.ticker}</td>
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <input type="number" value={editingShares} onChange={e => setEditingShares(e.target.value)} className="w-24 p-1 border rounded-md bg-gray-100 dark:bg-gray-700" />
                                                    ) : (
                                                        stock.shares.toLocaleString()
                                                    )}
                                                </td>
                                                <td className="p-3">{price > 0 ? `$${price.toFixed(2)}` : <LucideLoader2 className="w-4 h-4 animate-spin"/>}</td><td className={`p-3 font-medium ${changeColor}`}>{change.toFixed(2)} ({changePercent.toFixed(2)}%)</td><td className="p-3 font-medium">{`$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</td>
                                                <td className="p-3">{latestEvent ? (<Badge className={`font-bold ${getRecommendationColor(latestEvent.recommendation)}`}>{latestEvent.recommendation}</Badge>) : (<span className="text-gray-500">-</span>)}</td>
                                                <td className="p-3 text-xs text-gray-500 italic max-w-xs truncate">{latestEvent ? latestEvent.reason : '-'}</td>
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleSaveEdit(stock.ticker)} className="text-green-500 hover:text-green-700"><LucideSave className="w-5 h-5" /></button>
                                                            <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700"><LucideXCircle className="w-5 h-5" /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleEditClick(stock)} className="text-blue-500 hover:text-blue-700"><LucidePencil className="w-5 h-5" /></button>
                                                            <button onClick={() => handleRemoveStock(stock.ticker)} className="text-red-500 hover:text-red-700"><LucideTrash2 className="w-5 h-5"/></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 font-bold dark:border-gray-700">
                                        <td className="p-3" colSpan="4">Total Value</td>
                                        <td className="p-3" colSpan="4">{`$${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </Card>
                
                <Card>
                    <div className="p-5">
                        <div className="flex items-center mb-4">
                            <LucideTarget className="w-7 h-7 text-green-500 mr-3"/>
                            <h2 className="text-2xl font-bold">Potential Buys</h2>
                        </div>
                        {allPotentialBuys.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="p-2">Ticker</th><th className="p-2">Action</th><th className="p-2">Source</th><th className="p-2">Current Price</th><th className="p-2">Limit Price</th><th className="p-2">Shares</th><th className="p-2">Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allPotentialBuys.map((buy, index) => {
                                            const price = portfolioPrices[buy.ticker]?.price || 0;
                                            return (
                                                <tr key={index} className="border-b dark:border-gray-700 last:border-b-0">
                                                    <td className="p-2 font-bold">{buy.ticker}</td>
                                                    <td className="p-2"><Badge className={getRecommendationColor(buy.action)}>{buy.action}</Badge></td>
                                                    <td className="p-2"><Badge className="bg-gray-200 text-gray-800">{buy.source}</Badge></td>
                                                    <td className="p-2">{price > 0 ? `$${price.toFixed(2)}` : <LucideLoader2 className="w-4 h-4 animate-spin"/>}</td>
                                                    <td className="p-2">{buy.limit_price ? `$${buy.limit_price.toFixed(2)}` : '-'}</td>
                                                    <td className="p-2">{buy.suggested_shares}</td>
                                                    <td className="p-2"><Badge className={getRiskColor(buy.risk_level)}>{buy.risk_level}</Badge></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 p-8">No "Buy" recommendations found. Run the agent to find opportunities.</p>
                        )}
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center"><LucideBrainCircuit className="w-7 h-7 text-purple-500 mr-3"/><h2 className="text-2xl font-bold">Gemini Ideas</h2></div>
                        {loadingGeminiRec && <LucideLoader2 className="w-6 h-6 animate-spin text-purple-500" />}
                      </div>
                      {geminiRec.length > 0 ? (
                        <div className="space-y-4">
                            {geminiRec.map((rec, index) => (
                                <div key={index} className="space-y-2 text-sm border-b dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex items-center"><Badge className={`text-base mr-3 ${getRecommendationColor(rec.action)}`}>{rec.action}</Badge><span className="font-bold text-lg">{rec.ticker}</span></div><p className="text-gray-600 dark:text-gray-400 italic">"{rec.reason}"</p><div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center"><LucideShieldCheck className="w-4 h-4 mr-1"/> Prospect</h4><p className="text-green-700 dark:text-green-400 text-xs">{rec.prospect}</p></div><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><LucideShieldAlert className="w-4 h-4 mr-1"/> Risk</h4><p className="text-red-700 dark:text-red-400 text-xs">{rec.risk}</p></div>
                                </div>
                            ))}
                        </div>
                      ) : (<p className="text-center text-gray-500 p-8">Start the agent to generate ideas. Ideas refresh every 3 hours.</p>)}
                    </div>
                  </Card>
                  <Card>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center"><LucideBot className="w-7 h-7 text-teal-500 mr-3"/><h2 className="text-2xl font-bold">Analyst AI (Sim)</h2></div>
                        {loadingAnalystRec && <LucideLoader2 className="w-6 h-6 animate-spin text-teal-500" />}
                      </div>
                       {analystRec.length > 0 ? (
                        <div className="space-y-4">
                            {analystRec.map((rec, index) => (
                               <div key={index} className="space-y-2 text-sm border-b dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex items-center"><Badge className={`text-base mr-3 ${getRecommendationColor(rec.action)}`}>{rec.action}</Badge><span className="font-bold text-lg">{rec.ticker}</span></div><p className="text-gray-600 dark:text-gray-400 italic">"{rec.reason}"</p><div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center"><LucideShieldCheck className="w-4 h-4 mr-1"/> Prospect</h4><p className="text-green-700 dark:text-green-400 text-xs">{rec.prospect}</p></div><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><LucideShieldAlert className="w-4 h-4 mr-1"/> Risk</h4><p className="text-red-700 dark:text-red-400 text-xs">{rec.risk}</p></div>
                                </div>
                            ))}
                        </div>
                      ) : (<p className="text-center text-gray-500 p-8">Start the agent to generate ideas. Ideas refresh every 3 hours.</p>)}
                    </div>
                  </Card>
                  <Card>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center"><LucideBot className="w-7 h-7 text-blue-500 mr-3"/><h2 className="text-2xl font-bold">ChatGPT Ideas</h2></div>
                        <IconButton onClick={() => fetchRecommendations('chatgpt')} icon={LucideLightbulb} disabled={!chatGptApiKey || loadingChatGptRec} className="bg-blue-500 hover:bg-blue-600 focus:ring-blue-400">Generate</IconButton>
                      </div>
                       {loadingChatGptRec ? <div className="flex justify-center items-center p-8"><LucideLoader2 className="w-8 h-8 animate-spin"/></div> : chatGptRec.length > 0 ? (
                        <div className="space-y-4">
                            {chatGptRec.map((rec, index) => (
                               <div key={index} className="space-y-2 text-sm border-b dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex items-center"><Badge className={`text-base mr-3 ${getRecommendationColor(rec.action)}`}>{rec.action}</Badge><span className="font-bold text-lg">{rec.ticker}</span></div><p className="text-gray-600 dark:text-gray-400 italic">"{rec.reason}"</p><div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center"><LucideShieldCheck className="w-4 h-4 mr-1"/> Prospect</h4><p className="text-green-700 dark:text-green-400 text-xs">{rec.prospect}</p></div><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><LucideShieldAlert className="w-4 h-4 mr-1"/> Risk</h4><p className="text-red-700 dark:text-red-400 text-xs">{rec.risk}</p></div>
                                </div>
                            ))}
                        </div>
                      ) : (<p className="text-center text-gray-500 p-8">Click "Generate" to get ideas from ChatGPT.</p>)}
                    </div>
                  </Card>
                  <Card>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center"><LucideBot className="w-7 h-7 text-indigo-500 mr-3"/><h2 className="text-2xl font-bold">Cohere Ideas</h2></div>
                        <IconButton onClick={() => fetchRecommendations('cohere')} icon={LucideLightbulb} disabled={!cohereApiKey || loadingCohereRec} className="bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-400">Generate</IconButton>
                      </div>
                       {loadingCohereRec ? <div className="flex justify-center items-center p-8"><LucideLoader2 className="w-8 h-8 animate-spin"/></div> : cohereRec.length > 0 ? (
                        <div className="space-y-4">
                            {cohereRec.map((rec, index) => (
                               <div key={index} className="space-y-2 text-sm border-b dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex items-center"><Badge className={`text-base mr-3 ${getRecommendationColor(rec.action)}`}>{rec.action}</Badge><span className="font-bold text-lg">{rec.ticker}</span></div><p className="text-gray-600 dark:text-gray-400 italic">"{rec.reason}"</p><div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center"><LucideShieldCheck className="w-4 h-4 mr-1"/> Prospect</h4><p className="text-green-700 dark:text-green-400 text-xs">{rec.prospect}</p></div><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center"><LucideShieldAlert className="w-4 h-4 mr-1"/> Risk</h4><p className="text-red-700 dark:text-red-400 text-xs">{rec.risk}</p></div>
                                </div>
                            ))}
                        </div>
                      ) : (<p className="text-center text-gray-500 p-8">Click "Generate" to get ideas from Cohere.</p>)}
                    </div>
                  </Card>
                </div>

                {/* --- Financial Events Feed --- */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Financial Events Feed</h2>
                      {loading && <LucideLoader2 className="w-6 h-6 animate-spin text-blue-500" />}
                    </div>

                    {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center"><LucideAlertTriangle className="w-6 h-6 mr-3"/><div><p className="font-bold">An Error Occurred</p><p className="text-sm">{error}</p></div></div>}
                    
                    {!isRunning && events.length === 0 && !loading && (
                         <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                            <LucideSearch className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"/>
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Agent is Idle</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Press 'Start Agent' to begin searching for financial news.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                      {events.map((event, index) => (
                        <Card key={index} className="flex flex-col transition-transform duration-300 hover:scale-105">
                          <div className="p-5 flex-grow">
                            <div className="flex justify-between items-start mb-3">
                                <div><Badge className={getImpactColor(event.impact)}>{event.impact}</Badge>{event.recommendation && (<Badge className={`ml-2 font-bold ${getRecommendationColor(event.recommendation)}`}>{event.recommendation}</Badge>)}</div>
                                {getImpactIcon(event.impact)}
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white leading-tight">{event.headline}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow">{event.summary}</p>
                            {event.reason && (<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"><p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center"><LucideLightbulb className="w-4 h-4 mr-1 text-yellow-500"/>AI Recommendation</p><p className="text-xs text-gray-600 dark:text-gray-400 italic">"{event.reason}"</p></div>)}
                          </div>
                          <div className="p-5 bg-gray-50 dark:bg-gray-700/50">
                             <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3"><span>{event.source}</span><span>{new Date(event.published_at).toLocaleDateString()}</span></div>
                            <div className="flex flex-wrap gap-2 mb-4">{event.affected_stocks.map(stock => (<Badge key={stock} className={`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ${portfolio.some(p=>p.ticker===stock) ? 'ring-2 ring-blue-500' : ''}`}>{stock}</Badge>))}</div>
                            <button onClick={() => openEventModal(event)} className="w-full text-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">View Details</button>
                          </div>
                        </Card>
                      ))}
                    </div>
                </div>
            </section>
          </main>
      </div>
      <footer className="text-center p-4 mt-8 text-xs text-gray-500 dark:text-gray-400">
        <p>Disclaimer: This is not financial advice. All recommendations are generated by an AI and should be used for informational purposes only.</p>
      </footer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedEvent?.headline}>
        {selectedEvent && (
            <div className="space-y-4">
                <div><h4 className="font-semibold text-gray-800 dark:text-gray-200">Summary</h4><p className="text-gray-600 dark:text-gray-400">{selectedEvent.summary}</p></div>
                {selectedEvent.recommendation && (<div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg"><h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center"><LucideLightbulb className="w-5 h-5 mr-2 text-yellow-500"/>AI Recommendation</h4><div className="flex items-center space-x-4 mt-2"><Badge className={`text-base ${getRecommendationColor(selectedEvent.recommendation)}`}>{selectedEvent.recommendation}</Badge><p className="text-gray-600 dark:text-gray-400 italic">"{selectedEvent.reason}"</p></div></div>)}
                <div className="flex items-center space-x-8"><div><h4 className="font-semibold text-gray-800 dark:text-gray-200">Impact</h4><Badge className={getImpactColor(selectedEvent.impact)}>{selectedEvent.impact}</Badge></div><div><h4 className="font-semibold text-gray-800 dark:text-gray-200">Source</h4><p className="text-gray-600 dark:text-gray-400">{selectedEvent.source}</p></div></div>
                <div><h4 className="font-semibold text-gray-800 dark:text-gray-200">Affected Stocks</h4><div className="flex flex-wrap gap-2 mt-1">{selectedEvent.affected_stocks.map(stock => (<Badge key={stock} className={`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ${portfolio.some(p=>p.ticker===stock) ? 'ring-2 ring-blue-500' : ''}`}>{stock}</Badge>))}</div></div>
                <p className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">Published: {new Date(selectedEvent.published_at).toLocaleString()}</p>
            </div>
        )}
      </Modal>
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="✨ AI Portfolio Review">
          {loadingReview ? (
              <div className="flex justify-center items-center p-8"><LucideLoader2 className="w-10 h-10 animate-spin text-purple-500"/></div>
          ) : (
              <div className="space-y-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {portfolioReview.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
          )}
      </Modal>
    </div>
  );
};

export default App;

