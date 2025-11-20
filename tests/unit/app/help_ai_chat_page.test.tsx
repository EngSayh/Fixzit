// If the import path for AIChatPage is different in your repo, update the dynamic import block below accordingly.

/**
 * NOTE: Test framework: Vitest
 * These tests use @testing-library/react + @testing-library/jest-dom.
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import '@testing-library/jest-dom'

import AIChatPage from '@/app/help/ai-chat/page'

const requireAIChat = () => AIChatPage as React.ComponentType;

const flushPromises = async () => {
  // Resolve all pending promises including fetch chain
  await act(async () => Promise.resolve())
}

describe.skip('AIChatPage', () => {
  const origFetch = global.fetch as any
  const origClose = (window as any).close

  beforeEach(() => {
    vi.useFakeTimers()
    // Mock fetch by default to a successful response
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ answer: 'This is a helpful response.' }),
    }) as any
    // Mock window.close to avoid errors in jsdom
    ;(window as any).close = vi.fn()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
    global.fetch = origFetch
    ;(window as any).close = origClose
  })

  test('renders initial bot greeting', () => {
    const Page = requireAIChat()
    render(<Page />)
    expect(screen.getByText(/Fixzit AI Assistant/i)).toBeInTheDocument()
    expect(
      screen.getByText(/I can help you with questions about Fixzit Enterprise/i)
    ).toBeInTheDocument()
    // The very first message is from the bot
    expect(screen.getByText(/How can I help you today\?/i)).toBeInTheDocument()
  })

  test('send button is disabled when input is empty', () => {
    const Page = requireAIChat()
    render(<Page />)
    const sendBtn = screen.getByRole('button')
    expect(sendBtn).toBeDisabled()
  })

  test('typing enables send button; clears after send; appends user message', async () => {
    const Page = requireAIChat()
    render(<Page />)

    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement
    const sendBtn = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'What is Fixzit?' } })
    expect(sendBtn).toBeEnabled()

    fireEvent.click(sendBtn)

    // User message should appear immediately
    expect(await screen.findByText('What is Fixzit?')).toBeInTheDocument()
    expect(input.value).toBe('') // Cleared

    // Loading indicator visible while awaiting
    expect(screen.getByText(/Thinking\.\.\./i)).toBeInTheDocument()

    // Resolve fetch
    await flushPromises()

    // Bot response from mocked fetch
    expect(await screen.findByText('This is a helpful response.')).toBeInTheDocument()
  })

  test('pressing Enter sends; Shift+Enter does not send', async () => {
    const Page = requireAIChat()
    render(<Page />)

    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement

    // Shift+Enter should not send
    fireEvent.change(input, { target: { value: 'First line' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true })
    // Still no user message bubble
    expect(screen.queryByText('First line')).not.toBeInTheDocument()

    // Enter alone sends
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(await screen.findByText('First line')).toBeInTheDocument()

    await flushPromises()
    expect(await screen.findByText('This is a helpful response.')).toBeInTheDocument()
  })

  test('does nothing when input is only whitespace', async () => {
    const Page = requireAIChat()
    render(<Page />)
    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement
    const sendBtn = screen.getByRole('button')

    fireEvent.change(input, { target: { value: '   ' } })
    expect(sendBtn).toBeDisabled()

    fireEvent.click(sendBtn)
    // No additional user bubble beyond initial bot greeting
    // Query all message containers, counting "Thinking..." is separate UI; we check no user message
    expect(screen.queryByText(/^ {3}$/)).not.toBeInTheDocument()
  })

  test('disables input and button while loading', async () => {
    const Page = requireAIChat()
    // Slow fetch to keep loading state
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ json: async () => ({ answer: 'Delayed' }) }), 1000)
        })
    )
    render(<Page />)
    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement
    const sendBtn = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Please wait' } })
    fireEvent.click(sendBtn)

    expect(input).toBeDisabled()
    expect(sendBtn).toBeDisabled()

    // Fast-forward timers to resolve
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    await flushPromises()

    expect(await screen.findByText('Delayed')).toBeInTheDocument()
    // After response, input should be enabled
    expect(input).not.toBeDisabled()
    expect(sendBtn).toBeDisabled() // empty input again
  })

  test('handles API returning missing answer with fallback message', async () => {
    const Page = requireAIChat()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({}), // no answer
    })
    render(<Page />)

    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Unknown question' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

    await flushPromises()

    expect(
      await screen.findByText('Sorry, I could not find an answer.')
    ).toBeInTheDocument()
  })

  test('shows error message when fetch throws', async () => {
    const Page = requireAIChat()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    render(<Page />)

    const input = screen.getByPlaceholderText(/Ask me anything about Fixzit/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Cause error' } })
    fireEvent.click(screen.getByRole('button'))

    await flushPromises()

    expect(
      await screen.findByText('There was an error processing your request. Please try again.')
    ).toBeInTheDocument()
  })

  test('close button triggers window.close without error', () => {
    const Page = requireAIChat()
    render(<Page />)
    // The header has a button with an X icon; use role=button and pick the clickable with the icon inside
    const buttons = screen.getAllByRole('button')
    // The send button is also a button; find the one in the header by finding the X icon container
    // If heuristic fails, fallback to clicking the last button
    fireEvent.click(buttons[buttons.length - 1])

    expect((window as any).close).toHaveBeenCalled()
  })

  test('renders message timestamps in hh:mm format', () => {
    const Page = requireAIChat()
    render(<Page />)
    // There should be at least one timestamp element; check format with digits:digits
    const timeElems = screen.getAllByText(/\d{2}:\d{2}/)
    expect(timeElems.length).toBeGreaterThan(0)
  })
})
