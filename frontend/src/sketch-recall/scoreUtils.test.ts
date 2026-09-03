import assert from 'node:assert/strict'

import { scoreGuess } from './scoreUtils'

assert.equal(scoreGuess('Cake', 'Cake'), 4)
assert.equal(scoreGuess('Kake', 'Cake'), 3)
assert.equal(scoreGuess('Kacke', 'Cake'), 2)
assert.equal(scoreGuess('Dog', 'Cake'), 0)

console.log('score tests passed')
