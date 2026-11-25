// Rewrites packages/core/src/batches/index.ts from the batch files present. Runs before `pnpm seed`, which imports it.
import { writeBatchIndex } from './lib/batches.ts'

if (writeBatchIndex()) console.log('batches/index.ts rewritten')
