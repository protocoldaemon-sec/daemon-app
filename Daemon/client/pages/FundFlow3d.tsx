"use client"

/**
 * Cyclops - Advanced Blockchain Transaction Flow Visualization
 * 
 * A powerful interactive visualization tool that displays transaction flows
 * for Solana addresses using a dynamic 2D canvas with physics-based animations.
 * Features include real-time data fetching, node dragging, address analysis,
 * and seamless integration with the copilot chat system.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Activity, ArrowUpRight, ArrowDownLeft, ExternalLink, Copy, Eye, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize2, Check } from 'lucide-react'

interface TokenTransfer {
  fromTokenAccount: string
  toTokenAccount: string
  fromUserAccount: string
  toUserAccount: string
  tokenAmount: number
  mint: string
  tokenStandard: string
}

interface NativeTransfer {
  fromUserAccount: string
  toUserAccount: string
  amount: number
}

interface Transaction {
  description: string
  type: string
  source: string
  fee: number
  feePayer: string
  signature: string
  slot: number
  timestamp: number
  tokenTransfers: TokenTransfer[]
  nativeTransfers: NativeTransfer[]
  accountData: any[]
  transactionError: any
  instructions: any[]
  events: any
}

interface CyclopsProps {
  address: string
  onClose: () => void
  onAnalyzeAddress?: (address: string) => void
  onLoadingChange?: (isLoading: boolean) => void
}

interface Node {
  id: string
  address: string
  type: 'central' | 'inflow' | 'outflow' | 'token'
  balance: number
  transactionCount: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  x: number
  y: number
  size: number
  color: string
  label: string
  velocity?: { x: number, y: number }
}

interface Edge {
  from: string
  to: string
  amount: number
  type: 'native' | 'token'
  mint?: string
  timestamp: number
  signature: string
  direction: 'in' | 'out'
  color: string
  width: number
}

export function Cyclops({ address, onClose, onAnalyzeAddress, onLoadingChange }: CyclopsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const selectedNodeRef = useRef<Node | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dataReady, setDataReady] = useState(false) // New state to track if all data is ready
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<Node | null>(null)
  const [isNodeDragging, setIsNodeDragging] = useState(false)
  const [isHoveringNode, setIsHoveringNode] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    uniqueAddresses: 0,
    timeSpan: '0 days',
    riskScore: 0
  })

  // Notify parent about loading state changes
  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  // Fetch transaction data and risk analysis
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        console.log('Fetching transactions for address:', address)
        // Request more transactions with limit parameter
        const response = await fetch(`https://agent.daemonprotocol.com/sol/address/${address}/transactions-rest?limit=100`)

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('✅ Successfully received transaction data:', data)
        console.log('🔍 Raw data type:', typeof data)
        console.log('🔍 Is array?', Array.isArray(data))
        console.log('🔍 Object keys:', Object.keys(data))
        console.log('🔍 Data structure:', {
          hasAddress: !!data.address,
          hasTransactions: !!data.transactions,
          transactionCount: data.transactions?.length || 0,
          dataLength: Array.isArray(data) ? data.length : 'not array'
        })

        // Handle different response formats
        let transactions = []

        if (Array.isArray(data)) {
          // Direct array format
          console.log('📋 Using direct array format')
          transactions = data
        } else if (data.transactions && Array.isArray(data.transactions)) {
          // Object with transactions property
          console.log('📋 Using object.transactions format')
          transactions = data.transactions
        } else if (data.data && Array.isArray(data.data)) {
          // Object with data property
          console.log('📋 Using object.data format')
          transactions = data.data
        } else {
          console.log('❌ Unknown data format:', data)
        }

        console.log('🔄 Final transactions array:', transactions)
        console.log('📊 Transaction count from API:', transactions.length)
        console.log('📊 Raw data keys:', Object.keys(data))
        console.log('📊 Raw data preview:', JSON.stringify(data).substring(0, 200))

        if (transactions.length === 10) {
          console.log('⚠️ Warning: API returned exactly 10 transactions - may be limited by default')
          console.log('⚠️ Consider checking if API has pagination or limit parameters')
        }

        setTransactions(transactions)

        // Process data to create nodes and edges
        if (Array.isArray(transactions) && transactions.length > 0) {
          console.log('🔄 Processing real transaction data...')
          console.log('📊 Found', transactions.length, 'transactions')

          // Keep loading state until both transactions and risk analysis are ready
          console.log('⏳ Fetching risk analysis in parallel...')

          fetchRiskAnalysis(address).then((riskData: any) => {
            console.log('✅ Both transaction data and risk analysis ready')
            processTransactionData(transactions, riskData)
            setDataReady(true) // Mark data as ready
            setLoading(false) // Stop loading only after everything is processed
          }).catch((error: any) => {
            console.error('❌ Error fetching risk analysis:', error)
            console.log('⚠️ Proceeding without risk analysis data')
            // Fallback to basic processing without risk data
            processTransactionData(transactions, null)
            setDataReady(true) // Mark data as ready even without risk analysis
            setLoading(false) // Stop loading
          })
        } else {
          console.log('⚠️ No transactions found for this address')
          console.log('⚠️ Transactions data:', transactions)
          setNodes([])
          setEdges([])
          setStats({
            totalTransactions: 0,
            totalVolume: 0,
            uniqueAddresses: 0,
            timeSpan: '0 days',
            riskScore: 0
          })
          setDataReady(true) // Mark as ready even with no data
          setLoading(false) // Stop loading
        }

      } catch (error) {
        console.error('❌ Error fetching transactions:', error)
        console.log('❌ Failed to load transaction data')
        setNodes([])
        setEdges([])
        setStats({
          totalTransactions: 0,
          totalVolume: 0,
          uniqueAddresses: 0,
          timeSpan: '0 days',
          riskScore: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [address])

  // Function to fetch risk analysis from copilot analyze endpoint
  const fetchRiskAnalysis = async (address: string): Promise<any> => {
    try {
      console.log('🔍 Fetching risk analysis for address:', address)
      const response = await fetch(`https://agent.daemonprotocol.com/analyze/${address}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch risk analysis: ${response.statusText}`)
      }

      // Read the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let analysisResult = null

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6).trim()
              if (data === '[DONE]') break
              if (!data) continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.analysis_result) {
                  analysisResult = parsed.analysis_result
                  console.log('✅ Received risk analysis:', analysisResult)
                  break
                }
              } catch (e) {
                console.warn('Failed to parse risk analysis data:', data)
              }
            }
          }

          if (analysisResult) break
        }
      }

      return analysisResult
    } catch (error) {
      console.error('❌ Error fetching risk analysis:', error)
      throw error
    }
  }

  const processTransactionData = (txData: Transaction[], riskAnalysis: any = null) => {
    console.log('🔄 Processing transaction data for address:', address)
    console.log('📊 Transaction count:', txData.length)
    console.log('📋 First transaction sample:', txData[0])

    const nodeMap = new Map<string, Node>()
    const edgeList: Edge[] = []
    const edgeMap = new Map<string, Edge>() // Track existing edges to prevent duplicates
    const addressStats = new Map<string, { incoming: number, outgoing: number, count: number }>()

    // Helper function to create unique edge key
    const createEdgeKey = (from: string, to: string, type: string, mint?: string) => {
      const sortedAddresses = [from, to].sort() // Sort to handle bidirectional edges
      return `${sortedAddresses[0]}-${sortedAddresses[1]}-${type}${mint ? `-${mint}` : ''}`
    }

    // Helper function to add edge without duplicates
    const addEdge = (edge: Edge) => {
      const edgeKey = createEdgeKey(edge.from, edge.to, edge.type, edge.mint)

      if (edgeMap.has(edgeKey)) {
        // Merge with existing edge (combine amounts)
        const existingEdge = edgeMap.get(edgeKey)!
        existingEdge.amount += edge.amount
        existingEdge.width = Math.max(existingEdge.width, edge.width)
        console.log(`   Merged edge: ${edge.from} -> ${edge.to} (total amount: ${existingEdge.amount})`)
      } else {
        // Add new edge
        edgeMap.set(edgeKey, edge)
        edgeList.push(edge)
        console.log(`   Created new edge: ${edge.from} -> ${edge.to}`)
      }
    }

    // Canvas dimensions
    const width = 800
    const height = 600
    const centerX = width / 2
    const centerY = height / 2

    // Central node
    nodeMap.set(address, {
      id: address,
      address: address,
      type: 'central',
      balance: 0,
      transactionCount: 0,
      riskLevel: 'low',
      x: centerX,
      y: centerY,
      size: 25,
      color: '#4f46e5',
      label: address
    })

    console.log('🏗️ Created central node for:', address)

    // Process transactions
    txData.forEach((tx, txIndex) => {
      console.log(`📝 Processing transaction ${txIndex + 1}/${txData.length}:`, tx.signature)
      console.log(`   - Native transfers: ${tx.nativeTransfers?.length || 0}`)
      console.log(`   - Token transfers: ${tx.tokenTransfers?.length || 0}`)

      const txTime = tx.timestamp

      // Process native transfers
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        console.log(`🔄 Processing ${tx.nativeTransfers.length} native transfers...`)
        tx.nativeTransfers.forEach((transfer, index) => {
          console.log(`   Native transfer ${index + 1}: ${transfer.fromUserAccount} -> ${transfer.toUserAccount} (${transfer.amount})`)

          const isIncoming = transfer.toUserAccount === address
          const otherAddress = isIncoming ? transfer.fromUserAccount : transfer.toUserAccount

          if (!otherAddress || otherAddress === address) {
            console.log(`   Skipping self-transfer or empty address`)
            return
          }

          console.log(`   Creating ${isIncoming ? 'incoming' : 'outgoing'} connection to: ${otherAddress}`)

          // Update stats
          if (!addressStats.has(otherAddress)) {
            addressStats.set(otherAddress, { incoming: 0, outgoing: 0, count: 0 })
          }
          const stats = addressStats.get(otherAddress)!
          if (isIncoming) {
            stats.incoming += transfer.amount
          } else {
            stats.outgoing += transfer.amount
          }
          stats.count++

          // Create or update node
          if (!nodeMap.has(otherAddress)) {
            const angle = (nodeMap.size - 1) * (Math.PI * 2) / 12 // Distribute around circle
            const radius = 150 + Math.random() * 100

            nodeMap.set(otherAddress, {
              id: otherAddress,
              address: otherAddress,
              type: isIncoming ? 'inflow' : 'outflow',
              balance: transfer.amount,
              transactionCount: 1,
              riskLevel: calculateRiskLevel(transfer.amount),
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
              size: Math.log10(transfer.amount + 1) * 2 + 8,
              color: isIncoming ? '#10b981' : '#ef4444',
              label: otherAddress,
              velocity: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 }
            })

            console.log(`   Created new node: ${otherAddress} (${isIncoming ? 'inflow' : 'outflow'})`)
          }

          // Create edge
          addEdge({
            from: isIncoming ? otherAddress : address,
            to: isIncoming ? address : otherAddress,
            amount: transfer.amount,
            type: 'native',
            timestamp: txTime,
            signature: tx.signature,
            direction: isIncoming ? 'in' : 'out',
            color: isIncoming ? '#10b981' : '#ef4444',
            width: Math.log10(transfer.amount + 1) * 0.3 + 1
          })

          console.log(`   Edge processed: ${isIncoming ? otherAddress : address} -> ${isIncoming ? address : otherAddress}`)
        })
      } else {
        console.log(`   No native transfers found`)
      }

      // Process token transfers
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        console.log(`🪙 Processing ${tx.tokenTransfers.length} token transfers...`)
        tx.tokenTransfers.forEach((transfer) => {
          const isIncoming = transfer.toUserAccount === address
          const otherAddress = isIncoming ? transfer.fromUserAccount : transfer.toUserAccount

          if (!otherAddress || otherAddress === address) return

          // Create token node if significant amount
          if (transfer.tokenAmount > 1000) {
            const tokenNodeId = `${transfer.mint}-${otherAddress}`
            if (!nodeMap.has(tokenNodeId)) {
              const angle = nodeMap.size * (Math.PI * 2) / 20
              const radius = 120 + Math.random() * 80

              nodeMap.set(tokenNodeId, {
                id: tokenNodeId,
                address: transfer.mint,
                type: 'token',
                balance: transfer.tokenAmount,
                transactionCount: 1,
                riskLevel: 'low',
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                size: 12,
                color: '#f59e0b',
                label: `Token: ${transfer.mint}`,
                velocity: { x: (Math.random() - 0.5) * 0.1, y: (Math.random() - 0.5) * 0.1 }
              })
            }

            // Create token edge
            addEdge({
              from: isIncoming ? tokenNodeId : address,
              to: isIncoming ? address : tokenNodeId,
              amount: transfer.tokenAmount,
              type: 'token',
              mint: transfer.mint,
              timestamp: txTime,
              signature: tx.signature,
              direction: isIncoming ? 'in' : 'out',
              color: '#f59e0b',
              width: 2
            })
          }
        })
      } else {
        console.log(`   No token transfers found`)
      }
    })

    // Calculate statistics
    const uniqueAddresses = new Set(txData.flatMap(tx => [
      ...tx.nativeTransfers?.map(t => [t.fromUserAccount, t.toUserAccount]).flat() || [],
      ...tx.tokenTransfers?.map(t => [t.fromUserAccount, t.toUserAccount]).flat() || []
    ])).size

    const totalVolume = txData.reduce((sum, tx) =>
      sum + (tx.nativeTransfers?.reduce((s, t) => s + t.amount, 0) || 0), 0
    )

    const timestamps = txData.map(tx => tx.timestamp).filter(Boolean)
    const timeSpan = timestamps.length > 1
      ? `${Math.ceil((Math.max(...timestamps) - Math.min(...timestamps)) / 86400)} days`
      : '1 day'

    const finalNodes = Array.from(nodeMap.values())
    const finalEdges = edgeList

    // Extract risk score from analysis result
    const riskScore = riskAnalysis?.threat_analysis?.risk_score || calculateOverallRisk(txData)

    console.log('🏁 Processing complete:')
    console.log(`   📍 Total nodes created: ${finalNodes.length}`)
    console.log(`   🔗 Total edges created: ${finalEdges.length}`)
    console.log(`   📊 Statistics:`, {
      totalTransactions: txData.length,
      totalVolume: totalVolume / 1e9,
      uniqueAddresses,
      timeSpan,
      riskScore: riskScore
    })
    console.log(`   🎯 Risk analysis source:`, riskAnalysis ? 'Copilot Analysis' : 'Local Calculation')
    console.log(`   🎯 Node types:`, finalNodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1
      return acc
    }, {} as Record<string, number>))

    setNodes(finalNodes)
    setEdges(finalEdges)
    setStats({
      totalTransactions: txData.length,
      totalVolume: totalVolume / 1e9, // Convert to SOL
      uniqueAddresses,
      timeSpan,
      riskScore: riskScore
    })

    console.log('✅ Processed real transaction data:')
    console.log('📍 Nodes created:', finalNodes.length)
    console.log('🔗 Edges created:', finalEdges.length)
    console.log('📊 Stats:', { totalTransactions: txData.length, totalVolume: totalVolume / 1e9, uniqueAddresses })
  }

  const calculateRiskLevel = (amount: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (amount > 1e10) return 'critical' // > 10 SOL
    if (amount > 1e9) return 'high'      // > 1 SOL
    if (amount > 1e8) return 'medium'    // > 0.1 SOL
    return 'low'
  }

  const calculateOverallRisk = (txData: Transaction[]): number => {
    // Simple risk calculation based on transaction patterns
    const totalTx = txData.length
    const totalVolume = txData.reduce((sum, tx) =>
      sum + (tx.nativeTransfers?.reduce((s, t) => s + t.amount, 0) || 0), 0
    ) / 1e9

    let riskScore = 0
    if (totalTx > 100) riskScore += 30
    if (totalVolume > 100) riskScore += 40
    if (txData.some(tx => tx.fee > 1e6)) riskScore += 20 // High fees

    return Math.min(riskScore, 100)
  }

  // Animation and rendering
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 🔍 CRITICAL DEBUG: State at render time
    console.log('🎬 RENDER STATE CHECK:')
    console.log(`   📍 Nodes array length: ${nodes.length}`)
    console.log(`   🔗 Edges array length: ${edges.length}`)
    console.log(`   ⏳ Loading state: ${loading}`)
    console.log(`   📊 Transactions array length: ${transactions.length}`)
    if (nodes.length > 0) {
      console.log(`   📍 First node:`, nodes[0])
    }
    if (edges.length > 0) {
      console.log(`   🔗 First edge:`, edges[0])
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // If no data available, show message
    if (nodes.length === 0) {
      console.log('⚠️ RENDERING NO DATA STATE - nodes.length is 0')
      ctx.save()
      ctx.fillStyle = '#64748b'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (loading) {
        ctx.fillText('Loading transaction data...', canvas.width / 2, canvas.height / 2)
      } else {
        ctx.fillText('No transaction data available for this address', canvas.width / 2, canvas.height / 2 - 10)
        ctx.fillStyle = '#94a3b8'
        ctx.font = '14px Inter, sans-serif'
        ctx.fillText('Address may have no transactions or API request failed', canvas.width / 2, canvas.height / 2 + 15)
      }

      ctx.restore()
      requestAnimationFrame(animate)
      return
    }

    // Apply zoom and pan
    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(panX / zoom, panY / zoom)

    // Draw edges
    ctx.globalAlpha = 0.8
    console.log('Rendering edges:', edges.length)
    edges.forEach((edge, index) => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)

      if (!fromNode || !toNode) {
        console.log(`Edge ${index}: missing node - from:${edge.from} to:${edge.to}`)
        return
      }

      console.log(`Rendering edge ${index}: ${fromNode.label} -> ${toNode.label}`)

      // Draw edge line with flowing animation
      ctx.strokeStyle = edge.color
      ctx.lineWidth = edge.width
      ctx.lineCap = 'round'

      // Create flowing effect
      const time = Date.now() * 0.003
      const dashLength = 20
      const dashOffset = (time * 50) % (dashLength * 2)

      ctx.setLineDash([dashLength, dashLength])
      ctx.lineDashOffset = -dashOffset

      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)
      ctx.stroke()

      // Reset line dash for other drawings
      ctx.setLineDash([])

      // Add flowing particles on edges
      const particleTime = (Date.now() * 0.002) % 1
      const particleX = fromNode.x + (toNode.x - fromNode.x) * particleTime
      const particleY = fromNode.y + (toNode.y - fromNode.y) * particleTime

      // Draw flowing particle
      ctx.globalAlpha = 0.8
      ctx.fillStyle = edge.color
      ctx.beginPath()
      ctx.arc(particleX, particleY, 3, 0, Math.PI * 2)
      ctx.fill()

      // Add particle trail
      ctx.globalAlpha = 0.4
      const trailLength = 0.1
      for (let i = 1; i <= 3; i++) {
        const trailT = particleTime - (i * trailLength / 3)
        if (trailT > 0) {
          const trailX = fromNode.x + (toNode.x - fromNode.x) * trailT
          const trailY = fromNode.y + (toNode.y - fromNode.y) * trailT
          ctx.beginPath()
          ctx.arc(trailX, trailY, 3 - i, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 0.8

      // Draw arrow head
      const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
      const headLength = 15
      const arrowX = toNode.x - Math.cos(angle) * (toNode.size + 5)
      const arrowY = toNode.y - Math.sin(angle) * (toNode.size + 5)

      ctx.fillStyle = edge.color
      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle - Math.PI / 6),
        arrowY - headLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle + Math.PI / 6),
        arrowY - headLength * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    })

    // Update node positions (enhanced physics with continuous movement)
    nodes.forEach(node => {
      if (node.type !== 'central' && !isNodeDragging) {
        // Add small random movement if velocity is too low
        if (!node.velocity) {
          node.velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3
          }
        }

        // Add small continuous oscillation
        const time = Date.now() * 0.001
        const oscillationX = Math.sin(time + node.x * 0.01) * 0.15
        const oscillationY = Math.cos(time + node.y * 0.01) * 0.15

        // Apply movement
        node.x += node.velocity.x + oscillationX
        node.y += node.velocity.y + oscillationY

        // Boundary check with soft bounce
        if (node.x < node.size + 20) {
          node.velocity.x = Math.abs(node.velocity.x) * 0.8
          node.x = node.size + 20
        }
        if (node.x > 780 - node.size) {
          node.velocity.x = -Math.abs(node.velocity.x) * 0.8
          node.x = 780 - node.size
        }
        if (node.y < node.size + 20) {
          node.velocity.y = Math.abs(node.velocity.y) * 0.8
          node.y = node.size + 20
        }
        if (node.y > 580 - node.size) {
          node.velocity.y = -Math.abs(node.velocity.y) * 0.8
          node.y = 580 - node.size
        }

        // Gentle damping to prevent excessive speed
        node.velocity.x *= 0.995
        node.velocity.y *= 0.995

        // Add random impulse occasionally to keep movement alive
        if (Math.random() < 0.005) {
          node.velocity.x += (Math.random() - 0.5) * 0.2
          node.velocity.y += (Math.random() - 0.5) * 0.2
        }

        // Limit maximum velocity
        const maxVel = 1.5
        const vel = Math.sqrt(node.velocity.x ** 2 + node.velocity.y ** 2)
        if (vel > maxVel) {
          node.velocity.x = (node.velocity.x / vel) * maxVel
          node.velocity.y = (node.velocity.y / vel) * maxVel
        }
      }
    })

    // Collision detection and separation - prevent nodes from overlapping
    nodes.forEach((node1, i) => {
      nodes.forEach((node2, j) => {
        if (i >= j) return // Skip self and already checked pairs

        const dx = node2.x - node1.x
        const dy = node2.y - node1.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = node1.size + node2.size + 10 // Add 10px padding

        if (distance < minDistance && distance > 0) {
          // Nodes are overlapping, push them apart
          const overlap = minDistance - distance
          const angle = Math.atan2(dy, dx)

          // Calculate separation force
          const separationForce = overlap * 0.5

          // Apply separation to both nodes (unless one is central or being dragged)
          if (node1.type !== 'central' && (!isNodeDragging || draggedNode?.id !== node1.id)) {
            node1.x -= Math.cos(angle) * separationForce
            node1.y -= Math.sin(angle) * separationForce
            if (node1.velocity) {
              node1.velocity.x -= Math.cos(angle) * 0.1
              node1.velocity.y -= Math.sin(angle) * 0.1
            }
          }

          if (node2.type !== 'central' && (!isNodeDragging || draggedNode?.id !== node2.id)) {
            node2.x += Math.cos(angle) * separationForce
            node2.y += Math.sin(angle) * separationForce
            if (node2.velocity) {
              node2.velocity.x += Math.cos(angle) * 0.1
              node2.velocity.y += Math.sin(angle) * 0.1
            }
          }
        }
      })
    })

    // Draw nodes with micro-animations
    ctx.globalAlpha = 0.9
    nodes.forEach(node => {
      // Add small breathing/wobble effect to all nodes
      const time = Date.now() * 0.001
      const wobbleX = Math.sin(time * 3 + node.x * 0.1) * 0.5
      const wobbleY = Math.cos(time * 2.5 + node.y * 0.1) * 0.5
      const breathScale = 1 + Math.sin(time * 4 + node.x + node.y) * 0.05

      const displayX = node.x + wobbleX
      const displayY = node.y + wobbleY
      const displaySize = node.size * breathScale

      // Highlight effect for dragged node
      if (isNodeDragging && draggedNode && node.id === draggedNode.id) {
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.beginPath()
        ctx.arc(displayX, displayY, displaySize + 8, 0, Math.PI * 2)
        ctx.fill()
      }

      // Node shadow
      ctx.globalAlpha = 0.3
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.arc(displayX + 2, displayY + 2, displaySize, 0, Math.PI * 2)
      ctx.fill()

      // Node
      ctx.globalAlpha = 0.9
      ctx.fillStyle = node.color
      ctx.beginPath()
      ctx.arc(displayX, displayY, displaySize, 0, Math.PI * 2)
      ctx.fill()

      // Node border with extra highlight for dragged or selected node
      const isSelected = selectedNodeRef.current && node.id === selectedNodeRef.current.id
      const isDragged = isNodeDragging && draggedNode && node.id === draggedNode.id

      ctx.strokeStyle = node.type === 'central' ? '#ffffff' :
        (isDragged || isSelected) ? '#3b82f6' :
          'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = (isDragged || isSelected) ? 4 :
        (node.type === 'central' ? 3 : 2)
      ctx.stroke()

      // Add extra glow for selected node
      if (isSelected && !isDragged) {
        ctx.globalAlpha = 0.4
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(displayX, displayY, displaySize + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.9
      }

      // Label with animated position
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'

      // For canvas display, use short version of long addresses
      let displayLabel = node.label
      if (displayLabel.length > 20) {
        displayLabel = `${displayLabel.slice(0, 8)}...${displayLabel.slice(-4)}`
      }

      ctx.fillText(displayLabel, displayX, displayY + displaySize + 15)

      // Pulsing effect for central node with floating movement
      if (node.type === 'central') {
        const time = Date.now() * 0.001
        const pulse = Math.sin(time * 2) * 0.3 + 0.7

        // Add subtle floating movement to central node
        const floatX = Math.sin(time * 0.5) * 2
        const floatY = Math.cos(time * 0.7) * 1.5

        // Apply floating offset (but don't modify actual position permanently)
        const displayX = node.x + floatX
        const displayY = node.y + floatY

        ctx.globalAlpha = pulse * 0.3
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(displayX, displayY, node.size * 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Add extra glow rings
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = (pulse * 0.1) / i
          ctx.beginPath()
          ctx.arc(displayX, displayY, node.size * (1.5 + i * 0.3), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })

    ctx.restore()
    ctx.globalAlpha = 1

    animationRef.current = requestAnimationFrame(animate)
  }, [nodes, edges, zoom, panX, panY, isNodeDragging, draggedNode])

  useEffect(() => {
    if (nodes.length > 0 && dataReady) {
      animate()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate, nodes.length, dataReady])

  // Handle canvas resize to maintain aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Maintain 4:3 aspect ratio
      const aspectRatio = 4 / 3
      let canvasWidth = containerWidth
      let canvasHeight = containerWidth / aspectRatio

      if (canvasHeight > containerHeight) {
        canvasHeight = containerHeight
        canvasWidth = containerHeight * aspectRatio
      }

      // Set canvas style size (what users see)
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`

      // Keep internal resolution fixed for consistency
      canvas.width = 800
      canvas.height = 600
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Mouse interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsInteracting(true)

    const rect = canvas.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)

    // Apply inverse transform to get world coordinates
    const worldX = (canvasX - panX) / zoom
    const worldY = (canvasY - panY) / zoom

    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((worldX - node.x) ** 2 + (worldY - node.y) ** 2)
      return distance <= node.size
    })

    if (clickedNode) {
      // Start dragging node
      setIsNodeDragging(true)
      setDraggedNode(clickedNode)
      setDragStart({ x: worldX - clickedNode.x, y: worldY - clickedNode.y })
    } else {
      // Start dragging canvas
      setIsDragging(true)
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)

    const worldX = (canvasX - panX) / zoom
    const worldY = (canvasY - panY) / zoom

    if (isNodeDragging && draggedNode) {
      // Drag node
      // Update node position
      const nodeIndex = nodes.findIndex(n => n.id === draggedNode.id)
      if (nodeIndex !== -1) {
        const newNodes = [...nodes]
        const newX = worldX - dragStart.x
        const newY = worldY - dragStart.y

        // Boundary constraints
        const minX = draggedNode.size
        const maxX = 800 - draggedNode.size
        const minY = draggedNode.size
        const maxY = 600 - draggedNode.size

        newNodes[nodeIndex] = {
          ...newNodes[nodeIndex],
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY)),
          velocity: { x: 0, y: 0 } // Stop physics movement while dragging
        }
        setNodes(newNodes)
      }
    } else if (isDragging) {
      // Drag canvas
      setPanX(e.clientX - dragStart.x)
      setPanY(e.clientY - dragStart.y)
    } else {
      // Check if hovering over a node for cursor change and tooltip
      const foundNode = nodes.find(node => {
        const distance = Math.sqrt((worldX - node.x) ** 2 + (worldY - node.y) ** 2)
        return distance <= node.size
      })

      if (foundNode) {
        setIsHoveringNode(true)
        setHoveredNode(foundNode)
        // Set tooltip position relative to mouse
        setTooltipPosition({ x: e.clientX, y: e.clientY })
      } else {
        setIsHoveringNode(false)
        setHoveredNode(null)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsNodeDragging(false)
    setDraggedNode(null)
    // Delay to allow click event to fire
    setTimeout(() => setIsInteracting(false), 100)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setIsNodeDragging(false)
    setDraggedNode(null)
    setHoveredNode(null)
    setIsHoveringNode(false)
    setIsInteracting(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)))
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle click if we're not dragging (to avoid conflict)
    if (isDragging || isNodeDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Fix coordinate calculation considering zoom and pan
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height)

    // Apply inverse transform
    const x = (canvasX - panX) / zoom
    const y = (canvasY - panY) / zoom

    console.log('Click coordinates:', { canvasX, canvasY, x, y, zoom, panX, panY })

    // Check if clicked on a node for selection (not dragging)
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      console.log(`Node ${node.label}: distance=${distance}, size=${node.size}`)
      return distance <= node.size
    })

    if (clickedNode) {
      console.log('Selected node:', clickedNode.label)
      selectedNodeRef.current = clickedNode
      setSelectedNode(clickedNode)
      setSelectedEdge(null)
    } else {
      console.log('No node clicked')
      selectedNodeRef.current = null
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }

  const resetView = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)

    // Set copied state
    setCopiedText(text)

    // Reset after 2 seconds
    setTimeout(() => {
      setCopiedText(null)
    }, 2000)

    // Visual feedback for successful copy
    const event = new CustomEvent('showToast', {
      detail: { message: 'Address copied to clipboard!', type: 'success' }
    })
    window.dispatchEvent(event)
  }

  const handleAnalyzeAddress = (addressToAnalyze: string) => {
    // Close Cyclops
    onClose()

    // Send address to copilot if callback provided
    if (onAnalyzeAddress) {
      onAnalyzeAddress(addressToAnalyze)
    }
  }

  const formatAmount = (amount: number, decimals = 6) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`
    return amount.toFixed(decimals)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className="fund-flow-3d">
      <div className="fund-flow-header">
        <div className="fund-flow-title">
          <Activity className="w-5 h-5" />
          <h3>Cyclops</h3>
          <span
            className="address-badge"
            onClick={() => copyToClipboard(address)}
            title="Click to copy address"
          >
            {address}
          </span>
        </div>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="fund-flow-content">
        <div className="fund-flow-stats">
          {nodes.length > 0 ? (
            <>
              <div className="stat-card">
                <div className="stat-value">{stats.totalTransactions}</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{formatAmount(stats.totalVolume)} SOL</div>
                <div className="stat-label">Total Volume</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniqueAddresses}</div>
                <div className="stat-label">Unique Addresses</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.timeSpan}</div>
                <div className="stat-label">Time Span</div>
              </div>
              <div className="stat-card">
                <div className="stat-value risk-score">{stats.riskScore}%</div>
                <div className="stat-label">Risk Score</div>
              </div>
            </>
          ) : (
            <div className="no-data-message">
              {loading || !dataReady ? (
                <div className="loading-stats">
                  <div className="loading-spinner"></div>
                  <span>Loading transaction data...</span>
                </div>
              ) : (
                <div className="no-data-stats">
                  <AlertTriangle size={24} />
                  <span>No transaction data available</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fund-flow-main">
          <div className="visualization-container">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className={`fund-flow-canvas ${isHoveringNode ? 'node-hover' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
            />

            {/* Tooltip for hovered node */}
            {hoveredNode && (
              <div
                className="node-tooltip"
                style={{
                  left: `${tooltipPosition.x + 15}px`,
                  top: `${tooltipPosition.y - 10}px`
                }}
              >
                <div className="tooltip-address">{hoveredNode.address}</div>
                <div className="tooltip-type">{hoveredNode.type.toUpperCase()}</div>
              </div>
            )}

            <div className="legend">
              <div className="legend-item">
                <div className="legend-color central"></div>
                <span>Central Address</span>
              </div>
              <div className="legend-item">
                <div className="legend-color inflow"></div>
                <span>Inflow</span>
              </div>
              <div className="legend-item">
                <div className="legend-color outflow"></div>
                <span>Outflow</span>
              </div>
              <div className="legend-item">
                <div className="legend-color token"></div>
                <span>Token</span>
              </div>
            </div>

            <div className="zoom-indicator">
              Zoom: {(zoom * 100).toFixed(0)}%
            </div>
          </div>

          {(selectedNode || selectedEdge) && (
            <div className="detail-panel">
              {selectedNode && (
                <div className="node-details">
                  <h4>Address Details</h4>
                  <div className="detail-row">
                    <span>Address:</span>
                    <div className="address-display">
                      <code>{selectedNode.address}</code>
                      <button
                        onClick={() => copyToClipboard(selectedNode.address)}
                        className={`copy-btn ${copiedText === selectedNode.address ? 'success' : ''}`}
                      >
                        {copiedText === selectedNode.address ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="detail-row">
                    <span>Type:</span>
                    <span className={`type-badge ${selectedNode.type}`}>
                      {selectedNode.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Balance:</span>
                    <span>{formatAmount(selectedNode.balance / 1e9)} SOL</span>
                  </div>
                  <div className="detail-row">
                    <span>Transactions:</span>
                    <span>{selectedNode.transactionCount}</span>
                  </div>
                  <div className="detail-row">
                    <span>Risk Level:</span>
                    <span className={`risk-badge ${selectedNode.riskLevel}`}>
                      {selectedNode.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-actions">
                    <button
                      className="action-btn primary"
                      onClick={() => handleAnalyzeAddress(selectedNode.address)}
                    >
                      <Eye className="w-4 h-4" />
                      Analyze Address
                    </button>
                    <button className="action-btn secondary">
                      <ExternalLink className="w-4 h-4" />
                      View on Explorer
                    </button>
                  </div>
                </div>
              )}

              {selectedEdge && (
                <div className="edge-details">
                  <h4>Transaction Details</h4>
                  <div className="detail-row">
                    <span>Type:</span>
                    <span className={`type-badge ${selectedEdge.type}`}>
                      {selectedEdge.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Amount:</span>
                    <span>{formatAmount(selectedEdge.amount)} {selectedEdge.type === 'native' ? 'SOL' : 'Tokens'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Direction:</span>
                    <span className={`direction-badge ${selectedEdge.direction}`}>
                      {selectedEdge.direction === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {selectedEdge.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Timestamp:</span>
                    <span>{formatTimestamp(selectedEdge.timestamp)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Signature:</span>
                    <div className="address-display">
                      <code>{selectedEdge.signature}</code>
                      <button
                        onClick={() => copyToClipboard(selectedEdge.signature)}
                        className={`copy-btn ${copiedText === selectedEdge.signature ? 'success' : ''}`}
                      >
                        {copiedText === selectedEdge.signature ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  {selectedEdge.mint && (
                    <div className="detail-row">
                      <span>Token Mint:</span>
                      <div className="address-display">
                        <code>{selectedEdge.mint}</code>
                        <button
                          onClick={() => copyToClipboard(selectedEdge.mint || '')}
                          className={`copy-btn ${copiedText === selectedEdge.mint ? 'success' : ''}`}
                        >
                          {copiedText === selectedEdge.mint ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="detail-actions">
                    <button className="action-btn primary">
                      <Eye className="w-4 h-4" />
                      View Transaction
                    </button>
                    <button className="action-btn secondary">
                      <ExternalLink className="w-4 h-4" />
                      View on Explorer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .fund-flow-3d {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .fund-flow-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          border-bottom: 1px solid #334155;
          background: #0f172a;
        }

        .fund-flow-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f1f5f9;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .address-badge {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border: 1px solid #475569;
          color: #e2e8f0;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          position: relative;
          word-break: break-all;
          white-space: normal;
          line-height: 1.2;
          max-width: fit-content;
        }

        .address-badge:hover {
          background: linear-gradient(135deg, #334155 0%, #475569 100%);
          border-color: #64748b;
          color: #f1f5f9;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .close-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.25rem;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background: #dc2626;
        }

        .fund-flow-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .fund-flow-stats {
          display: flex;
          gap: 1rem;
          padding: 1rem 2rem;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          overflow-x: auto;
        }

        .stat-card {
          min-width: 120px;
          text-align: center;
          padding: 0.75rem;
          background: #0f172a;
          border-radius: 0.5rem;
          border: 1px solid #334155;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 0.25rem;
        }

        .stat-value.risk-score {
          color: #f59e0b;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .no-data-message {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 2rem;
          color: #64748b;
        }

        .loading-stats, .no-data-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .fund-flow-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .visualization-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #0f172a;
        }

        .fund-flow-canvas {
          display: block;
          margin: 0 auto;
          cursor: grab;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          background: #0f172a;
        }

        .fund-flow-canvas:active {
          cursor: grabbing;
        }

        .fund-flow-canvas.node-hover {
          cursor: move;
        }

        .threejs-container {
          width: 100%;
          height: 100%;
        }

        .legend {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(15, 23, 42, 0.9);
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          backdrop-filter: blur(10px);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          color: #f1f5f9;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-color.central { background: #4f46e5; }
        .legend-color.inflow { background: #10b981; }
        .legend-color.outflow { background: #ef4444; }
        .legend-color.token { background: #f59e0b; }

        .zoom-indicator {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          background: rgba(15, 23, 42, 0.9);
          color: #f1f5f9;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          border: 1px solid #334155;
        }

        .detail-panel {
          width: 300px;
          background: #1e293b;
          border-left: 1px solid #334155;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .node-details h4,
        .edge-details h4 {
          color: #f1f5f9;
          margin-bottom: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #334155;
        }

        .detail-row span:first-child {
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .detail-row span:last-child {
          color: #f1f5f9;
          font-size: 0.875rem;
        }

        .address-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .address-display code {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid #334155;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          color: #e2e8f0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          word-break: break-all;
          max-width: 320px;
          overflow-x: auto;
          white-space: nowrap;
          flex: 1;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
          position: relative;
          scroll-behavior: smooth;
        }

        .address-display code::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 15px;
          background: linear-gradient(90deg, transparent, #1e293b);
          pointer-events: none;
          border-radius: 0 0.5rem 0.5rem 0;
          opacity: 0.9;
        }

        .address-display code:hover {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
          color: #f1f5f9;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3);
        }

        .address-display code:hover::before {
          background: linear-gradient(90deg, transparent, #334155);
        }

        .address-display code::-webkit-scrollbar {
          height: 6px;
        }

        .address-display code::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }

        .address-display code::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .address-display code::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #2563eb, #5b21b6);
        }

        /* Firefox scrollbar styling */
        .address-display code {
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 rgba(15, 23, 42, 0.5);
        }

        .copy-btn {
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 1px solid #6b7280;
          color: #d1d5db;
          padding: 0.375rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
        }

        .copy-btn:hover {
          background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
          border-color: #9ca3af;
          color: #f9fafb;
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .copy-btn:active {
          transform: translateY(0) scale(0.95);
          transition: transform 0.1s ease;
        }

        .copy-btn.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #047857;
          color: white;
        }

        .copy-btn.success:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          border-color: #065f46;
          transform: translateY(-1px) scale(1.05);
        }

        .type-badge,
        .risk-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .type-badge.central { background: #4f46e5; color: white; }
        .type-badge.inflow { background: #10b981; color: white; }
        .type-badge.outflow { background: #ef4444; color: white; }
        .type-badge.token { background: #f59e0b; color: white; }
        .type-badge.native { background: #6366f1; color: white; }

        .risk-badge.low { background: #10b981; color: white; }
        .risk-badge.medium { background: #f59e0b; color: white; }
        .risk-badge.high { background: #ef4444; color: white; }
        .risk-badge.critical { background: #dc2626; color: white; }

        .direction-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .direction-badge.in { background: #10b981; color: white; }
        .direction-badge.out { background: #ef4444; color: white; }

        /* Node Tooltip */
        .node-tooltip {
          position: fixed;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border: 2px solid #3b82f6;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          pointer-events: none;
          z-index: 1001;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3);
          backdrop-filter: blur(10px);
          animation: tooltipFadeIn 0.2s ease-out;
          max-width: 400px;
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tooltip-address {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.75rem;
          color: #22d3ee;
          margin-bottom: 0.25rem;
          word-break: break-all;
          line-height: 1.4;
        }

        .tooltip-type {
          font-size: 0.625rem;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .detail-actions {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .action-btn.primary {
          background: #4f46e5;
          color: white;
        }

        .action-btn.primary:hover {
          background: #4338ca;
        }

        .action-btn.secondary {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #475569;
        }

        .action-btn.secondary:hover {
          background: #334155;
          color: #f1f5f9;
        }

        .loading-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #f1f5f9;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #334155;
          border-top: 3px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .fund-flow-stats {
            flex-direction: column;
            gap: 0.5rem;
          }

          .fund-flow-main {
            flex-direction: column;
          }

          .detail-panel {
            width: 100%;
            max-height: 40vh;
          }

          .legend {
            position: relative;
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  )
}
