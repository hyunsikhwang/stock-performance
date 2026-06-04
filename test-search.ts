import yahooFinanceModule from 'yahoo-finance2';

const yahooFinance = (typeof yahooFinanceModule === 'function')
  ? new (yahooFinanceModule as any)()
  : (yahooFinanceModule as any).default && typeof (yahooFinanceModule as any).default === 'function'
    ? new (yahooFinanceModule as any).default()
    : yahooFinanceModule;

async function test() {
  const queries = ['KoAct', 'TIME 코스닥', 'KODEX 차이나', '476100', '433530', '306540'];
  for (const q of queries) {
    try {
      const res = await yahooFinance.search(q);
      console.log(`\nQuery: ${q}`);
      if (res.quotes && res.quotes.length > 0) {
        res.quotes.slice(0, 3).forEach((item: any) => {
          console.log(` - Symbol: ${item.symbol}, Name: ${item.shortname || item.longname}, Exchange: ${item.exchange}`);
        });
      } else {
        console.log(' - No results');
      }
    } catch (err: any) {
      console.log(`Query ${q} failed:`, err.message);
    }
  }
}

test();
