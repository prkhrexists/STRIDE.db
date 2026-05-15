'use client';

import React, { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetch('/api/inspector/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data.status))
      .catch(() => setHealthStatus('offline'));

    const saved = localStorage.getItem('aegis_chat_v2');
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([{ role: 'assistant', content: 'Hello Operator. I am AEGIS-Inspector. How can I assist with your structural data analysis today?' }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aegis_chat_v2', JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideMsg?: string) => {
    const text = overrideMsg || input;
    if (!text.trim() || isStreaming) return;

    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/inspector/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, conversationId: 'session_1' })
      });

      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantMsg = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices?.[0]?.delta?.content || '';
                assistantMsg += delta;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1].content = assistantMsg;
                  return copy;
                });
              } catch(e) {}
            }
          }
        }
      }
    } catch(err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection lost. Please try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    const init = [{ role: 'assistant' as const, content: 'Hello Operator. I am AEGIS-Inspector. History cleared.' }];
    setMessages(init);
    localStorage.setItem('aegis_chat_v2', JSON.stringify(init));
  };

  const renderContent = (text: string) => {
    // Basic Markdown Table Parser
    if (text.includes('|---')) {
      const rows = text.split('\n').filter(r => r.includes('|'));
      return (
        <div style={{ overflowX: 'auto', marginTop: '1rem', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #30363d', fontSize: '0.875rem' }}>
            <tbody>
              {rows.map((row, i) => {
                if (row.includes('|---')) return null;
                const cols = row.split('|').filter(c => c.trim() !== '');
                const isHeader = i === 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #30363d', backgroundColor: isHeader ? '#161b22' : 'transparent' }}>
                    {cols.map((col, j) => (
                      <td key={j} style={{ padding: '0.5rem', fontWeight: isHeader ? 'bold' : 'normal', textAlign: 'left' }}>
                        {col.trim()}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Replace Flight references with chips
    const parts = text.split(/(Flight \d+)/g);
    return parts.map((part, i) => {
      if (part.match(/Flight \d+/)) {
        return (
          <span 
            key={i} 
            onClick={() => router.push('/map')}
            style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '9999px', padding: '0.1rem 0.6rem', color: '#58a6ff', cursor: 'pointer', fontSize: '0.875rem', margin: '0 0.2rem' }}
          >
            {part} ↗
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <PageShell title="AEGIS-Inspector" backHref="/">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)', margin: '-1.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui' }}>
        
        {/* Top Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161b22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: healthStatus === 'online' ? '#238636' : healthStatus === 'checking' ? '#eab308' : '#da3633' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{healthStatus.toUpperCase()}</span>
            </div>
            <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#8b949e' }}>
              sarvam-m
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(35, 134, 54, 0.1)', border: '1px solid rgba(35, 134, 54, 0.4)', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#2ea043' }}>
               Context: 2 flights, 2 defects loaded
               <button style={{ background: 'none', border: 'none', color: '#2ea043', cursor: 'pointer', marginLeft: '0.2rem' }}>↻</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={clearHistory} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#8b949e', border: '1px solid #30363d', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>Clear History</button>
            <button onClick={() => router.push('/files?auto=true')} style={{ padding: '0.5rem 1rem', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}>Generate Report</button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem', textAlign: m.role === 'user' ? 'right' : 'left', textTransform: 'uppercase' }}>
                {m.role === 'user' ? 'Operator' : 'AEGIS-Inspector'}
              </div>
              <div style={{ 
                padding: '0.75rem 1rem', 
                borderRadius: '0.5rem', 
                backgroundColor: m.role === 'user' ? '#1f6feb' : '#1c2128', 
                color: m.role === 'user' ? '#fff' : '#c9d1d9',
                border: m.role === 'user' ? 'none' : '1px solid #30363d',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {renderContent(m.content)}
                {isStreaming && i === messages.length - 1 && <span style={{ animation: 'blink 1s step-end infinite' }}>▋</span>}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1].role === 'user' && (
            <div style={{ alignSelf: 'flex-start', color: '#8b949e', fontSize: '1.5rem', letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>...</div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#161b22', borderTop: '1px solid #30363d' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem' }}>
            {['Summarize latest critical defects', 'Which zone needs repair first?', 'IS:456 compliance check', 'Compare Flight 1 vs 2'].map(q => (
              <button 
                key={q} 
                onClick={() => handleSend(q)}
                style={{ padding: '0.375rem 0.75rem', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '9999px', color: '#8b949e', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {q}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any flight, defect, or structural risk..."
              style={{ width: '100%', height: '80px', padding: '0.75rem 3rem 0.75rem 1rem', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '0.5rem', resize: 'none', fontFamily: 'inherit', fontSize: '0.875rem' }}
            />
            <button 
              onClick={() => handleSend()}
              disabled={isStreaming || !input.trim()}
              style={{ position: 'absolute', right: '1rem', bottom: '1rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.25rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (isStreaming || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (isStreaming || !input.trim()) ? 0.5 : 1 }}
            >
              ↑
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#8b949e', marginTop: '0.5rem' }}>
            Enter to send, Shift+Enter for new line. AI can make mistakes. Check critical structural decisions.
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes blink { 50% { opacity: 0; } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}} />
      </div>
    </PageShell>
  );
}
