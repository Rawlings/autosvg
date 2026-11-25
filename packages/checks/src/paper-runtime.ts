// Paper.js without a DOM, under the file name Node can load. Paper's own types name this file without the `.js` that Node's
// ES modules need, so the types come from the global `paper` namespace of its declaration file and the value from here.
import type {} from 'paper'
import core from 'paper/dist/paper-core.js'

export default core as unknown as typeof paper
