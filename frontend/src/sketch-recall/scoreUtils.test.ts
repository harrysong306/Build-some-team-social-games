import {
  describe,
  expect,
  it,
} from 'vitest'

import { scoreGuess } from './scoreUtils'

describe('scoreGuess', () => {
  it('awards 4 marks for an exact answer', () => {
    expect(
      scoreGuess('Cake', 'Cake'),
    ).toBe(4)
  })

  it('awards partial marks for a close answer', () => {
    expect(
      scoreGuess('Kake', 'Cake'),
    ).toBe(3)

    expect(
      scoreGuess('Kacke', 'Cake'),
    ).toBe(2)
  })

  it('awards zero marks for an unrelated answer', () => {
    expect(
      scoreGuess('Dog', 'Cake'),
    ).toBe(0)
  })
})