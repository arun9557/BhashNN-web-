import { useState, useEffect, useRef } from 'react'
import './App.css'

// Static Configuration
const STATIC_NODES = [
  { id: 'ollama', x: 450, y: 50, label: 'Ollama LLM', role: 'server', icon: '🧠', color: '#aa3bff', device: 'Local AI Brain' },
  { id: 'gateway', x: 450, y: 130, label: 'BLE Gateway', role: 'gateway', icon: '💻', color: '#00e5ff', device: 'Gateway Server' },
  { id: 'relay_a', x: 250, y: 210, label: 'Relay Phone A', role: 'relay', icon: '📱', color: '#ff9800', device: 'Android Phone' },
  { id: 'relay_b', x: 650, y: 210, label: 'Relay Phone B', role: 'relay', icon: '📱', color: '#ff9800', device: 'Android Phone' },
  { id: 'esp32_bot', x: 150, y: 290, label: 'ESP32 Client', role: 'client', icon: '🤖', color: '#00ff66', device: 'IoT Robot' },
  { id: 'client_c', x: 350, y: 290, label: 'Client Phone C', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' },
  { id: 'client_d', x: 550, y: 290, label: 'Client Phone D', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' },
  { id: 'client_e', x: 750, y: 290, label: 'Client Phone E', role: 'client', icon: '📱', color: '#00ff66', device: 'Android Client' }
]

const STATIC_CONNECTIONS = [
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

// Mock response database based on key phrases
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
    return 'Support this project by donating to the B#NN creator at: https://buymeacoffee.com/arunshekhar. Local offline AI systems thrive through community backing!'
  }
  return `Offline Mesh Simulation Active.\n[Path: Client ➔ Relay Phone ➔ Gateway Laptop ➔ Ollama (llama3.2)].\nQuery processed locally: "${prompt}".\nResponse: Decoupled offline mesh operations are healthy. Configure server.py and ble_gateway.py to run live.`
}

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
  // Config & Status States
  const [serverStatus, setServerStatus] = useState('simulated')
  const [selectedModel, setSelectedModel] = useState('llama3.2:latest')
  const [modelsList, setModelsList] = useState([])
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(512)
  const [packetLoss, setPacketLoss] = useState(0)

  // Diagnostics & Tab Console States
  const [activeConsoleTab, setActiveConsoleTab] = useState('chat') // 'chat' | 'packets' | 'diagnostics'
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'system',
      text: 'B#NN Mesh Web Interface Initialized. Status: Simulated Offline Mesh mode active.',
      time: new Date().toLocaleTimeString()
    }
  ])
  const [packetLogs, setPacketLogs] = useState([
    { text: 'SYSTEM: Scanning for BLE advertisements starting with "BNN"...', type: 'sys', time: new Date().toLocaleTimeString() }
  ])
  const [diagnosticsLogs, setDiagnosticsLogs] = useState([
    { text: 'B#NN Diagnostics Terminal v1.0.0. Type /help to see list of active commands.', type: 'sys' }
  ])
  const [diagInput, setDiagInput] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Active Nodes Status States (Online/Offline)
  const [nodesOnline, setNodesOnline] = useState({
    ollama: true,
    gateway: true,
    relay_a: true,
    relay_b: true,
    esp32_bot: true,
    client_c: true,
    client_d: true,
    client_e: true
  })

  // Documentation tab state
  const [activeDocTab, setActiveDocTab] = useState('quickstart')
  const [copiedText, setCopiedText] = useState('')

  // Packet Animation and Canvas variables
  const [, setActivePackets] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)

  const chatEndRef = useRef(null)
  const packetsEndRef = useRef(null)
  const diagEndRef = useRef(null)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  // Auto Scroll Views
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    packetsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [packetLogs])

  useEffect(() => {
    diagEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [diagnosticsLogs])

  // Probe Server on mount
  useEffect(() => {
    const probeServer = async () => {
      try {
        const res = await fetch('http://localhost:5000/health')
        if (res.ok) {
          const data = await res.json()
          setServerStatus('online')
          if (data.model) setSelectedModel(data.model)
          
          setChatHistory(prev => [
            ...prev,
            {
              role: 'system',
              text: `Connected to B#NN Flask API at http://localhost:5000. Active brain loaded: ${data.model || 'unknown'}.`,
              time: new Date().toLocaleTimeString()
            }
          ])

          // Fetch available models
          try {
            const mRes = await fetch('http://localhost:5000/model')
            if (mRes.ok) {
              const mData = await mRes.json()
              if (mData.available) {
                setModelsList(mData.available.map(m => m.name || m))
              }
            }
          } catch {
            // Ignored
          }
        }
      } catch {
        // Fallback simulated mode remains active
      }
    }
    probeServer()
  }, [])

  // Dynamic Routing Logic based on node online states
  const findMeshRoute = (sourceId) => {
    // If target Gateway is offline, packet can't resolve
    if (!nodesOnline.gateway || !nodesOnline.ollama) return null

    // Determine path based on which relays are online
    if (sourceId === 'esp32_bot' || sourceId === 'client_c') {
      if (nodesOnline.relay_a) {
        return [sourceId, 'relay_a', 'gateway', 'ollama']
      } else if (nodesOnline.relay_b) {
        // Reroute via Relay B if Relay A is offline (range extension)
        return [sourceId, 'relay_b', 'gateway', 'ollama']
      }
    } else if (sourceId === 'client_d' || sourceId === 'client_e') {
      if (nodesOnline.relay_b) {
        return [sourceId, 'relay_b', 'gateway', 'ollama']
      } else if (nodesOnline.relay_a) {
        // Reroute via Relay A if Relay B is offline
        return [sourceId, 'relay_a', 'gateway', 'ollama']
      }
    } else if (sourceId === 'relay_a' || sourceId === 'relay_b') {
      return [sourceId, 'gateway', 'ollama']
    }
    return null
  }

  // Trigger Packet animation on canvas
  const triggerPacketAnimation = (sourceId, text, callback, errorCallback) => {
    const route = findMeshRoute(sourceId)
    const timeStr = new Date().toLocaleTimeString()

    if (!route) {
      setPacketLogs(prev => [
        ...prev,
        { text: `[${timeStr}] MESH_DROP: No online route from node '${sourceId}' to Gateway. Packet dropped!`, type: 'sys' }
      ])
      if (errorCallback) errorCallback('No online route found through mesh relays.')
      return
    }

    // Check for random simulated packet loss
    if (Math.random() < (packetLoss / 100)) {
      setPacketLogs(prev => [
        ...prev,
        { text: `[${timeStr}] BLE_COLLISION: Packet dropped due to simulated RF interference/noise!`, type: 'sys' }
      ])
      if (errorCallback) errorCallback('Packet lost in transmission due to simulated RF noise.')
      return
    }

    const msgId = Math.random().toString(36).substring(2, 7)

    // Log packet creation in packets tab
    setPacketLogs(prev => [
      ...prev,
      { text: `[${timeStr}] BLE ADV TX: Node '${sourceId}' broadcasting package. msg_id: ${msgId}, ttl: ${5 - route.length}, payload: "${text.substring(0, 16)}..."`, type: 'tx' }
    ])

    // Relaying logs during animation stages
    route.forEach((nodeId, idx) => {
      if (idx > 0 && idx < route.length - 1) {
        setTimeout(() => {
          setPacketLogs(prev => [
            ...prev,
            { text: `[${new Date().toLocaleTimeString()}] BLE ADV RX/TX (Relay): Node '${nodeId}' forwarding packet ${msgId}. (ttl decremented to ${5 - route.length - idx})`, type: 'tx' }
          ])
        }, idx * 400)
      }
    })

    const newPkt = {
      id: Math.random().toString(),
      path: route,
      currentIndex: 0,
      progress: 0,
      direction: 'forward',
      color: '#00ff66',
      payload: text,
      msgId,
      ttl: 5 - route.length,
      callback
    }

    setActivePackets(prev => [...prev, newPkt])
  }

  // Canvas drawings and game-physics loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let lineDashOffset = 0
    let carrierOffset = 0
    let radarPulseRadius = 0

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      canvas.width = parent.clientWidth * window.devicePixelRatio
      canvas.height = 380 * window.devicePixelRatio
      canvas.style.width = '100%'
      canvas.style.height = '380px'
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const draw = () => {
      // Background Clear
      ctx.fillStyle = '#010103'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const virtualWidth = 900
      const virtualHeight = 380
      const scaleX = canvas.width / (window.devicePixelRatio * virtualWidth)
      const scaleY = 380 / virtualHeight
      const scale = Math.min(scaleX, scaleY)
      const offsetX = (canvas.width / window.devicePixelRatio - virtualWidth * scale) / 2
      const offsetY = 10

      // Background grids
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.012)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < canvas.width / window.devicePixelRatio; i += 25) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
      }
      for (let i = 0; i < canvas.height / window.devicePixelRatio; i += 25) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(canvas.width, canvas.height)
        ctx.stroke()
      }

      lineDashOffset -= 0.2
      carrierOffset += 0.4
      radarPulseRadius = (radarPulseRadius + 0.3) % 40

      // Draw connections & Flowing carrier wave electrons
      STATIC_CONNECTIONS.forEach(conn => {
        const fromNode = STATIC_NODES.find(n => n.id === conn.from)
        const toNode = STATIC_NODES.find(n => n.id === conn.to)
        if (!fromNode || !toNode) return

        // Check if both nodes are online
        const isFromOnline = nodesOnline[fromNode.id]
        const isToOnline = nodesOnline[toNode.id]
        const isActiveLink = isFromOnline && isToOnline

        const x1 = fromNode.x * scale + offsetX
        const y1 = fromNode.y * scale + offsetY
        const x2 = toNode.x * scale + offsetX
        const y2 = toNode.y * scale + offsetY

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)

        if (conn.type === 'ble') {
          ctx.strokeStyle = isActiveLink ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255, 51, 102, 0.1)'
          ctx.lineWidth = 1.2
          ctx.setLineDash([4, 4])
          ctx.lineDashOffset = lineDashOffset
        } else {
          ctx.strokeStyle = isActiveLink ? 'rgba(170, 59, 255, 0.25)' : 'rgba(255, 51, 102, 0.1)'
          ctx.lineWidth = 1.8
          ctx.setLineDash([])
        }
        ctx.stroke()

        // Draw flowing carrier dots along active connection links
        if (isActiveLink) {
          const numParticles = 3
          ctx.fillStyle = conn.type === 'ble' ? 'rgba(0, 229, 255, 0.6)' : 'rgba(170, 59, 255, 0.6)'
          
          for (let p = 0; p < numParticles; p++) {
            const fraction = ((carrierOffset + p * (100 / numParticles)) % 100) / 100
            const px = x1 + (x2 - x1) * fraction
            const py = y1 + (y2 - y1) * fraction
            ctx.beginPath()
            ctx.arc(px, py, 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
      ctx.setLineDash([]) // Reset

      // Update and Draw active packets
      setActivePackets(prevPackets => {
        const remainingPackets = []
        
        prevPackets.forEach(pkt => {
          const updatedPkt = { ...pkt }
          updatedPkt.progress += 0.02 // Speed

          if (updatedPkt.progress >= 1) {
            updatedPkt.progress = 0
            updatedPkt.currentIndex += 1
          }

          const isLastSegment = updatedPkt.currentIndex >= updatedPkt.path.length - 1
          
          if (isLastSegment && updatedPkt.progress === 0) {
            if (updatedPkt.direction === 'forward') {
              // Reached Ollama, generate response and route back
              const replyPath = [...updatedPkt.path].reverse()
              
              setPacketLogs(prev => [
                ...prev,
                { text: `[${new Date().toLocaleTimeString()}] GATEWAY API: Received query. Querying local Ollama...`, type: 'sys' }
              ])

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
              // Arrived back to sender
              if (updatedPkt.callback) updatedPkt.callback()
            }
          } else if (!isLastSegment) {
            // Draw particle
            const fromNode = STATIC_NODES.find(n => n.id === updatedPkt.path[updatedPkt.currentIndex])
            const toNode = STATIC_NODES.find(n => n.id === updatedPkt.path[updatedPkt.currentIndex + 1])
            
            if (fromNode && toNode) {
              const px = (fromNode.x + (toNode.x - fromNode.x) * updatedPkt.progress) * scale + offsetX
              const py = (fromNode.y + (toNode.y - fromNode.y) * updatedPkt.progress) * scale + offsetY

              // Particle Glow
              ctx.shadowColor = updatedPkt.color
              ctx.shadowBlur = 10
              ctx.fillStyle = updatedPkt.color
              ctx.beginPath()
              ctx.arc(px, py, 6, 0, Math.PI * 2)
              ctx.fill()
              ctx.shadowBlur = 0

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
      STATIC_NODES.forEach(node => {
        const nx = node.x * scale + offsetX
        const ny = node.y * scale + offsetY
        const isOnline = nodesOnline[node.id]
        
        // Node hover highlights
        const isHovered = selectedNode && selectedNode.id === node.id

        // 1. Radar scan waves expanding from online nodes
        if (isOnline && node.role !== 'server') {
          ctx.strokeStyle = node.role === 'gateway' ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 255, 102, 0.08)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(nx, ny, radarPulseRadius, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 2. Main Node Circle Glow
        ctx.shadowColor = isOnline ? node.color : '#ff3366'
        ctx.shadowBlur = isHovered ? 18 : 6
        ctx.fillStyle = isHovered ? 'rgba(8, 8, 15, 0.95)' : '#0d0d15'
        ctx.strokeStyle = isOnline ? node.color : '#ff3366'
        ctx.lineWidth = isHovered ? 2 : 1
        
        ctx.beginPath()
        ctx.arc(nx, ny, 19, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0 // Reset

        // 3. Emoji Hardware Icon
        ctx.fillStyle = isOnline ? '#ffffff' : '#64748b'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.icon, nx, ny)

        // 4. RSSI indicator bars (BLE client nodes only)
        if (isOnline && node.role === 'client') {
          ctx.fillStyle = '#00ff66'
          ctx.font = '8px "Share Tech Mono"'
          ctx.textAlign = 'center'
          ctx.fillText('-64 dBm', nx, ny - 24)
        }

        // 5. Hardware Labels & Subtext
        ctx.fillStyle = isOnline ? 'var(--text-primary)' : 'var(--text-muted)'
        ctx.font = '11px "Share Tech Mono"'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(node.label, nx, ny + 32)

        ctx.fillStyle = isOnline ? 'var(--text-secondary)' : '#64748b'
        ctx.font = '9px "Share Tech Mono"'
        ctx.fillText(isOnline ? node.device : 'OFFLINE', nx, ny + 44)
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [selectedNode, nodesOnline])

  // Mouse hover event on Canvas
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    
    // Scale event coordinates
    const scaleY = 380 / rect.height
    const scale = Math.min(rect.width / 900, rect.height / 380)
    const offsetX = (rect.width - 900 * scale) / 2
    const adjX = (e.clientX - rect.left - offsetX) * (900 / (rect.width - offsetX * 2))
    
    let foundNode = null
    STATIC_NODES.forEach(node => {
      const dx = adjX - node.x
      const dy = (e.clientY - rect.top) * scaleY - node.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 25) {
        foundNode = node
      }
    })

    setSelectedNode(foundNode)
  }

  // Toggle Node Online/Offline state on click
  const handleCanvasClick = () => {
    if (selectedNode) {
      const nodeId = selectedNode.id
      setNodesOnline(prev => {
        const nextState = { ...prev, [nodeId]: !prev[nodeId] }
        
        // Log changes in diagnostic console
        const dateStr = new Date().toLocaleTimeString()
        setDiagnosticsLogs(prevLogs => [
          ...prevLogs,
          { text: `[${dateStr}] CONFIG: Toggled Node '${nodeId}' to ${nextState[nodeId] ? 'ONLINE' : 'OFFLINE'}`, type: 'sys' }
        ])
        setPacketLogs(prevPackets => [
          ...prevPackets,
          { text: `SYSTEM: Node '${selectedNode.label}' status updated to ${nextState[nodeId] ? 'ONLINE' : 'OFFLINE'}. Recomputing flooding configurations.`, type: 'sys', time: dateStr }
        ])
        
        return nextState
      })
    }
  }

  // Main Chat Sandbox trigger
  const handleSendMessage = async (msgText, deviceId = 'web_user') => {
    if (!msgText.trim() || isLoading) return
    setIsLoading(true)

    // User Message
    const userMsg = {
      role: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString(),
      device: deviceId
    }
    setChatHistory(prev => [...prev, userMsg])
    setInputMessage('')

    // Animation packet trigger
    triggerPacketAnimation(
      deviceId === 'web_user' ? 'client_c' : deviceId, 
      msgText, 
      async () => {
        // SUCCESS packet returned to client
        const startTime = Date.now()

        if (serverStatus === 'online') {
          try {
            const response = await fetch('http://localhost:5000/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: msgText,
                device_id: deviceId,
                temperature: temperature,
                max_tokens: maxTokens,
                model: selectedModel
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
                  model: data.model || selectedModel,
                  hops: deviceId === 'web_user' ? ['Relay A', 'Gateway'] : ['Direct Gateway']
                }
              ])
            } else {
              handleFailedQuery(msgText, startTime)
            }
          } catch {
            handleFailedQuery(msgText, startTime)
          } finally {
            setIsLoading(false)
          }
        } else {
          // Simulated local responders
          setTimeout(() => {
            const elapsed = Date.now() - startTime
            const responseText = generateOfflineResponse(msgText)
            
            setChatHistory(prev => [
              ...prev,
              {
                role: 'ai',
                text: responseText,
                time: new Date().toLocaleTimeString(),
                latency: elapsed + 150,
                model: 'simulated-llama3.2',
                hops: deviceId === 'web_user' ? ['Relay A', 'Gateway'] : ['Relay B', 'Gateway']
              }
            ])
            setIsLoading(false)
          }, 800)
        }
      },
      (errorMsg) => {
        // ERROR packet dropped/failed in mesh
        setChatHistory(prev => [
          ...prev,
          {
            role: 'system',
            text: `Mesh Error: ${errorMsg}. Packet failed to deliver.`,
            time: new Date().toLocaleTimeString()
          }
        ])
        setIsLoading(false)
      }
    )
  }

  const handleFailedQuery = (msgText, startTime) => {
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
        text: generateOfflineResponse(msgText),
        time: new Date().toLocaleTimeString(),
        latency: elapsed + 180,
        model: 'simulated-llama3.2',
        hops: ['Local Fallback']
      }
    ])
  }

  // Diagnostics Terminal Command line parser
  const handleDiagnosticsSubmit = (e) => {
    e.preventDefault()
    if (!diagInput.trim()) return

    const cmd = diagInput.trim()
    const parts = cmd.split(' ')
    const primaryCmd = parts[0].toLowerCase()

    setDiagnosticsLogs(prev => [...prev, { text: `B#NN_DIAGS> ${cmd}`, type: 'user' }])
    setDiagInput('')

    setTimeout(() => {
      let outputText = ''
      switch (primaryCmd) {
        case '/help':
          outputText = 'Active CLI commands:\n  /help          - Lists diagnostics commands\n  /nodes         - Inspect status of mesh nodes\n  /ping          - Pings local Flask server\n  /clear         - Clears diagnostics logs screen'
          break
        case '/nodes':
          outputText = `Active Node Topology:\n` + 
            STATIC_NODES.map(n => `  • ${n.label} (${n.device}): ${nodesOnline[n.id] ? 'ONLINE [RSSI: -64dBm]' : 'OFFLINE'}`).join('\n')
          break
        case '/ping':
          outputText = `Ping request sent to http://localhost:5000/health...\n` + 
            (serverStatus === 'online' ? 'Status: 200 OK - Latency: 42ms' : 'Status: 0 Connection Failed (API is offline)')
          break
        case '/clear':
          setDiagnosticsLogs([])
          return
        default:
          outputText = `Command "${primaryCmd}" not recognized. Type /help to see available options.`
      }
      setDiagnosticsLogs(prev => [...prev, { text: outputText, type: 'sys' }])
    }, 100)
  }

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(''), 2000)
  }

  return (
    <>
      {/* HEADER BRANDING */}
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
        <p style={{ maxWidth: '620px', margin: '12px auto 0px', fontSize: '0.92rem' }}>
          b#nn is a decentralized offline messaging and intelligence network. Run a model on a central laptop/gateway, and let devices chat, command, and interact over Bluetooth Low Energy mesh without internet.
        </p>
      </header>

      {/* TOPOLOGY VISUALIZER & MULTI-TAB CONSOLE */}
      <div className="grid-layout">
        
        {/* Topology Visualizer Panel */}
        <div className="glass-panel glow-border" style={{ padding: '18px' }}>
          <div className="panel-title">
            <h3>
              <span className={`status-dot ${serverStatus === 'online' ? 'online' : 'simulated'}`}></span>
              Mesh Network Visualizer
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
              MODE: {serverStatus.toUpperCase()}
            </span>
          </div>
          
          <p style={{ fontSize: '0.82rem', marginTop: '-12px', marginBottom: '14px', height: '14px' }}>
            {selectedNode ? (
              <span className="glow-text">
                Hovering: {selectedNode.label} ({selectedNode.device}) • Click to toggle {nodesOnline[selectedNode.id] ? 'OFFLINE' : 'ONLINE'}!
              </span>
            ) : (
              <span>Click nodes to toggle online/offline state to simulate mesh rerouting.</span>
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
                  const clients = ['esp32_bot', 'client_c', 'client_d', 'client_e']
                  const randomClient = clients[Math.floor(Math.random() * clients.length)]
                  handleSendMessage(getRandomSimulatedPrompt(), randomClient)
                }}
              >
                ⚡ Inject Probe Packet
              </button>
              <div className="visualizer-legend">
                <span><span style={{color: '#aa3bff'}}>●</span> Server</span>
                <span><span style={{color: '#ff9800'}}>●</span> Relay</span>
                <span><span style={{color: '#00ff66'}}>●</span> Client</span>
              </div>
            </div>
          </div>

          {/* Settings Parameters sliders */}
          <div className="settings-panel">
            <div className="setting-item">
              <label>
                <span>AI Brain Model:</span>
                <span className="glow-text">{selectedModel}</span>
              </label>
              <select 
                className="setting-select" 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="llama3.2:latest">llama3.2:latest</option>
                {modelsList.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
                <option value="phi3:latest">phi3:latest</option>
                <option value="mistral:latest">mistral:latest</option>
              </select>
            </div>

            <div className="setting-item">
              <label>
                <span>Packet Drop Rate:</span>
                <span className="glow-text">{packetLoss}%</span>
              </label>
              <input 
                type="range" 
                className="setting-slider" 
                min="0" 
                max="50" 
                value={packetLoss} 
                onChange={(e) => setPacketLoss(parseInt(e.target.value))}
              />
            </div>

            <div className="setting-item">
              <label>
                <span>Temperature:</span>
                <span className="glow-text">{temperature}</span>
              </label>
              <input 
                type="range" 
                className="setting-slider" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                value={temperature} 
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-item">
              <label>
                <span>Max Tokens:</span>
                <span className="glow-text">{maxTokens}</span>
              </label>
              <select 
                className="setting-select"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              >
                <option value="128">128 (Fast)</option>
                <option value="256">256 (Normal)</option>
                <option value="512">512 (Standard)</option>
                <option value="1024">1024 (Deep)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Tab Console Panel */}
        <div className="glass-panel glow-border" style={{ padding: '18px' }}>
          <div className="panel-title">
            <h3>📡 Cyber Command Center</h3>
          </div>

          <div className="terminal-chat-container">
            {/* Terminal navigation tabs */}
            <div className="terminal-tabs">
              <button 
                className={`term-tab-btn ${activeConsoleTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('chat')}
              >
                🤖 AI Chat Sandbox
              </button>
              <button 
                className={`term-tab-btn ${activeConsoleTab === 'packets' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('packets')}
              >
                📟 Raw BLE Packets
              </button>
              <button 
                className={`term-tab-btn ${activeConsoleTab === 'diagnostics' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('diagnostics')}
              >
                ⚙️ Diagnostic CLI
              </button>
            </div>

            {/* Tab 1: AI Chat Sandbox */}
            {activeConsoleTab === 'chat' && (
              <>
                <div className="chat-history">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`chat-msg ${msg.role}`}>
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
                    handleSendMessage(inputMessage)
                  }}
                >
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Type AI prompt to route through mesh..." 
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
              </>
            )}

            {/* Tab 2: Raw BLE Packets Feed */}
            {activeConsoleTab === 'packets' && (
              <div className="packet-logs-feed">
                {packetLogs.map((log, idx) => (
                  <div key={idx} className={`packet-log-line ${log.type}`}>
                    {log.text}
                  </div>
                ))}
                <div ref={packetsEndRef} />
              </div>
            )}

            {/* Tab 3: Diagnostic CLI */}
            {activeConsoleTab === 'diagnostics' && (
              <>
                <div className="packet-logs-feed" style={{ color: '#00ff66' }}>
                  {diagnosticsLogs.map((log, idx) => (
                    <div key={idx} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4, marginBottom: '8px' }}>
                      {log.text}
                    </div>
                  ))}
                  <div ref={diagEndRef} />
                </div>
                
                <form 
                  className="chat-input-area" 
                  onSubmit={handleDiagnosticsSubmit}
                >
                  <span style={{ color: '#00ff66', display: 'flex', alignItems: 'center', paddingLeft: '16px', fontFamily: 'var(--mono)', fontSize: '13.5px' }}>
                    B#NN_DIAGS&gt;
                  </span>
                  <input 
                    type="text" 
                    className="chat-input" 
                    style={{ paddingLeft: '8px' }}
                    placeholder="Type commands e.g. /help, /nodes, /ping, /clear" 
                    value={diagInput}
                    onChange={(e) => setDiagInput(e.target.value)}
                  />
                  <button type="submit" style={{ display: 'none' }} />
                </form>
              </>
            )}
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
            className={`tab-btn ${activeDocTab === 'quickstart' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('quickstart')}
          >
            Quickstart Setup
          </button>
          <button 
            className={`tab-btn ${activeDocTab === 'packet' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('packet')}
          >
            BLE Packet Schema
          </button>
          <button 
            className={`tab-btn ${activeDocTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveDocTab('specifications')}
          >
            Mesh Specifications
          </button>
        </div>

        <div className="tab-content">
          {activeDocTab === 'quickstart' && (
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

          {activeDocTab === 'packet' && (
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

          {activeDocTab === 'specifications' && (
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
        <p style={{ maxWidth: '520px', margin: '0' }}>
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
