import { useState, useEffect, useRef } from 'react'
import { ChatMessage, RideData } from '../models/RideData'
import '../styles/ChatWindow.css'

interface ChatWindowProps {
  driver: RideData
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  onClose?: () => void
}

export default function ChatWindow({ driver, messages, onSendMessage, onClose }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (inputValue.trim()) {
      setIsLoading(true)
      onSendMessage(inputValue)
      setInputValue('')
      // Simulate send delay
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-driver-info">
          <h3>{driver.driverName}</h3>
          <span className="status">🟢 Online</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation with {driver.driverName}</p>
            <p className="hint">Send a message to confirm your location or ask questions</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">
                <p>{msg.message}</p>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message... (Enter to send)"
          className="chat-input"
          disabled={isLoading}
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="send-btn"
        >
          {isLoading ? '📤 Sending...' : '📤 Send'}
        </button>
      </div>

      <div className="chat-footer">
        <p className="footer-hint">💡 Keep messages brief and focused</p>
      </div>
    </div>
  )
}
