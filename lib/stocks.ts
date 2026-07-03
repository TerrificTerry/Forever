export interface StockPriceProvider {
  getCurrentPrice(ticker: string): Promise<number | null>;
  getHistoricalPrice(ticker: string, date: Date): Promise<number | null>;
}

class ManualProvider implements StockPriceProvider {
  async getCurrentPrice() { return null; }
  async getHistoricalPrice() { return null; }
}

async function json(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Stock provider returned ${response.status}.`);
  return response.json();
}

class AlphaVantageProvider implements StockPriceProvider {
  constructor(private key: string) {}
  async getCurrentPrice(ticker: string) {
    const data = await json(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${this.key}`);
    const value = Number(data?.["Global Quote"]?.["05. price"]); return Number.isFinite(value) ? value : null;
  }
  async getHistoricalPrice(ticker: string, date: Date) {
    const data = await json(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=full&symbol=${encodeURIComponent(ticker)}&apikey=${this.key}`);
    return closestDaily(data?.["Time Series (Daily)"], date);
  }
}

class FinnhubProvider implements StockPriceProvider {
  constructor(private key: string) {}
  async getCurrentPrice(ticker: string) { const data = await json(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${this.key}`); return Number(data?.c) || null; }
  async getHistoricalPrice(ticker: string, date: Date) {
    const from = Math.floor((date.getTime() - 4 * 86_400_000) / 1000); const to = Math.floor((date.getTime() + 4 * 86_400_000) / 1000);
    const data = await json(`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${from}&to=${to}&token=${this.key}`);
    return Array.isArray(data?.c) && data.c.length ? Number(data.c.at(-1)) : null;
  }
}

class TwelveDataProvider implements StockPriceProvider {
  constructor(private key: string) {}
  async getCurrentPrice(ticker: string) { const data = await json(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(ticker)}&apikey=${this.key}`); return Number(data?.price) || null; }
  async getHistoricalPrice(ticker: string, date: Date) {
    const day = date.toISOString().slice(0, 10); const data = await json(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(ticker)}&interval=1day&start_date=${day}&end_date=${day}%2023:59:59&apikey=${this.key}`);
    return Array.isArray(data?.values) && data.values.length ? Number(data.values[0].close) : null;
  }
}

function closestDaily(series: Record<string, Record<string, string>> | undefined, date: Date) {
  if (!series) return null;
  const target = date.getTime();
  const key = Object.keys(series).sort((a, b) => Math.abs(new Date(a).getTime() - target) - Math.abs(new Date(b).getTime() - target))[0];
  const value = Number(series[key]?.["4. close"]); return Number.isFinite(value) ? value : null;
}

export function createStockProvider(): StockPriceProvider {
  switch ((process.env.STOCK_API_PROVIDER || "manual").toLowerCase()) {
    case "alpha_vantage": return process.env.ALPHA_VANTAGE_API_KEY ? new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY) : new ManualProvider();
    case "finnhub": return process.env.FINNHUB_API_KEY ? new FinnhubProvider(process.env.FINNHUB_API_KEY) : new ManualProvider();
    case "twelve_data": return process.env.TWELVE_DATA_API_KEY ? new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY) : new ManualProvider();
    default: return new ManualProvider();
  }
}

export async function getStockPerformance(ticker: string, decisionDate: Date, decisionPrice: number | null) {
  if (!decisionPrice) return [];
  const provider = createStockProvider();
  const periods = [["1D", 1], ["1W", 7], ["1M", 30], ["3M", 90], ["6M", 180], ["1Y", 365]] as const;
  return Promise.all(periods.map(async ([label, days]) => {
    const target = new Date(decisionDate.getTime() + days * 86_400_000);
    if (target > new Date()) return { label, value: null, pending: true };
    const price = await provider.getHistoricalPrice(ticker, target);
    return { label, value: price ? ((price - decisionPrice) / decisionPrice) * 100 : null, pending: false };
  }));
}
