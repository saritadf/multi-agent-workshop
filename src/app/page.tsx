"use client";
import { useState, useRef } from "react";

type Utterance = { 
  role: string; 
  content: string; 
  mockupData?: any;
  mockupUrl?: string;
};
type StreamEvent = {
  type: 'agent_start' | 'agent_response' | 'round_start' | 'moderator_start' | 'moderator_response' | 'complete' | 'question' | 'mockup_generated';
  agent?: string;
  content?: string;
  round?: number;
  question?: string;
  mockupUrl?: string;
  mockupData?: any;
};

export default function Page() {
  const [idea, setIdea] = useState("");
  const [rounds, setRounds] = useState(2);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<Utterance[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<{agent: string, question: string} | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTranscript([]);
    setSummary("");
    setCurrentStatus("Iniciando debate...");
    setPendingQuestion(null);
    
    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const res = await fetch("/api/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, rounds, streaming: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              console.log("Parsing data:", data); // Debug log
              const event: StreamEvent = JSON.parse(data);
              handleStreamEvent(event);
            } catch (e) {
              console.error('Error parsing event:', e, 'Raw data:', data);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || "Unexpected error");
      }
    } finally {
      setLoading(false);
      setCurrentStatus("");
      abortControllerRef.current = null;
    }
  }

  function handleStreamEvent(event: StreamEvent) {
    console.log("Received event:", event); // Debug log
    
    switch (event.type) {
      case 'round_start':
        setCurrentStatus(`🔄 Round ${event.round}`);
        break;
      case 'agent_start':
        // Agent thinking status removed
        break;
      case 'agent_response':
        console.log('Adding to transcript:', { 
          role: event.agent!, 
          content: event.content!,
          mockupData: event.mockupData 
        });
        setTranscript(prev => [...prev, { 
          role: event.agent!, 
          content: event.content!,
          mockupData: event.mockupData 
        }]);
        setCurrentStatus("");
        break;
      case 'mockup_generated':
        // Update the last transcript entry with the mockup URL
        setTranscript(prev => {
          const updated = [...prev];
          const lastIndex = updated.findLastIndex(u => u.role === event.agent);
          if (lastIndex >= 0) {
            updated[lastIndex] = { ...updated[lastIndex], mockupUrl: event.mockupUrl };
          }
          return updated;
        });
        setCurrentStatus(`🎨 Generated ${event.agent} mockup`);
        setTimeout(() => setCurrentStatus(""), 2000);
        break;
      case 'question':
        // First add the response to transcript
        setTranscript(prev => [...prev, { role: event.agent!, content: event.content! }]);
        // Then show the question
        setPendingQuestion({ agent: event.agent!, question: event.question! });
        setCurrentStatus(`❓ ${event.agent} has a question`);
        break;
      case 'moderator_start':
        setCurrentStatus("📝 Moderator creating summary...");
        break;
      case 'moderator_response':
        console.log('Moderator response:', { content: event.content, mockupData: event.mockupData });
        setSummary(event.content!);
        setTranscript(prev => [...prev, { 
          role: "Moderator", 
          content: event.content!,
          mockupData: event.mockupData 
        }]);
        setCurrentStatus("");
        break;
      case 'complete':
        setCurrentStatus("Debate finished");
        setTimeout(() => setCurrentStatus(""), 3000);
        break;
    }
  }

  function formatMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold** to <strong>
      .replace(/### (.*?)$/gm, '<h3 style="font-size: 18px; font-weight: 700; margin: 16px 0 8px 0; color: #1e40af;">$1</h3>') // ### Headers
      .replace(/\* (.*?)$/gm, '<div style="margin: 4px 0; padding-left: 16px;">• $1</div>') // * bullets
      .replace(/=+/g, '') // Remove === lines
      .replace(/\n\n/g, '<br><br>') // Double newlines
      .replace(/\n/g, '<br>'); // Single newlines
  }

  function answerQuestion() {
    if (!pendingQuestion || !userResponse.trim()) return;
    
    // Add user response to transcript
    setTranscript(prev => [...prev, { 
      role: "You", 
      content: `Answer to ${pendingQuestion.agent}: ${userResponse}` 
    }]);
    
    setPendingQuestion(null);
    setUserResponse("");
    setCurrentStatus("Continuing debate...");
  }

  function cancelDebate() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setCurrentStatus("Debate cancelled");
    setTimeout(() => setCurrentStatus(""), 2000);
  }

  return (
    <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Multi-Agent: Product Workshop</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Direct discussion between Dev, Design, PM, Product and Business. No formalities, straight to the point.
      </p>
      
      {/* API Status */}
      <div style={{ 
        fontSize: "12px", 
        color: "#666", 
        marginBottom: "20px",
        padding: "8px 12px",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        border: "1px solid #e9ecef"
      }}>
        🎨 Visual mockups enabled with Replicate + Hugging Face APIs
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Idea</div>
          <textarea
            required
            minLength={10}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={3}
            placeholder="An app to connect seniors with digital mentors"
            style={{ width: "100%", padding: 12, fontSize: 14 }}
          />
        </label>
        <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
          <label>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Rounds</div>
            <input
              type="number"
              min={1}
              max={5}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              style={{ width: 80, padding: 8 }}
            />
          </label>
          <button 
            type="submit" 
            disabled={loading} 
            style={{ padding: "10px 14px", fontWeight: 600, backgroundColor: loading ? "#ccc" : "#007acc", color: "white", border: "none", borderRadius: "4px" }}
          >
            {loading ? "Debating..." : "Start Debate"}
          </button>
          {loading && (
            <button 
              type="button" 
              onClick={cancelDebate}
              style={{ padding: "10px 14px", fontWeight: 600, backgroundColor: "#cc0000", color: "white", border: "none", borderRadius: "4px" }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 16, padding: "10px", backgroundColor: "#ffebee", border: "1px solid #e57373", borderRadius: "4px" }}>
          Error: {error}
        </div>
      )}

      {transcript.length > 0 && (
        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Live Discussion</h2>
            <div style={{ background: "#fafafa", padding: 16, border: "1px solid #eee", borderRadius: "8px", maxHeight: "500px", overflowY: "auto" }}>
              {transcript.map((u, i) => {
                const isUser = u.role === "You";
                const roleColors = {
                  "Dev": "#ff6b35",
                  "Design": "#9c27b0", 
                  "PM": "#2196f3",
                  "Product": "#4caf50",
                  "Business": "#ff9800",
                  "You": "#1976d2"
                };
                
                return (
                  <div key={i} style={{ 
                    marginBottom: 16, 
                    padding: "12px", 
                    backgroundColor: isUser ? "#e3f2fd" : "white", 
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    borderLeft: `4px solid ${roleColors[u.role as keyof typeof roleColors] || "#333"}`
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      marginBottom: "8px" 
                    }}>
                      <div style={{ 
                        width: "8px", 
                        height: "8px", 
                        borderRadius: "50%", 
                        backgroundColor: roleColors[u.role as keyof typeof roleColors] || "#333",
                        marginRight: "8px"
                      }}></div>
                      <strong style={{ 
                        color: roleColors[u.role as keyof typeof roleColors] || "#333",
                        fontSize: "14px",
                        fontWeight: 600
                      }}>
                        {u.role}
                      </strong>
                    </div>
                    <div style={{ 
                      lineHeight: "1.5",
                      fontSize: "15px",
                      marginBottom: (u.mockupUrl || u.mockupData) ? "12px" : "0"
                    }}>
                      {u.role === 'Moderator' ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(u.content) }} />
                      ) : (
                        u.content
                      )}
                    </div>
                    
                    {/* Display structured mockup data */}
                    {u.mockupData && (
                      <div style={{ 
                        marginTop: "12px", 
                        padding: "12px", 
                        backgroundColor: "#f8f9fa", 
                        borderRadius: "6px",
                        border: "1px solid #dee2e6"
                      }}>
                        {u.mockupData.type === 'planning' && u.mockupData.phases && (
                          <div>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600 }}>📋 Project Planning</h4>
                            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#e9ecef" }}>
                                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #dee2e6" }}>Phase</th>
                                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #dee2e6" }}>Duration</th>
                                  <th style={{ padding: "6px", textAlign: "left", border: "1px solid #dee2e6" }}>Resources</th>
                                </tr>
                              </thead>
                              <tbody>
                                {u.mockupData.phases.map((phase: any, idx: number) => (
                                  <tr key={idx}>
                                    <td style={{ padding: "6px", border: "1px solid #dee2e6" }}>{phase.name}</td>
                                    <td style={{ padding: "6px", border: "1px solid #dee2e6" }}>{phase.duration}</td>
                                    <td style={{ padding: "6px", border: "1px solid #dee2e6" }}>{phase.resources}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {u.mockupData.budget && <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600 }}>Budget: {u.mockupData.budget}</div>}
                          </div>
                        )}
                        
                        {u.mockupData.type === 'architecture' && (
                          <div>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600 }}>⚙️ Technical Architecture</h4>
                            <div style={{ fontSize: "13px" }}>
                              <div><strong>Technologies:</strong> {u.mockupData.technologies?.join(', ')}</div>
                              <div><strong>Timeline:</strong> {u.mockupData.timeline}</div>
                              <div><strong>Complexity:</strong> {u.mockupData.complexity}</div>
                            </div>
                          </div>
                        )}
                        
                        {u.mockupData.type === 'wireframe' && (
                          <div>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600 }}>🎨 Design Wireframe</h4>
                            <div style={{ fontSize: "13px" }}>
                              <div><strong>Screens:</strong> {u.mockupData.screens?.join(', ')}</div>
                              <div><strong>Style:</strong> {u.mockupData.style}</div>
                              {u.mockupData.colors && <div><strong>Colors:</strong> 
                                {u.mockupData.colors.map((color: string, idx: number) => (
                                  <span key={idx} style={{ 
                                    display: 'inline-block', 
                                    width: '16px', 
                                    height: '16px', 
                                    backgroundColor: color, 
                                    marginLeft: '4px',
                                    border: '1px solid #ccc',
                                    borderRadius: '2px'
                                  }}></span>
                                ))}
                              </div>}
                            </div>
                          </div>
                        )}
                        
                        {u.mockupData.type === 'figma' && (
                          <div>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600 }}>🎨 Figma Design Mockup</h4>
                            <div style={{ fontSize: "13px" }}>
                              {u.mockupData.screens && u.mockupData.screens.map((screen: any, idx: number) => (
                                <div key={idx} style={{ 
                                  marginBottom: "12px", 
                                  padding: "10px", 
                                  backgroundColor: "#fafafa", 
                                  borderRadius: "6px",
                                  border: "1px solid #e0e0e0"
                                }}>
                                  <div style={{ fontWeight: 600, marginBottom: "6px", color: "#2563eb" }}>
                                    📱 {screen.name}
                                  </div>
                                  {screen.components && (
                                    <div style={{ display: "grid", gap: "4px" }}>
                                      {screen.components.map((component: string, compIdx: number) => (
                                        <div key={compIdx} style={{ 
                                          padding: "4px 8px", 
                                          backgroundColor: "white", 
                                          borderRadius: "4px",
                                          border: "1px solid #d1d5db",
                                          fontSize: "12px",
                                          fontFamily: "monospace"
                                        }}>
                                          {component.includes('button') ? (
                                            <span style={{ color: "#059669" }}>🔘 {component}</span>
                                          ) : component.includes('input') ? (
                                            <span style={{ color: "#dc2626" }}>📝 {component}</span>
                                          ) : component.includes('link') ? (
                                            <span style={{ color: "#2563eb" }}>🔗 {component}</span>
                                          ) : (
                                            <span style={{ color: "#6b7280" }}>▫️ {component}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                                {u.mockupData.style && (
                                  <div><strong>Style:</strong> {u.mockupData.style}</div>
                                )}
                                {u.mockupData.typography && (
                                  <div><strong>Typography:</strong> {u.mockupData.typography}</div>
                                )}
                                {u.mockupData.spacing && (
                                  <div><strong>Spacing:</strong> {u.mockupData.spacing}</div>
                                )}
                              </div>
                              {u.mockupData.colors && (
                                <div style={{ marginTop: "8px" }}>
                                  <strong>Color Palette:</strong>
                                  {u.mockupData.colors.map((color: string, idx: number) => (
                                    <span key={idx} style={{ 
                                      display: 'inline-block', 
                                      width: '20px', 
                                      height: '20px', 
                                      backgroundColor: color, 
                                      marginLeft: '6px',
                                      border: '1px solid #ccc',
                                      borderRadius: '4px',
                                      verticalAlign: 'middle'
                                    }}></span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {u.mockupData.type === 'business' && (
                          <div>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600 }}>💼 Business Model</h4>
                            <div style={{ fontSize: "13px" }}>
                              <div><strong>Revenue:</strong> {u.mockupData.revenue}</div>
                              <div><strong>Costs:</strong> {u.mockupData.costs}</div>
                              <div><strong>ROI:</strong> {u.mockupData.roi}</div>
                              {u.mockupData.model && <div><strong>Model:</strong> {u.mockupData.model}</div>}
                            </div>
                          </div>
                        )}
                        
                        {u.mockupData.type === 'product' && (
                          <div>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600 }}>📊 Product Metrics</h4>
                            <div style={{ fontSize: "13px" }}>
                              {u.mockupData.userJourney && <div><strong>User Journey:</strong> {u.mockupData.userJourney.join(' → ')}</div>}
                              {u.mockupData.kpis && <div><strong>KPIs:</strong> {u.mockupData.kpis.join(', ')}</div>}
                              {u.mockupData.features && <div><strong>Features:</strong> {u.mockupData.features.join(', ')}</div>}
                            </div>
                          </div>
                        )}
                        
                        {u.mockupData.type === 'summary' && (
                          <div>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 700, color: "#2563eb" }}>📋 Project Summary</h4>
                            <div style={{ display: "grid", gap: "12px", fontSize: "13px" }}>
                              {u.mockupData.decisions && (
                                <div style={{ padding: "8px", backgroundColor: "#f0f9ff", borderRadius: "4px" }}>
                                  <strong>🎯 Key Decisions:</strong>
                                  <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                                    {u.mockupData.decisions.map((decision: string, idx: number) => (
                                      <li key={idx}>{decision}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {u.mockupData.timeline && (
                                  <div style={{ padding: "8px", backgroundColor: "#fef3c7", borderRadius: "4px" }}>
                                    <strong>⏱️ Timeline:</strong> {u.mockupData.timeline}
                                  </div>
                                )}
                                {u.mockupData.budget && (
                                  <div style={{ padding: "8px", backgroundColor: "#dcfce7", borderRadius: "4px" }}>
                                    <strong>💰 Budget:</strong> {u.mockupData.budget}
                                  </div>
                                )}
                                {u.mockupData.team && (
                                  <div style={{ padding: "8px", backgroundColor: "#fce7f3", borderRadius: "4px" }}>
                                    <strong>👥 Team:</strong> {u.mockupData.team}
                                  </div>
                                )}
                              </div>
                              {u.mockupData.risks && (
                                <div style={{ padding: "8px", backgroundColor: "#fef2f2", borderRadius: "4px" }}>
                                  <strong>⚠️ Key Risks:</strong>
                                  <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                                    {u.mockupData.risks.map((risk: string, idx: number) => (
                                      <li key={idx}>{risk}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {u.mockupUrl && (
                      <div style={{ marginTop: "12px" }}>
                        <img 
                          src={u.mockupUrl} 
                          alt={`${u.role} mockup`}
                          style={{ 
                            maxWidth: "100%", 
                            height: "auto", 
                            borderRadius: "8px",
                            border: "1px solid #eee",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#666", 
                          marginTop: "4px",
                          fontStyle: "italic"
                        }}>
                          🎨 AI-generated {u.role.toLowerCase()} mockup
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Status and Questions at the bottom */}
          {pendingQuestion && (
            <div style={{ padding: "15px", backgroundColor: "#fff8e1", border: "2px solid #ffa000", borderRadius: "8px" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#f57c00" }}>
                {pendingQuestion.agent} asks:
              </h3>
              <p style={{ margin: "0 0 15px 0", fontStyle: "italic", fontSize: "16px" }}>
                {pendingQuestion.question}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder="Your answer..."
                  style={{ flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  onKeyPress={(e) => e.key === 'Enter' && answerQuestion()}
                />
                <button 
                  onClick={answerQuestion}
                  disabled={!userResponse.trim()}
                  style={{ padding: "8px 16px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "4px" }}
                >
                  Answer
                </button>
              </div>
            </div>
          )}

          {currentStatus && (
            <div style={{ 
              padding: "12px", 
              backgroundColor: "#f0f8ff", 
              border: "1px solid #007acc", 
              borderRadius: "4px",
              textAlign: "center",
              fontWeight: 500
            }}>
              {currentStatus}
            </div>
          )}
          
          {summary && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Moderator Summary</h2>
              <div style={{ 
                background: "#f8fafc", 
                padding: 20, 
                border: "1px solid #e2e8f0", 
                borderRadius: "12px",
                fontSize: "15px",
                lineHeight: "1.6"
              }}>
                <div 
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }}
                  style={{ color: "#334155" }}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}