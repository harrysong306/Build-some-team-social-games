import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

if (!window.PointerEvent) {
  class MockPointerEvent extends MouseEvent {
    pointerId: number

    constructor(
      type: string,
      props: PointerEventInit = {},
    ) {
      super(type, props)
      this.pointerId = props.pointerId ?? 0
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MockPointerEvent,
  })
}

if (!HTMLCanvasElement.prototype.setPointerCapture) {
  Object.defineProperty(
    HTMLCanvasElement.prototype,
    'setPointerCapture',
    {
      configurable: true,
      value: vi.fn(),
    },
  )
}