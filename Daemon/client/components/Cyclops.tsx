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
import { Activity, ArrowUpRight, ArrowDownLeft, ExternalLink, Copy, Eye, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize2, Check, ChevronDown } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

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
  const [isSheetExpanded, setIsSheetExpanded] = useState(true)
  const { isDark } = useTheme()
  const [isSheetVisible, setIsSheetVisible] = useState(false)
  const [isSheetMounted, setIsSheetMounted] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const closeBottomSheet = useCallback(() => {
    // Hide immediately
    setIsSheetVisible(false)
    // Clear selections first to prevent auto-remount by effect
    setSelectedNode(null)
    setSelectedEdge(null)
    // Unmount after exit animation
    const t = setTimeout(() => {
      setIsSheetMounted(false)
    }, 380)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (selectedNode || selectedEdge) {
      setIsSheetMounted(true)
      const id = requestAnimationFrame(() => setIsSheetVisible(true))
      return () => cancelAnimationFrame(id)
    } else if (isSheetMounted) {
      setIsSheetVisible(false)
      const t = setTimeout(() => setIsSheetMounted(false), 360)
      return () => clearTimeout(t)
    }
  }, [selectedNode, selectedEdge, isSheetMounted])

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
    <div className={`fund-flow-3d ${isDark ? 'dark' : 'light'}`}>
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
              <div className="stat-card stat-card--volume mb-2">
                <div className="stat-value">{formatAmount(stats.totalVolume)} SOL</div>
                <div className="stat-label">Total Volume</div>
              </div>
              {!statsExpanded && (
                <button
                  className={`expand-toggle ${statsExpanded ? 'open' : ''}`}
                  aria-label={statsExpanded ? 'Sembunyikan statistik' : 'Tampilkan statistik'}
                  onClick={() => setStatsExpanded(!statsExpanded)}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
              {statsExpanded && (
                <div className="stats-grid mb-2">
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalTransactions}</div>
                    <div className="stat-label">Transactions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.timeSpan}</div>
                    <div className="stat-label">Time Span</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.uniqueAddresses}</div>
                    <div className="stat-label">Unique Addresses</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value risk-score">{stats.riskScore}%</div>
                    <div className="stat-label">Risk Score</div>
                  </div>
                </div>
              )}
              {statsExpanded && (
                <button
                  className={`expand-toggle ${statsExpanded ? 'open' : ''}`}
                  aria-label={statsExpanded ? 'Sembunyikan statistik' : 'Tampilkan statistik'}
                  onClick={() => setStatsExpanded(!statsExpanded)}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
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


          

            <div className="legend items-center justify-center text-center">             
              <div className="zoom-indicator">
                <button className="zoom-btn zoom-in" aria-label="Zoom in" onClick={() => setZoom(prev => Math.min(prev * 1.1, 5))}>+</button>
                <span className="zoom-text">Zoom: {(zoom * 100).toFixed(0)}%</span>
                <button className="zoom-btn zoom-out" aria-label="Zoom out" onClick={() => setZoom(prev => Math.max(prev / 1.1, 0.2))}>-</button>
              </div>
              <div className="legend-row mt-12">
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
            </div>      
          </div>
          {/* Bottom sheet rendered below */}
        </div>
        {isSheetMounted && (
          <div className={`bottom-sheet ${isSheetExpanded ? 'expanded' : 'collapsed'} ${isSheetVisible ? 'visible' : ''}`}>
            <div className="sheet-header" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
              <div className="sheet-grabber" />
              {/* <div className="sheet-title">{selectedNode ? 'Address Details' : 'Transaction Details'}</div> */}
              <button
                className="sheet-close"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeBottomSheet();
                }}
              >
                ×
              </button>
            </div>
            <div className="sheet-body z-99">
              {selectedNode && (
                <div className="node-details">
                  <h4 className='sheet-title'>Address Details</h4>
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
          </div>
        )}
      </div>

      <style jsx>{`
        /* Theme variables */
        .fund-flow-3d.light {
          --bg: rgba(242, 242, 247, 0.85);
          --header-bg: rgba(255, 255, 255, 0.7);
          --text: #1c1c1e;
          --subtext: rgba(60, 60, 67, 0.6);
          --border: rgba(60, 60, 67, 0.12);
          --chip-bg: rgba(118, 118, 128, 0.12);
          --chip-border: rgba(60, 60, 67, 0.16);
          --primary: #0a84ff;
          --success: #34c759;
          --danger: #ff3b30;
          --warning: #ff9500;
          --card-bg: rgba(255, 255, 255, 0.8);
          --panel-bg: rgba(255, 255, 255, 0.95);
          --canvas-bg: #ffffff;
          --shadow: rgba(0, 0, 0, 0.06);
        }
        .fund-flow-3d.dark {
          --bg: rgba(0, 0, 0, 0.85);
          --header-bg: rgba(28, 28, 30, 0.7);
          --text: #f2f2f7;
          --subtext: rgba(235, 235, 245, 0.6);
          --border: rgba(84, 84, 88, 0.36);
          --chip-bg: rgba(118, 118, 128, 0.24);
          --chip-border: rgba(84, 84, 88, 0.65);
          --primary: #0a84ff;
          --success: #30d158;
          --danger: #ff453a;
          --warning: #ff9f0a;
          --card-bg: rgba(28, 28, 30, 0.8);
          --panel-bg: rgba(28, 28, 30, 0.9);
          --canvas-bg: #1c1c1e;
          --shadow: rgba(0, 0, 0, 0.3);
        }

        /* iOS-inspired visual style */
        .fund-flow-3d {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          backdrop-filter: saturate(180%) blur(20px);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: var(--text);
        }

        .fund-flow-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--header-bg);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }

        .fund-flow-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .address-badge {
          background: var(--chip-bg);
          border: 1px solid var(--chip-border);
          color: var(--text);
          padding: 6px 10px;
          border-radius: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          word-break: break-all;
          white-space: normal;
          line-height: 1.2;
          max-width: fit-content;
        }

        .address-badge:hover {
          background: var(--chip-bg);
          border-color: var(--chip-border);
          transform: translateY(-1px);
        }

        .close-btn {
          background: var(--chip-bg);
          color: var(--text);
          border: 1px solid var(--chip-border);
          border-radius: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: var(--chip-bg);
          border-color: var(--chip-border);
        }

        .fund-flow-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .fund-flow-stats {
          display: block;
          grid-template-columns: 1fr; /* total volume full width */
          gap: 12px;
          padding: 12px 16px;
          // background: var(--header-bg);
          // -webkit-backdrop-filter: blur(20px);
          // backdrop-filter: blur(20px);
          // border-bottom: 1px solid var(--border);
          overflow: visible;
          align-items: stretch;
        }

        .stat-card {
          min-width: 0;
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          background: var(--card-bg);
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px var(--shadow);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .stat-card--volume { grid-column: 1 / -1; height: 64px; }

        .expand-toggle {
          grid-column: 1 / -1;
          width: 36px;
          height: 36px;
          border-radius: 18px;
          border: 1px solid var(--chip-border);
          background: var(--chip-bg);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto; /* center under the card */
          cursor: pointer;
        }

        .expand-toggle:hover { background: var(--chip-bg); }
        .expand-toggle svg { transition: transform 0.2s ease; }
        .expand-toggle.open svg { transform: rotate(180deg); }

        .stats-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
          letter-spacing: -0.02em;
        }

        .stat-value.risk-score {
          color: #0a84ff;
        }

        .stat-label {
          font-size: 11px;
          color: var(--subtext);
          text-transform: none;
          letter-spacing: 0;
        }

        .no-data-message {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 24px;
          color: rgba(60, 60, 67, 0.6);
        }

        .loading-stats, .no-data-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(60, 60, 67, 0.12);
          border-top-color: #0a84ff;
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
          gap: 12px;
          padding: 12px 16px;
        }

        .visualization-container {
          // flex: 1;
          position: relative;
          overflow: hidden;
          background: var(--canvas-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 4px 20px var(--shadow);
        }

        .fund-flow-canvas {
          display: block;
          margin: 0 auto;
          cursor: grab;
          border-radius: 12px;
          background: var(--canvas-bg);
        }

        .fund-flow-canvas:active { cursor: grabbing; }
        .fund-flow-canvas.node-hover { cursor: move; }

        .legend {
          position: absolute;
          top: 12px;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--header-bg);
          color: var(--text);
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--chip-bg);
          border: 1px solid var(--chip-border);
          border-radius: 999px; /* iOS pill */
          color: var(--text);
          font-size: 12px;
          line-height: 1;
          box-shadow: 0 1px 3px var(--shadow);
        }

        .legend-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          max-width: 440px;
          justify-items: center;
        }

        .legend-color { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }
        .legend-color.central { background: var(--primary); }
        .legend-color.inflow { background: var(--success); }
        .legend-color.outflow { background: var(--danger); }
        .legend-color.token { background: var(--warning); }

        .zoom-indicator {
          position: absolute;
          left: 0;
          right: 0;
          top:0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0px 12px;
          background: var(--header-bg);
          color: var(--text);
        }

        .zoom-text { font-size: 12px; opacity: 0.9; }
        .zoom-btn {
          width: 28px;
          height: 28px;
          border-radius: 14px;
          border: 1px solid var(--chip-border);
          background: var(--chip-bg);
          color: var(--text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          cursor: pointer;
        }
        .zoom-btn:hover { background: var(--chip-bg); }

        .detail-panel {
          width: 300px;
          background: var(--panel-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          overflow-y: auto;
          box-shadow: 0 4px 18px var(--shadow);
        }

        .node-details h4,
        .edge-details h4 {
          color: var(--text);
          margin-bottom: 12px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }

        .detail-row span:first-child {
          color: var(--subtext);
          font-size: 12px;
          font-weight: 500;
        }

        .detail-row span:last-child {
          color: var(--text);
          font-size: 13px;
        }

        .address-display {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .address-display code {
          background: var(--chip-bg);
          border: 1px solid var(--chip-border);
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 11px;
          color: var(--text);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          word-break: break-all;
          max-width: 320px;
          overflow-x: auto;
          white-space: nowrap;
          flex: 1;
          transition: all 0.2s ease;
          position: relative;
          scroll-behavior: smooth;
        }

        .address-display code::-webkit-scrollbar { height: 6px; }
        .address-display code::-webkit-scrollbar-track { background: rgba(60, 60, 67, 0.08); border-radius: 3px; }
        .address-display code::-webkit-scrollbar-thumb { background: rgba(60, 60, 67, 0.24); border-radius: 3px; }

        .copy-btn {
          background: var(--primary);
          border: 1px solid rgba(10, 132, 255, 0.2);
          color: white;
          padding: 6px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
        }

        .copy-btn:hover { filter: brightness(0.95); }
        .copy-btn:active { transform: scale(0.98); }
        .copy-btn.success { background: var(--success); border-color: rgba(52, 199, 89, 0.2); }

        .type-badge,
        .risk-badge {
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
        }

        .type-badge.central { background: rgba(10, 132, 255, 0.12); color: #0a84ff; }
        .type-badge.inflow { background: rgba(52, 199, 89, 0.12); color: #34c759; }
        .type-badge.outflow { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
        .type-badge.token { background: rgba(255, 149, 0, 0.12); color: #ff9500; }
        .type-badge.native { background: rgba(94, 92, 230, 0.12); color: #5e5ce6; }

        .risk-badge.low { background: rgba(52, 199, 89, 0.12); color: #34c759; }
        .risk-badge.medium { background: rgba(255, 149, 0, 0.12); color: #ff9500; }
        .risk-badge.high { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
        .risk-badge.critical { background: rgba(255, 69, 58, 0.12); color: #ff453a; }

        .direction-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text);
          background: var(--chip-bg);
          border: 1px solid var(--chip-border);
        }

        .direction-badge.in { color: #34c759; border-color: rgba(52, 199, 89, 0.3); }
        .direction-badge.out { color: #ff3b30; border-color: rgba(255, 59, 48, 0.3); }

        /* Node Tooltip */
        .node-tooltip {
          position: fixed;
          background: var(--panel-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 10px;
          pointer-events: none;
          z-index: 1001;
          box-shadow: 0 8px 24px var(--shadow);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          animation: tooltipFadeIn 0.2s ease-out;
          max-width: 380px;
        }

        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tooltip-address {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          color: var(--primary);
          margin-bottom: 2px;
          word-break: break-all;
          line-height: 1.4;
        }

        .tooltip-type {
          font-size: 10px;
          color: rgba(60, 60, 67, 0.6);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .detail-actions { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .action-btn.primary { background: #0a84ff; color: #fff; border-color: rgba(10, 132, 255, 0.2); }
        .action-btn.primary:hover { filter: brightness(0.95); }
        .action-btn.secondary { background: rgba(118, 118, 128, 0.12); color: #1c1c1e; border-color: rgba(60, 60, 67, 0.16); }
        .action-btn.secondary:hover { background: rgba(118, 118, 128, 0.18); }

        .loading-container { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #1c1c1e; }
        .loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(60, 60, 67, 0.12); border-top: 3px solid #0a84ff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }

        @media (max-width: 768px) {
          .fund-flow-main { flex-direction: column; }
          .detail-panel { width: 100%; max-height: 40vh; }
          .legend { position: relative; margin: 12px; }
          .fund-flow-stats { grid-auto-flow: column; grid-template-rows: repeat(2, minmax(0, 1fr)); grid-auto-columns: 1fr; }
        }

        /* iOS-like bottom sheet */
        .bottom-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--panel-bg);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border-top-left-radius: 18px;
          border-top-right-radius: 18px;
          border-top: 1px solid var(--border);
          box-shadow: 0 -8px 30px var(--shadow);
          transform: translateY(100%);
          opacity: 0;
          transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms ease, opacity 320ms ease;
          overflow: hidden;
        }
        .bottom-sheet.expanded { height: 48%; }
        .bottom-sheet.collapsed { height: 64px; }
        .bottom-sheet.visible { transform: translateY(0); opacity: 1; }

        /* content fade-slide */
        .bottom-sheet .sheet-body { opacity: 0; transform: translateY(10px); transition: opacity 280ms ease, transform 280ms ease; }
        .bottom-sheet.visible .sheet-body { opacity: 1; transform: translateY(0); }
        .bottom-sheet .sheet-header { opacity: 0; transform: translateY(4px); transition: opacity 240ms ease 80ms, transform 240ms ease 80ms; }
        .bottom-sheet.visible .sheet-header { opacity: 1; transform: translateY(0); }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px 6px 12px;
          cursor: pointer;
          user-select: none;
        }
        .sheet-grabber {
          width: 36px;
          height: 5px;
          border-radius: 3px;
          background: var(--subtext);
        }
        .sheet-title { flex: 1; text-align: center; font-size: 13px; color: var(--subtext); font-weight: 600; letter-spacing: 0.01em; }
        .sheet-close { position: absolute; right: 12px; top: 8px; width: 28px; height: 28px; border-radius: 14px; border: 1px solid var(--chip-border); background: var(--chip-bg); color: var(--text); display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; cursor: pointer; z-index: 1; }
        .sheet-close:hover { background: var(--chip-bg); }

        .sheet-body { padding: 12px 16px 16px 16px; overflow-y: auto; height: calc(100% - 40px); }
      `}</style>
    </div>
  )
}