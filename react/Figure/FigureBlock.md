Pour montrer une KPI importante.

```jsx
import { FigureBlock } from 'cozy-ui/transpiled/react/Figure';
<div>
  <FigureBlock
    label='Balance totale'
    total={1000}
    symbol='€'
    coloredPositive coloredNegative signed />

  <FigureBlock
    label='Balance totale (negative number)'
    total={-1000}
    symbol='€'
    coloredPositive coloredNegative signed />

  <FigureBlock
    label='Balance totale (no color)'
    total={-1000}
    symbol='€'
    signed />
</div>
```
