# BTC Grid Sandbox

[Open the dashboard](https://0xtrvkc.github.io/btc-grid-sandbox/)

A browser-only BTC spot-grid backtester in one `index.html`. Download it and open it directly, or use GitHub Pages. No backend, framework, package installation or build step. Internet access is needed for price files and chart libraries.

## Quick start

1. Download `index.html` from this repository and open it in a browser. The standalone download named `sandbox.html` works the same way.
2. Wait for BTC data to load and the default backtest to complete.
3. Select **Configure strategy**. Choose a granularity, UTC date range, investment, price boundaries, grid count, spacing and fee.
4. Optionally enable the entry trigger, take-profit or stop-loss. These thresholds are **BTC prices in USD**, not portfolio return percentages.
5. Press **Run backtest**. Input changes take effect on the next run. **Reset** restores the default configuration and runs it again.
6. Inspect **Overview**, **Profit lab**, **Risk & drawdown**, **Quant summary** and **Execution log**. Use the exports to save the run, fills, matched pairs or summary.

### Execution fidelity and exchange reconciliation

The simulator provides three explicit execution modes:

- **Close-only · conservative:** original close-to-close crossing logic. Intrabar reversals are invisible.
- **OHLC path · estimated:** accepts timestamped OHLC JSON and traverses O→L→H→C for an up bar or O→H→L→C for a down bar. This is an estimate because OHLC does not reveal the true tick sequence.
- **Close-only · calibrated sensitivity:** leaves every simulated fill and account statistic unchanged, while showing a separate grid-profit sensitivity using a user-entered fill multiplier.

Local JSON import accepts a flat `{timestamp: close}` object, timestamp keys whose values are OHLC objects, or an array of timestamped rows. Unix timestamps in seconds or milliseconds are supported. Files remain local to the browser. Minute-spaced imports automatically select **1M · imported**, allowing higher-fidelity reconstruction without shipping a very large permanent dataset with the app.

Order sizing can remain capital-feasible or use an exact fractional **BTC per order**. Exact entry and final-exit price overrides reproduce known exchange executions without changing the selected timestamps. Optional exchange grid profit and matched-cycle inputs populate the execution-fidelity audit with fill capture, profit error and the most likely discrepancy driver. They never tune the backtest.

### Adaptive quant setup

The configuration now includes an optional **Adaptive** setup assistant. It combines the selected price file with `mvrv.json` from the companion analytics repository and proposes a grid as of the selected backtest start:

- trailing 90-day log-return volatility sizes a 30-day expected-move range;
- 30-day and 90-day price momentum, plus directional efficiency, classify trend pressure and grid suitability;
- the latest MVRV value and its trailing 365-day Z-score classify accumulation or distribution conditions and skew the range;
- per-bar volatility proposes a fee-aware target net profit per grid, which is converted to the nearest valid integer interval count;
- the recommendation also proposes a cash buffer and geometric spacing.

Select **Adaptive**, inspect the five-signal readout, and choose **Apply recommendation**. Nothing is changed until that button is pressed, and every field remains editable afterward. Manual mode remains the default and the adaptive setup does not alter the simulation engine.

The cutoff is strict: price and MVRV observations must be timestamped at or before the first selected test observation. Later data cannot influence a historical recommendation. This is a point-in-time setup assistant, not a claim that the suggested parameters maximize future profit and not a dynamic live rebalancing bot.

### Default configuration

| Setting | Default |
| --- | --- |
| Execution model | Binance-style spot |
| Data | 4-hour closes; latest available 365 days |
| Investment | $10,000 |
| Range | First selected close ±20%, rounded for the input controls |
| Grid count | 20 intervals / 21 price levels |
| Spacing | Arithmetic |
| Trading fee | 0.1% on every fill, including seed and liquidation |
| Cash buffer | 1% |
| Setup assistant | Manual; Adaptive is optional |
| Entry trigger / TP / SL | Disabled |
| End of test | Stop bot and sell all remaining BTC |
| Annual risk-free rate | 3% for daily risk-adjusted metrics |

Changing the date range does not automatically recenter an existing grid. Use **Center on first close ±20%** when that is the intended setup. Data coverage comes from the selected file and can differ between granularities.

## Research views

- **Overview:** net ROI beside buy & hold, matched grid profit, maximum drawdown, APR, CAGR, Sharpe, fees and balances; equity, price/fill and underwater charts.
- **Execution fidelity audit:** data resolution, simulated cycles, calibrated sensitivity, exchange fill capture, profit error and discrepancy attribution.
- **Profit lab:** grid and bot APR, hypothetical APY, two P&L attribution lenses, a waterfall, profit by interval, monthly return map and daily return distribution.
- **Risk:** drawdown depth and duration, recovery needed, BTC exposure, Calmar, Sortino, volatility, Ulcer Index, historical daily VaR/expected shortfall and recovery episodes.
- **Quant summary:** a deterministic narrative from the actual run, rolling returns, BTC beta/correlation and a detailed scorecard. No external AI service.
- **Execution log:** paginated fills, matched-pair filtering, order ladder, fill and matched-pair CSVs, a run JSON and summary TXT.
- **Methodology:** formulas, assumptions and source references.

Dark and light themes, window-style chrome, keyboard controls and a navigation dropdown below 800px. The default view runs the latest available year of 4-hour data; it is an example configuration, not an optimized strategy.

## Grid conventions

The default **Binance-style spot** model follows the [Binance Spot Grid guide](https://www.binance.com/en/support/faq/detail/d5f441e8ab544a5b98241e00efb3a4ab):

- `N` intervals produce `N + 1` boundary prices. Arithmetic spacing is `(upper − lower) / N`; geometric spacing uses `(upper / lower)^(1 / N)`.
- Each interval independently alternates between a buy at its lower boundary and a sell at its upper boundary. Initial orders are arranged around the activation price, with a vacant boundary above it. Required sell inventory is purchased at activation.
- Fixed BTC quantity is sized to fund initial buys, seed inventory and USD fees, leaving the configurable cash buffer. Quantity does not compound during a run.
- Optional entry trigger, take-profit above the range, stop-loss below the range, and a choice to sell all BTC or retain inventory when stopped. The end-of-test action is explicit.
- Supports 2–170 static intervals. Dynamic exchange order limits, live execution, exchange lot rounding and BNB/BTC fee-token handling are outside this simulator.

The **Original simple · v1** option retains the [grid_trading_bot-inspired](https://github.com/jordantete/grid_trading_bot/blob/master/docs/concepts/grid-trading.md) model: `N` inclusive price levels, midpoint-based initial sides, a 50% BTC seed and fixed order quantity `initial_balance / N / activation_price`. The arithmetic range midpoint is displayed for both spacing modes.

## P&L and annualization

| Metric | Definition |
| --- | --- |
| Total P&L | Final fiat + final BTC × final close − starting capital; all fill fees included |
| ROI | Total P&L / starting capital |
| Matched grid profit | Completed adjacent grid buy/sell spreads less both fees; seed sales and stop liquidation excluded |
| Floating / other P&L | Total P&L minus matched grid profit; includes inventory and unmatched effects |
| Realized + unrealized | An alternative reconciliation using weighted average cost, including entry fees |
| Total APR | Full-window ROI × 365 / elapsed calendar days |
| Bot APR | P&L at bot stop / starting capital × 365 / elapsed days since activation |
| Grid APR | Net matched profit / starting capital × 365 / bot duration |
| CAGR | `(final equity / starting capital)^(365 / elapsed days) − 1` |
| APY scenario | `(1 + total APR / 365)^365 − 1`, using APR as a decimal; hypothetical daily reinvestment, not a simulated return |
| Daily Sharpe / Sortino | Adjacent UTC daily-close excess returns; sample standard deviation / downside RMS; annualization factor √365 |

Return formulas use decimals; the dashboard displays percentages. Annualization uses actual elapsed calendar time and a 365-day year. Zero-duration or undefined estimates display N/A.

The [Binance grid-profit and annualized-yield explanation](https://www.binance.com/en/support/faq/detail/688ff6ff08734848915de76a07b953dd) informs the distinction between cycle income and total account P&L. A profitable grid cycle does not establish a profitable portfolio. Retained BTC continues to affect full-window performance after a bot stop; bot APR ends at that stop.

Buy & hold is shown gross beside ROI, with a fee-adjusted result underneath. Missing daily observations are excluded from daily return statistics. Full-run statistics remain unchanged when selecting a shorter visual window. Short or degenerate samples display N/A where appropriate.

### Risk and trade statistics

| Metric | Interpretation |
| --- | --- |
| Maximum drawdown | Largest percentage decline from a prior equity peak, including starting capital |
| Maximum runup | Largest percentage rise from a preceding equity trough |
| Drawdown duration | Time since the preceding peak; unrecovered episodes run through the selected end |
| Recovery needed | Percentage gain required for final equity to regain its high-water mark |
| Calmar | CAGR divided by maximum drawdown |
| Ulcer Index | Root mean square of percentage drawdown, weighted by elapsed time |
| Annualized volatility | Sample standard deviation of daily portfolio returns × √365 |
| Historical daily VaR / expected shortfall | Loss at the empirical 5th percentile / average loss in that tail; at least 20 daily returns required |
| Daily profit factor | Sum of positive daily equity P&L divided by absolute negative daily equity P&L |
| Matched-cycle win rate | Profitable completed grid pairs / all completed grid pairs; excludes unmatched inventory losses |
| BTC exposure | BTC market value / account equity; the average is weighted by elapsed time |
| BTC beta / correlation | Sensitivity to and co-movement with daily BTC returns; at least 20 paired daily returns required |

The scorecard also includes daily win rate, best and worst day, longest losing-day streak, matched holding time, turnover, recovery factor, tracking error, information ratio and annualized Jensen alpha. Legacy per-bar Sharpe and Sortino retain the original analyzer convention with its fixed 3% risk-free assumption.

## Data and execution limits

Prices are fetched directly from [dynamic-btc-analytics-dashboard](https://github.com/0xtrvkc/dynamic-btc-analytics-dashboard): `btc_daily_price.json`, `btc_4h_price.json` or `btc_1h_price.json`. The flat `{date: close}` data are sorted and interpreted in UTC; each picker is bounded to the loaded file's actual coverage.

Adaptive setup additionally requests `mvrv.json` from that repository. If it is unavailable, price-only backtests and manual configuration continue to work; the adaptive readout reports MVRV as unavailable rather than substituting a future or fabricated value.

Remote bundled datasets contain closes only. A fill is simulated when consecutive closes cross an active grid boundary, at that boundary's price; multiple crossed levels execute in price order. Imported OHLC data can use the documented deterministic path estimate, and imported minute data can substantially reduce missed reversals. Neither mode establishes the exact exchange tick path. Spread, slippage, exchange queue priority and tick-accurate execution are not modeled.

Exact entry/exit overrides affect seed or final-liquidation executions only. A calibrated multiplier is reporting-only: it does not create trades or change total P&L, ROI, drawdown or balances. Exchange comparison fields are similarly diagnostic and never influence the engine.

Uses [Chart.js 4.4.1 from cdnjs](https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js) and [annotation plugin 3.0.1 from jsDelivr](https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js). Computation runs in an inline Blob worker, with a synchronous fallback where worker creation is unavailable. No account connection is needed.

## Validation

The v2 engine was checked against hand-calculated sizing, spacing, matched-pair P&L and annualization cases; cash/BTC/fee reconciliation; trigger, stop and retained-inventory cases; 100 seeded scenarios; both spacing modes on all three real datasets; and the full 128,858-bar hourly history available during validation. Independent NumPy calculations agreed for 13 risk metrics.

The delivered HTML fetched all three remote files in a JavaScript DOM/native-canvas test harness. All 13 Chart.js charts rendered; form validation, date bounds, annotations, navigation, exports and reset passed. Chart images were visually inspected. Full browser layout verification was unavailable in the execution environment.

Historical simulation. Not financial advice.
