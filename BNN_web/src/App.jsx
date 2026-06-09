import { useState, useEffect, useRef } from 'react'
import './App.css'

// Static Nodes in the B#NN network topology
const NODES = [
  { id: 'ollama', x: 450, y: 50, label: 'Ollama LLM', role: 'server', icon: '🧠', color: '#aa3bff', device: 'Local AI Brain' },
  { id: 'gateway', x: 450, y: 130, label: 'BLE Gateway', role: 'gateway', icon: '💻', color: '#00e5ff', device: 'Gateway Server' },
  { id: 'relay_a', x: 250, y: 210, label: 'Relay Phone A', role: 'relay', icon: '📱', color: '#ff9800', device: 'Android Phone' },
  { id: 'relay_b', x: 650, y: 210, label: 'Relay Phone B', role: 'relay', icon: '📱', color: '#ff9800', device: 'Android Phone' },
  { id: 'esp32_bot', x: 150, y: 290, label: 'ESP32 Client', role: 'client', icon: '🤖', color: '#00ff66', device: 'IoT Robot' },
  { id: 'client_c', x: 350, y: 290, label: 'Client Phone C', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' },
  { id: 'client_d', x: 550, y: 290, label: 'Client Phone D', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' },
  { id: 'client_e', x: 750, y: 290, label: 'Client Phone E', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' }
]

const CONNECTIONS = [
  { from: 'esp32_bot', to: 'relay_a', type: 'ble' },
  { from: 'client_c', to: 'relay_a', type: 'ble' },
  { from: 'client_d', to: 'relay_b', type: 'ble' },
  { from: 'client_e', to: 'relay_b', type: 'ble' },
  { from: 'relay_a', to: 'gateway', type: 'ble' },
  { from: 'relay_b', to: 'gateway', type: 'ble' },
  { from: 'gateway', to: 'ollama', type: 'local' }
]

const SERVER_SETUP_CODE = `# Install Python server requirements
pip install flask flask-cors requests

# Run B#NN Ollama local wrapper
python server.py

# Expected Output:
# [B#NN-API] B#NN Flask API starting on 0.0.0.0:5000`

const GATEWAY_SETUP_CODE = `# Run the BLE gateway (Linux requires root for BLE operations)
sudo python ble_gateway.py

# Expected Output:
# [B#NN-GATEWAY] BLE Central scanning for advertisements...`

// Mock Offline AI generator based on keywords
function generateOfflineResponse(prompt) {
  const lower = prompt.toLowerCase()
  if (lower.includes('mesh') || lower.includes('flooding') || lower.includes('hop')) {
    return 'B#NN flooding protocol uses decentralized relays. Each packet features a unique msg_id for caching and deduplication. Each time a node relays, it decrements the ttl (Time-to-Live). If ttl reaches 0, the packet is discarded, preventing endless routing loops.'
  }
  if (lower.includes('ollama') || lower.includes('model') || lower.includes('llama')) {
    return 'The gateway runs server.py which interfaces with Ollama. It accepts POST queries at http://localhost:5000/chat and returns LLM outputs locally, typically utilizing compact models (e.g. Llama-3.2-3B or Phi3) to remain CPU and RAM efficient offline.'
  }
  if (lower.includes('esp32') || lower.includes('arduino') || lower.includes('robot')) {
    return 'ESP32 IoT nodes query the mesh using simple BLE serial configurations. They scan for advertisements starting with "BNN" and exchange chunked payloads of up to 512 bytes with nearby Relay Phones.'
  }
  if (lower.includes('support') || lower.includes('coffee')) {
    return 'Support this project by donating to the B#NN creator at: https://buymeacoffee.com/arunshekhar. Offline AI is made possible by open-source contributions!'
  }
  return `Offline Mesh Simulation Active.\n[Path: Client ➔ Relay Phone ➔ Gateway Laptop ➔ Ollama (llama3.2)].\nQuery processed locally: "${prompt}".\nResponse: Decoupled offline mesh operations are healthy. Configure server.py and ble_gateway.py to run live.`
}

// Select a random prompt from preset list (pure helper to bypass ESLint hook constraints)
function getRandomSimulatedPrompt() {
  const prompts = [
    'How does BLE relay work?',
    'Read temperature from robot sensors',
    'Verify BLE connection strength',
    'Calculate routing hops to server'
  ]
  return prompts[Math.floor(Math.random() * prompts.length)]
}

function App() {
  const [inputMessage, setInputMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'system',
      text: 'B#NN Mesh Web Interface Initialized. Status: Awaiting connection check...',
      time: new Date().toLocaleTimeString()
    }
  ])
  const [serverStatus, setServerStatus] = useState('simulated') // 'online' | 'offline' | 'simulated'
  const [activeModel, setActiveModel] = useState('llama3.2:latest')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('quickstart')
  const [copiedText, setCopiedText] = useState('')

  // Packet animation states for the Canvas visualizer
  const [, setActivePackets] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)

  const chatEndRef = useRef(null)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Probe local B#NN server on mount
  useEffect(() => {
    const activateSimulatedMode = () => {
      setServerStatus('simulated')
      setChatHistory(prev => [
        ...prev,
        {
          role: 'system',
          text: 'Local Flask server not detected. B#NN Web running in Simulated Offline Mesh mode. Mesh routing & flooding calculations active.',
          time: new Date().toLocaleTimeString()
        }
      ])
    }

    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:5000/health')
        if (response.ok) {
          const data = await response.json()
          setServerStatus('online')
          if (data.model) setActiveModel(data.model)
          
          setChatHistory(prev => [
            ...prev,
            {
              role: 'system',
              text: `Connected to B#NN Flask API at http://localhost:5000. Running model: ${data.model || 'unknown'}. Ready for chat.`,
              time: new Date().toLocaleTimeString()
            }
          ])
        } else {
          activateSimulatedMode()
        }
      } catch {
        activateSimulatedMode()
      }
    }

    checkServer()
  }, [])

  // Start packet animation
  const triggerPacketAnimation = (sourceNodeId, payloadText, callback) => {
    // Find routing path to server
    let path
    if (sourceNodeId === 'esp32_bot' || sourceNodeId === 'client_c') {
      path = [sourceNodeId, 'relay_a', 'gateway', 'ollama']
    } else if (sourceNodeId === 'client_d' || sourceNodeId === 'client_e') {
      path = [sourceNodeId, 'relay_b', 'gateway', 'ollama']
    } else if (sourceNodeId === 'relay_a' || sourceNodeId === 'relay_b') {
      path = [sourceNodeId, 'gateway', 'ollama']
    } else {
      path = ['gateway', 'ollama']
    }

    const msgId = Math.random().toString(36).substring(2, 7)
    
    // Add forward packet
    const newPacket = {
      id: Math.random().toString(),
      path,
      currentIndex: 0,
      progress: 0,
      direction: 'forward',
      color: '#00ff66',
      payload: payloadText,
      msgId,
      ttl: 5 - path.length,
      callback
    }

    setActivePackets(prev => [...prev, newPacket])
  }

  // Canvas Drawing & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let lineDashOffset = 0

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      canvas.width = parent.clientWidth * window.devicePixelRatio
      canvas.height = 360 * window.devicePixelRatio
      canvas.style.width = '100%'
      canvas.style.height = '360px'
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const draw = () => {
      // Clear
      ctx.fillStyle = '#020204'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const virtualWidth = 900
      const virtualHeight = 360
      const scaleX = canvas.width / (window.devicePixelRatio * virtualWidth)
      const scaleY = 360 / virtualHeight
      const scale = Math.min(scaleX, scaleY)
      const offsetX = (canvas.width / window.devicePixelRatio - virtualWidth * scale) / 2
      const offsetY = 10

      // Draw grid details in visualizer background
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.02)'
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width / window.devicePixelRatio; i += 20) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
      }
      for (let i = 0; i < canvas.height / window.devicePixelRatio; i += 20) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(canvas.width, canvas.height)
        ctx.stroke()
      }

      lineDashOffset -= 0.3

      // Draw connection lines
      CONNECTIONS.forEach(conn => {
        const fromNode = NODES.find(n => n.id === conn.from)
        const toNode = NODES.find(n => n.id === conn.to)
        if (!fromNode || !toNode) return

        const x1 = fromNode.x * scale + offsetX
        const y1 = fromNode.y * scale + offsetY
        const x2 = toNode.x * scale + offsetX
        const y2 = toNode.y * scale + offsetY

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        
        if (conn.type === 'ble') {
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.lineDashOffset = lineDashOffset
        } else {
          ctx.strokeStyle = 'rgba(170, 59, 255, 0.3)'
          ctx.lineWidth = 2
          ctx.setLineDash([])
        }
        ctx.stroke()
      })
      ctx.setLineDash([]) // Reset

      // Update and Draw active packets
      setActivePackets(prevPackets => {
        const remainingPackets = []
        
        prevPackets.forEach(pkt => {
          const updatedPkt = { ...pkt }
          updatedPkt.progress += 0.025 // speed

          if (updatedPkt.progress >= 1) {
            updatedPkt.progress = 0
            updatedPkt.currentIndex += 1
          }

          const isLastSegment = updatedPkt.currentIndex >= updatedPkt.path.length - 1
          
          if (isLastSegment && updatedPkt.progress === 0) {
            // Reached destination
            if (updatedPkt.direction === 'forward') {
              // Trigger AI query, and start response packet
              const replyPath = [...updatedPkt.path].reverse()
              const replyPkt = {
                id: Math.random().toString(),
                path: replyPath,
                currentIndex: 0,
                progress: 0,
                direction: 'reply',
                color: '#aa3bff',
                payload: 'AI RESPONSE',
                msgId: updatedPkt.msgId,
                ttl: 4,
                callback: updatedPkt.callback
              }
              remainingPackets.push(replyPkt)
            } else {
              // Reply arrived back to sender
              if (updatedPkt.callback) {
                updatedPkt.callback()
              }
            }
          } else if (!isLastSegment) {
            // Draw particle
            const fromId = updatedPkt.path[updatedPkt.currentIndex]
            const toId = updatedPkt.path[updatedPkt.currentIndex + 1]
            const fromNode = NODES.find(n => n.id === fromId)
            const toNode = NODES.find(n => n.id === toId)
            
            if (fromNode && toNode) {
              const px = (fromNode.x + (toNode.x - fromNode.x) * updatedPkt.progress) * scale + offsetX
              const py = (fromNode.y + (toNode.y - fromNode.y) * updatedPkt.progress) * scale + offsetY

              // Outer Glow
              ctx.shadowColor = updatedPkt.color
              ctx.shadowBlur = 10
              ctx.fillStyle = updatedPkt.color
              ctx.beginPath()
              ctx.arc(px, py, 5, 0, Math.PI * 2)
              ctx.fill()
              ctx.shadowBlur = 0 // reset shadow
              
              // Draw payload label
              ctx.fillStyle = '#ffffff'
              ctx.font = '9px "Share Tech Mono"'
              ctx.textAlign = 'center'
              ctx.fillText(
                `${updatedPkt.direction === 'forward' ? 'PROMPT' : 'RESP'} (ttl:${updatedPkt.ttl})`, 
                px, 
                py - 8
              )
            }
            remainingPackets.push(updatedPkt)
          }
        })
        return remainingPackets
      })

      // Draw Nodes
      NODES.forEach(node => {
        const nx = node.x * scale + offsetX
        const ny = node.y * scale + offsetY

        // Draw shadow/glow behind selected node
        const isHovered = selectedNode && selectedNode.id === node.id
        
        ctx.shadowColor = node.color
        ctx.shadowBlur = isHovered ? 15 : 4
        ctx.fillStyle = isHovered ? 'rgba(0, 0, 0, 0.9)' : '#0d0d14'
        ctx.strokeStyle = isHovered ? '#ffffff' : node.color
        ctx.lineWidth = isHovered ? 2 : 1
        
        ctx.beginPath()
        ctx.arc(nx, ny, 18, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0 // reset

        // Draw Emoji Icon
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.icon, nx, ny)

        // Draw Node labels
        ctx.fillStyle = isHovered ? '#ffffff' : 'var(--text-primary)'
        ctx.font = '11px "Share Tech Mono"'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, nx, ny + 32)

        ctx.fillStyle = 'var(--text-muted)'
        ctx.font = '9px "Share Tech Mono"'
        ctx.fillText(node.device, nx, ny + 44)
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [selectedNode])

  // Mouse hover event on Canvas
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    
    // Scale event coordinates
    const scaleY = 360 / rect.height

    // Adjust for offset calculations inside canvas drawing
    const scale = Math.min(rect.width / 900, rect.height / 360)
    const offsetX = (rect.width - 900 * scale) / 2
    const adjX = (e.clientX - rect.left - offsetX) * (900 / (rect.width - offsetX * 2))
    
    let foundNode = null
    NODES.forEach(node => {
      const dx = adjX - node.x
      const dy = (e.clientY - rect.top) * scaleY - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 25) {
        foundNode = node
      }
    })

    setSelectedNode(foundNode)
  }

  // Handle Client Node click to send random message
  const handleCanvasClick = () => {
    if (selectedNode && selectedNode.role === 'client') {
      const prompt = getRandomSimulatedPrompt()
      setInputMessage(prompt)
      triggerChat(prompt, selectedNode.id)
    }
  }

  // Main Chat Trigger
  const triggerChat = async (messageText, deviceId = 'web_user') => {
    if (!messageText.trim() || isLoading) return
    setIsLoading(true)

    // Append user message
    const userMsg = {
      role: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString(),
      device: deviceId
    }
    setChatHistory(prev => [...prev, userMsg])
    setInputMessage('')

    // Start mesh animation in visualizer
    triggerPacketAnimation(deviceId === 'web_user' ? 'client_c' : deviceId, messageText, async () => {
      // Callback executed when reply packet returns to sender
      const startTime = Date.now()

      if (serverStatus === 'online') {
        try {
          const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: messageText,
              device_id: deviceId
            })
          })

          if (response.ok) {
            const data = await response.json()
            const elapsed = Date.now() - startTime
            
            setChatHistory(prev => [
              ...prev,
              {
                role: 'ai',
                text: data.response,
                time: new Date().toLocaleTimeString(),
                latency: data.latency_ms || elapsed,
                model: data.model || activeModel,
                hops: deviceId === 'web_user' ? ['Relay A', 'Gateway'] : ['Direct Gateway']
              }
            ])
          } else {
            handleFailedQuery(messageText, startTime)
          }
        } catch {
          handleFailedQuery(messageText, startTime)
        } finally {
          setIsLoading(false)
        }
      } else {
        // Simulated mode response
        setTimeout(() => {
          const elapsed = Date.now() - startTime
          const mockText = generateOfflineResponse(messageText)
          setChatHistory(prev => [
            ...prev,
            {
              role: 'ai',
              text: mockText,
              time: new Date().toLocaleTimeString(),
              latency: elapsed + 180,
              model: 'simulated-llama3.2',
              hops: deviceId === 'web_user' ? ['Relay A', 'Gateway'] : ['Relay B', 'Gateway']
            }
          ])
          setIsLoading(false)
        }, 800)
      }
    })
  }

  const handleFailedQuery = (messageText, startTime) => {
    const elapsed = Date.now() - startTime
    setChatHistory(prev => [
      ...prev,
      {
        role: 'system',
        text: 'Warning: Failed to reach Flask server. Resolving locally via simulated fallback...',
        time: new Date().toLocaleTimeString()
      },
      {
        role: 'ai',
        text: generateOfflineResponse(messageText),
        time: new Date().toLocaleTimeString(),
        latency: elapsed + 200,
        model: 'simulated-llama3.2',
        hops: ['Local Fallback']
      }
    ])
  }

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(''), 2000)
  }

  return (
    <>
      {/* HEADER SECTION */}
      <header className="header-container">
        <div className="ascii-logo">
{`██████╗     ██╗  ██╗███╗   ██╗███╗   ██╗
██╔══██╗    ██║  ██║████╗  ██║████╗  ██║
██████╔╝  ████████████╔██╗ ██║██╔██╗ ██║
██╔══██╗  ╚═══██╔═══██║╚██╗██║██║╚██╗██║
██████╔╝      ██║  ██║  ╚████║██║ ╚████║
╚═════╝       ╚═╝  ╚═╝   ╚═══╝╚═╝  ╚═══╝`}
        </div>
        <div className="sub-slogan">Offline BLE AI Mesh Network</div>
        <p style={{ maxWidth: '600px', margin: '15px auto', fontSize: '0.95rem' }}>
          b#nn is a decentralized offline messaging and intelligence network. Run a model on a central laptop/gateway, and let devices chat, command, and interact over Bluetooth Low Energy mesh without internet.
        </p>
      </header>

      {/* TOPOLOGY VISUALIZER & CHAT SANDBOX */}
      <div className="grid-layout">
        
        {/* Topology Visualizer Panel */}
        <div className="glass-panel glow-border" style={{ padding: '20px' }}>
          <div className="panel-title">
            <span className={`status-dot ${serverStatus === 'online' ? 'online' : 'simulated'}`}></span>
            <h3>Mesh Topology Visualizer</h3>
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '-12px', marginBottom: '16px' }}>
            {selectedNode ? (
              <span className="glow-text">Hovering: {selectedNode.label} ({selectedNode.device}) {selectedNode.role === 'client' && '• Click to simulate prompt!'}</span>
            ) : (
              <span>Hover over nodes to inspect details. Click client nodes to trigger packets.</span>
            )}
          </p>
          <div className="visualizer-container">
            <canvas 
              ref={canvasRef} 
              className="visualizer-canvas"
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
            />
            <div className="visualizer-controls">
              <button 
                className="visualizer-btn"
                onClick={() => {
                  const clientNodes = ['esp32_bot', 'client_c', 'client_d', 'client_e']
                  const randomClient = clientNodes[Math.floor(Math.random() * clientNodes.length)]
                  triggerChat('Mesh query ping test...', randomClient)
                }}
              >
                ⚡ Inject Mesh Probe
              </button>
              <div className="visualizer-legend">
                <span><span style={{color: '#aa3bff'}}>●</span> Server</span>
                <span><span style={{color: '#ff9800'}}>●</span> Relay</span>
                <span><span style={{color: '#00ff66'}}>●</span> Client</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Terminal Panel */}
        <div className="glass-panel glow-border" style={{ padding: '20px' }}>
          <div className="panel-title">
            <span className="glow-text" style={{ fontFamily: 'var(--mono)' }}>&gt;_ Sandbox Terminal</span>
          </div>
          <div className="terminal-chat">
            <div className="chat-history">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-msg ${msg.role}`}>
                  <div>{msg.text}</div>
                  <div className="chat-meta">
                    <span>[{msg.time}] {msg.device ? `via ${msg.device}` : ''}</span>
                    {msg.latency && (
                      <span className="glow-text">
                        {msg.latency}ms {msg.model ? `• [${msg.model}]` : ''} 
                        {msg.hops ? ` • hops: ${msg.hops.join(' ➔ ')}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <form 
              className="chat-input-area" 
              onSubmit={(e) => {
                e.preventDefault()
                triggerChat(inputMessage)
              }}
            >
              <input 
                type="text" 
                className="chat-input" 
                placeholder="Type prompt to send through mesh..." 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="chat-send-btn"
                disabled={isLoading || !inputMessage.trim()}
              >
                {isLoading ? 'Relaying...' : 'Send'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* SOFTWARE CARD MATRIX */}
      <h2 style={{ textAlign: 'center', margin: '40px 0 20px' }} className="glow-text">System Software Components</h2>
      <div className="software-grid">
        
        {/* Python Server & Gateway */}
        <div className="software-card">
          <h3>
            Server / Gateway 
            <span className="software-badge purple">Python</span>
          </h3>
          <p>
            The Python server manages the Ollama local AI API wrapping. The Gateway acts as the BLE Central, scanning for mesh packets and forwarding queries to Ollama.
          </p>
          <a href="file:///x:/Users/bitai/bnn-server" className="software-link">
            <span>Explore bnn-server/</span>
            <span>➔</span>
          </a>
        </div>

        {/* Android Client & Relay */}
        <div className="software-card">
          <h3>
            Android Node
            <span className="software-badge green">Kotlin</span>
          </h3>
          <p>
            BLE peripheral Android application featuring full Chat UI and Relay Mode. Acts as a mesh relay to hop packets from remote devices to the local Server.
          </p>
          <a href="file:///x:/Users/bitai/android" className="software-link">
            <span>Explore android/</span>
            <span>➔</span>
          </a>
        </div>

        {/* ESP32 Client Code */}
        <div className="software-card">
          <h3>
            ESP32 / IoT Node
            <span className="software-badge cyan">Arduino C++</span>
          </h3>
          <p>
            Firmware for microcontrollers and embedded clients. Features GATT Client initialization, scanning, and sensor payload broadcasting to B#NN meshes.
          </p>
          <a href="file:///x:/Users/bitai/esp32_client" className="software-link">
            <span>Explore esp32_client/</span>
            <span>➔</span>
          </a>
        </div>

      </div>

      {/* DOCUMENTATION & SETUPS SECTION */}
      <div className="glass-panel glow-border tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'quickstart' ? 'active' : ''}`}
            onClick={() => setActiveTab('quickstart')}
          >
            Quickstart Setup
          </button>
          <button 
            className={`tab-btn ${activeTab === 'packet' ? 'active' : ''}`}
            onClick={() => setActiveTab('packet')}
          >
            BLE Packet Schema
          </button>
          <button 
            className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            Mesh Specifications
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'quickstart' && (
            <div>
              <h4>1. Configure Flask Server wrapper for Ollama</h4>
              <p>Initialize Python environments, run local Ollama models, and boot up the chat API wrapper:</p>
              <div className="terminal-code">
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyCode(SERVER_SETUP_CODE, 'server')}
                >
                  {copiedText === 'server' ? 'Copied!' : 'Copy'}
                </button>
                <pre><code>{SERVER_SETUP_CODE}</code></pre>
              </div>

              <h4>2. Configure BLE Central Gateway</h4>
              <p>Run the BLE Central daemon to discover mesh clients and parse serial advertisements:</p>
              <div className="terminal-code">
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyCode(GATEWAY_SETUP_CODE, 'gateway')}
                >
                  {copiedText === 'gateway' ? 'Copied!' : 'Copy'}
                </button>
                <pre><code>{GATEWAY_SETUP_CODE}</code></pre>
              </div>
            </div>
          )}

          {activeTab === 'packet' && (
            <div>
              <h4>Managed Flooding BLE Packet Format</h4>
              <p>B#NN packets are JSON strings transmitted over BLE Characteristics. The structure utilizes metadata tracking to prevent mesh loops:</p>
              <div className="terminal-code">
                <pre><code>{`{
  "msg_id": "e8a1f",      // Unique string to avoid looping / deduplication
  "sender": "esp32_bot",  // Device ID of originating node
  "recipient": "gateway", // target recipient node id
  "ttl": 4,               // Hops limit. Decremented on each relay.
  "part": 1,              // For chunked responses (e.g. part 1 of 4)
  "total": 3,             // Total payload chunk count
  "payload": "Hi Ollama"  // Prompt / response contents
}`}</code></pre>
              </div>
              <h4>UUID Reference Values</h4>
              <ul>
                <li><strong>Service UUID:</strong> <code>12345678-1234-1234-1234-1234567890ab</code></li>
                <li><strong>Chat Write Characteristic:</strong> <code>12345678-1234-1234-1234-1234567890ac</code> (Client ➔ Server)</li>
                <li><strong>Chat Read/Notify Characteristic:</strong> <code>12345678-1234-1234-1234-1234567890ad</code> (Server ➔ Client)</li>
              </ul>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div>
              <h4>Managed Flooding Algorithm</h4>
              <p>To keep BLE mesh reliable without a complex routing table, B#NN implements a **Managed Flooding** protocol:</p>
              <ul>
                <li><strong>Loop Prevention:</strong> Each node maintains a buffer of recently seen <code>msg_id</code> signatures. If a packet matches a cached signature, it is discarded immediately.</li>
                <li><strong>Range Extension:</strong> If a packet has not been seen, the node decrements the <code>ttl</code> by 1. If <code>ttl &gt; 0</code>, the node re-broadcasts the packet over BLE advertisements.</li>
                <li><strong>Chunked Assemblies:</strong> Since BLE payload limits (MTUs) range typically from 20 to 512 bytes, large prompts or AI model replies are automatically chunked, cataloged with <code>part</code>/<code>total</code> indices, and re-assembled by the target receiver.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SUPPORT BANNER */}
      <section className="support-banner">
        <h3>Support B#NN Open Source Development</h3>
        <p style={{ maxWidth: '500px', margin: '0' }}>
          This offline BLE AI network is free and open-source. Help support active hardware integrations and software releases!
        </p>
        <a 
          href="https://buymeacoffee.com/arunshekhar" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="coffee-btn"
        >
          <span className="coffee-icon">☕</span>
          Buy Me a Coffee
        </a>
      </section>

      {/* FOOTER */}
      <footer className="footer-info">
        <p>B#NN — B Hash Neural Network • Public Domain Release • permissionlesstech</p>
      </footer>
    </>
  )
}

export default App
