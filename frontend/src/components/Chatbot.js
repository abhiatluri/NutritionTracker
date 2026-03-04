import React, { useState } from 'react';
import axios from 'axios';
import { MessageCircle, Send, AlertTriangle } from 'lucide-react';

const Chatbot = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hi! Ask me anything about your meals, nutrition, or goals and I will use your meal history to answer.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const resp = await axios.post('/chatbot', {
        user_id: user.id,
        question: trimmed,
      });

      if (resp.data && resp.data.success) {
        const answerText = resp.data.answer || 'No answer returned.';
        const botMessage = {
          id: Date.now() + 1,
          sender: 'assistant',
          text: answerText,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const msg = resp.data?.error || 'Something went wrong. Please try again.';
        setError(msg);
        const botMessage = {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `Sorry, I ran into an issue: ${msg}`,
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Network error';
      setError(msg);
      const botMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `Sorry, I couldn’t reach the server: ${msg}`,
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="flex flex-between mb-4">
        <h1
          style={{
            color: '#ffffff',
            backgroundColor: '#6f42c1',
            margin: 0,
            fontWeight: 'bold',
            fontSize: '2rem',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MessageCircle size={24} />
          Nutrition Assistant
        </h1>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa',
            marginBottom: '16px',
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: m.sender === 'user' ? '#667eea' : '#ffffff',
                  color: m.sender === 'user' ? '#ffffff' : '#212529',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              Assistant is thinking…
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#fff3cd',
              color: '#856404',
              fontSize: '0.9rem',
            }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask something like "What was my average protein intake last week?"'
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '8px',
              border: '2px solid #e1e5e9',
              fontSize: '1rem',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: loading || !input.trim() ? '#adb5bd' : '#667eea',
              color: 'white',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              fontWeight: 600,
            }}
          >
            <Send size={18} />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;

