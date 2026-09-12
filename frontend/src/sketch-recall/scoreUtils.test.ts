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

  it('ignores case, spaces and punctuation for exact answers', () => {
    expect(
      scoreGuess('  APPLE  ', 'apple'),
    ).toBe(4)

    expect(
      scoreGuess('ice-cream!', 'Ice Cream'),
    ).toBe(4)
  })

  it('awards partial marks for close answers', () => {
    expect(
      scoreGuess('Kake', 'Cake'),
    ).toBe(3)

    expect(
      scoreGuess('Kacke', 'Cake'),
    ).toBe(2)
  })

  it('awards partial marks when one answer contains the other', () => {
    expect(
      scoreGuess('Cake', 'Cakes'),
    ).toBe(3)
  })

  it('awards zero marks for an unrelated answer', () => {
    expect(
      scoreGuess('Dog', 'Cake'),
    ).toBe(0)
  })

  it('awards zero marks when only one answer is blank', () => {
    expect(
      scoreGuess('', 'Cake'),
    ).toBe(0)

    expect(
      scoreGuess('Cake', ''),
    ).toBe(0)
  })
})