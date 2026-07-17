export function calculateSMA(data, windowSize) {
  let sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      sma.push({ x: data[i].x, y: null });
    } else {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += data[i - j].y[3]; // Closing price of the candle
      }
      sma.push({ x: data[i].x, y: Number((sum / windowSize).toFixed(2)) });
    }
  }
  return sma;
}

export function aggregateToCandles(ticks, intervalSeconds = 10) {
  if (!ticks || ticks.length === 0) return [];
  
  const candles = [];
  let currentCandle = null;
  let currentIntervalEnd = 0;

  ticks.forEach(tick => {
    const ts = new Date(tick.timestamp).getTime();
    
    if (!currentCandle || ts > currentIntervalEnd) {
      if (currentCandle) candles.push(currentCandle);
      currentIntervalEnd = ts + intervalSeconds * 1000;
      currentCandle = {
        x: new Date(tick.timestamp),
        y: [tick.price, tick.price, tick.price, tick.price] // O, H, L, C
      };
    } else {
      currentCandle.y[1] = Math.max(currentCandle.y[1], tick.price); // High
      currentCandle.y[2] = Math.min(currentCandle.y[2], tick.price); // Low
      currentCandle.y[3] = tick.price; // Close
    }
  });
  
  if (currentCandle) candles.push(currentCandle);
  return candles;
}
