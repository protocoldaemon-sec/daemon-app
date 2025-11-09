"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Bot } from "lucide-react"
import ReactMarkdown from 'react-markdown'
// remark-gfm is optional; comment out if types/deps unavailable
// import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Cyclops } from '@/components/Cyclops'

// import Sidebar from "@/components/Sidebar"
// import MobileNav from "@/components/MobileNav"
import { useTheme } from "@/hooks/useTheme"

interface Message {
  id: string
  text: string
  sender: "user" | "copilot"
  timestamp: Date
  isStreaming?: boolean
  analysisData?: any
  streamingProgress?: number
}

interface SystemPrompts {
  available_prompts: {
    default: string;
    security_analysis: string;
    transaction_analysis: string;
    educational: string;
    compliance: string;
  };
}

interface CopilotChatOldProps {
  sidebarClosed?: boolean;
}

interface StreamData {
  step?: number;
  status?: string;
  progress?: number;
  data?: any;
  analysis_result?: any;
  detailed_data?: any;
  content?: string;
  type?: string;
  message?: string;
  timestamp?: string;
  delta?: {
    content?: string;
  };
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

const BASE_URL = 'https://agent.daemonprotocol.com'

export function CopilotChatOld({ sidebarClosed = false }: CopilotChatOldProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showFundFlow, setShowFundFlow] = useState(false)
  const [fundFlowAddress, setFundFlowAddress] = useState<string>('')
  const [cyclopsLoading, setCyclopsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  // Check if mobile on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  useEffect(() => {
    // Load system prompts and add initial welcome message
    const initializeChat = async () => {
      try {
        const response = await fetch(`${BASE_URL}/chat-daemon/system-prompts`)
        if (response.ok) {
          const prompts = await response.json()
          setSystemPrompts(prompts)
        }
      } catch (error) {
        console.error('Failed to load system prompts:', error)
      }

      // Add welcome message only once
      setMessages([
        {
          id: "welcome-1",
          text: `# Hello there! 👋

How can I assist you with your investigation today? You can ask me things like:

- Audit this smart contract: 0x...
- Give me a summary of this transaction: txhash...
- Trace the funds from this address: address...
- Analyze security risks for: wallet_address...

I can perform real-time blockchain analysis and provide detailed security reports!`,
          sender: "copilot",
          timestamp: new Date(),
        },
      ])
    }

    initializeChat()
  }, []) // Remove dependency on messages.length

  // Simple auto-scroll function - always scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    if (chatWindowRef.current) {
      const element = chatWindowRef.current
      const scrollableElement = element.querySelector('.overflow-y-auto') || element
      
      scrollableElement.scrollTo({
        top: scrollableElement.scrollHeight,
        behavior: behavior
      })
    }
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages])

  // Auto-scroll during typing indicator  
  useEffect(() => {
    if (isTyping) {
      scrollToBottom('smooth')
    }
  }, [isTyping])

  const updateMessageStream = (messageId: string, update: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...update } : msg
    ))
    
    // Auto-scroll during streaming to keep latest content visible
    setTimeout(() => scrollToBottom('smooth'), 50)
  }

  const detectAddresses = (text: string): string[] => {
    // More robust Solana address regex - must be valid base58 and correct length
    const solanaRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    // Ethereum address regex - must start with 0x and be exactly 40 hex chars
    const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;

    const addresses = [];

    // Find potential Solana addresses
    const solMatches = text.match(solanaRegex) || [];
    for (const addr of solMatches) {
      // Additional validation for Solana addresses
      if (addr.length >= 32 && addr.length <= 44 && !/[0OIl]/.test(addr)) {
        addresses.push(addr);
      }
    }

    // Find Ethereum addresses
    const ethMatches = text.match(ethRegex) || [];
    addresses.push(...ethMatches);

    return [...new Set(addresses)];
  }

  const detectIPAddresses = (text: string): string[] => {
    // IPv4 address regex - matches valid IP addresses
    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const ipMatches = text.match(ipv4Regex) || [];
    return [...new Set(ipMatches)];
  }

  const detectUsernames = (text: string): string[] => {
    // Username regex - matches @username pattern
    const usernameRegex = /@([a-zA-Z0-9_]{1,30})\b/g;
    const matches = [];
    let match;
    while ((match = usernameRegex.exec(text)) !== null) {
      matches.push(match[1]); // Extract username without @
    }
    return [...new Set(matches)];
  }

  const streamChat = async function* (message: string, systemPrompt: string): AsyncGenerator<StreamData> {
    const response = await fetch(`${BASE_URL}/chat-daemon-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        system_prompt: systemPrompt,
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok || !response.body) throw new Error('Failed to start chat stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              // Handle the streaming format with content field
              if (parsed.content) {
                yield { content: parsed.content };
              } else {
                yield parsed;
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  const analyzeAddress = async function* (address: string): AsyncGenerator<StreamData> {
    const response = await fetch(`${BASE_URL}/analyze/${address}`);
    
    if (!response.ok || !response.body) throw new Error('Failed to start address analysis');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
      const { done, value } = await reader.read();
      if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              yield JSON.parse(data);
            } catch (e) {
              console.warn('Failed to parse analysis data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  const handleSend = async () => {
    console.log('handleSend called', { inputValue, isTyping })
    const message = inputValue.trim()
    if (!message || isTyping) {
      console.log('handleSend early return', { message, isTyping })
      return
    }

    console.log('Starting to send message:', message)
    setIsTyping(true)
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    
    // Auto-scroll to show the user's new message
    setTimeout(() => scrollToBottom('smooth'), 500)
    
    const addresses = detectAddresses(message)
    const ipAddresses = detectIPAddresses(message)
    const usernames = detectUsernames(message)

    if (addresses.length === 0 && ipAddresses.length === 0 && usernames.length === 0) {
      // Regular chat without addresses
      const copilotMessageId = `copilot-${Date.now()}`
      const copilotMessage: Message = {
        id: copilotMessageId,
        text: "",
        sender: "copilot",
        timestamp: new Date(),
        isStreaming: true
      }
      
      setMessages(prev => [...prev, copilotMessage])

      try {
        let fullResponse = ""
        let contentBuffer: string[] = []
        
        const systemPrompt = systemPrompts?.available_prompts?.default || "You are a helpful AI assistant specializing in blockchain security analysis."
        
        for await (const chunk of streamChat(message, systemPrompt)) {
          let content = ""
          
          if (typeof chunk === 'string') {
            content = chunk
          } else if (chunk.content) {
            content = chunk.content
          } else if (chunk.delta?.content) {
            content = chunk.delta.content
          } else if (chunk.choices?.[0]?.delta?.content) {
            content = chunk.choices[0].delta.content
          }
          
          if (content) {
            // Add content to buffer
            contentBuffer.push(content)
            
            // Reconstruct the full response with proper formatting
            const reconstructedContent = reconstructStreamingContent(contentBuffer)
            
            updateMessageStream(copilotMessageId, {
              text: reconstructedContent,
              isStreaming: true
            })
          }
        }

        // Final cleanup and formatting
        const finalContent = reconstructStreamingContent(contentBuffer)
        
        updateMessageStream(copilotMessageId, {
          text: finalContent || "I've received your message. How can I help you with blockchain security analysis?",
          isStreaming: false
        })

      } catch (error) {
        console.error('Streaming error:', error)
        updateMessageStream(copilotMessageId, {
          text: "Sorry, I encountered an error processing your request. Please try again.",
          isStreaming: false
        })
      } finally {
        setIsTyping(false)
      }
    } else {
      // Handle usernames first
      for (const username of usernames) {
        await handleUsernameOSINT(username)
      }

      // Handle IP addresses
      for (const ipAddress of ipAddresses) {
        await handleIPGeolocation(ipAddress)
      }

      // Handle blockchain addresses
      for (const address of addresses) {
        await handleAddressAnalysis(address)
      }
      setIsTyping(false)
    }
  }

  const handleAddressAnalysis = async (address: string) => {
    const analysisMessageId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const analysisMessage: Message = {
      id: analysisMessageId,
      text: `🔍 **Analyzing Address**: \`${address}\`\n\n*Initializing security analysis...*`,
      sender: "copilot",
      timestamp: new Date(),
      isStreaming: true,
      streamingProgress: 0
    }
    
    setMessages(prev => [...prev, analysisMessage])

    try {
      let analysisResult: any = {}
      let currentStep = 1
      let analysisSteps: { [key: number]: { status: string; complete: boolean; data?: any } } = {}
      
      for await (const chunk of analyzeAddress(address)) {
        if (chunk.progress !== undefined) {
          const statusText = chunk.status || 'Processing...'
          
          // Update step status
          if (chunk.step) {
            analysisSteps[chunk.step] = {
              status: statusText,
              complete: false,
              data: chunk.data
            }
            
            // Mark previous steps as complete
            for (let i = 1; i < chunk.step; i++) {
              if (analysisSteps[i]) {
                analysisSteps[i].complete = true
              }
            }
          }
          
          // Build modern progress display
          let progressText = `## 🔍 Security Analysis\n\n`
          progressText += `**Target Address**: \`${address}\`\n\n`
          progressText += `### 📊 Analysis Progress\n\n`
          
          // Progress bar
          const progressPercent = chunk.progress || 0
          const progressBars = Math.floor(progressPercent / 5)
          const progressBar = `${'█'.repeat(progressBars)}${'░'.repeat(20 - progressBars)}`
          progressText += `\`${progressBar}\` **${progressPercent}%**\n\n`
          
          // Analysis steps with modern design
          const stepLabels = {
            1: "📥 Fetching Transaction History",
            2: "🔍 Retrieving Signatures", 
            3: "🪙 Analyzing Token Transfers",
            4: "⚖️ Calculating Risk Score",
            5: "📋 Gathering Additional Data",
            6: "🧮 Aggregating Context",
            7: "🤖 Running AI Analysis",
            8: "📄 Generating Report"
          }
          
          Object.keys(stepLabels).forEach(stepNum => {
            const step = parseInt(stepNum)
            const label = stepLabels[step as keyof typeof stepLabels]
            
            if (analysisSteps[step]) {
              const stepData = analysisSteps[step]
              if (stepData.complete) {
                progressText += `\n✅ **${label}** - Completed\n`
              } else if (step === chunk.step) {
                progressText += `\n🔄 **${label}** - ${stepData.status}\n`
              } else {
                progressText += `\n⏸️ **${label}** - Pending\n`
              }
              
              // Show step data if available
              if (stepData.data) {
                const data = stepData.data
                if (data.transactions_count) {
                  progressText += `   \n• **${data.transactions_count}** transactions found\n`
                }
                if (data.signatures_count) {
                  progressText += `   \n• **${data.signatures_count}** signatures retrieved\n`
                }
                if (data.tokens_analyzed !== undefined) {
                  progressText += `   \n• **${data.tokens_analyzed}** tokens analyzed\n`
                }
                if (data.nfts_found !== undefined) {
                  progressText += `   \n• **${data.nfts_found}** NFTs found\n`
                }
                if (data.balance_changes_count !== undefined) {
                  progressText += `   \n• **${data.balance_changes_count}** balance changes detected\n`
                }
              }
            } else {
              progressText += `\n⏸️ **${label}** - Pending\n`
            }
          })
          
          progressText += `\n---\n\n`
          progressText += `**Current Status**: ${statusText}\n\n`
          progressText += `*Powered by Daemon Security Engine*`
          
          updateMessageStream(analysisMessageId, {
            text: progressText,
            streamingProgress: chunk.progress,
            isStreaming: true
          })
        }
        
        if (chunk.analysis_result) {
          analysisResult = chunk
          
          // Show completion status
          const completionText = `## ✅ Analysis Complete\n\n**Address**: \`${address}\`\n\n**Status**: Security analysis completed successfully!\n\n*Generating detailed security report...*`
          
          updateMessageStream(analysisMessageId, {
            text: completionText,
            streamingProgress: 100,
            isStreaming: true
          })
          
          // Show final results after brief delay
          setTimeout(() => {
            const markdownAnalysis = convertAnalysisToMarkdown(address, analysisResult)
            
            updateMessageStream(analysisMessageId, {
              text: markdownAnalysis,
              isStreaming: false,
              analysisData: analysisResult
            })
            
            // Force scroll to bottom when analysis completes
            setTimeout(() => scrollToBottom('smooth'), 500)
          }, 800)
          
          break
        }
      }

    } catch (error) {
      console.error('Error analyzing address:', error)
      updateMessageStream(analysisMessageId, {
        text: `## ❌ Analysis Failed\n\n**Address**: \`${address}\`\n\n**Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**Recommendation**: Please verify the address format and try again.\n\n*If the issue persists, the address may not be supported or the service may be temporarily unavailable.*`,
        isStreaming: false
      })
    }
  }

  const convertAnalysisToMarkdown = (address: string, result: any): string => {
    if (!result.analysis_result) {
      return `
<div class="analysis-incomplete">
  <div class="error-icon">❌</div>
  <h2>Analysis Incomplete</h2>
  <div class="address-display">${address}</div>
  <p>Analysis completed but no detailed results available.</p>
</div>`
    }

    const { threat_analysis, detailed_data } = result.analysis_result
    const riskLevel = threat_analysis?.overall_risk_level || 'unknown'
    const riskScore = threat_analysis?.risk_score || 0
    const threats = threat_analysis?.potential_threats || []
    const riskColor = riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low'
    
    let html = `
<div class="security-report">
  <!-- Report Header -->
  <div class="report-header">
    <div class="header-icon">🛡️</div>
    <h1>Security Analysis Report</h1>
    <div class="report-meta">
      <div class="meta-item">
        <span class="meta-label">Address</span>
        <code class="address-code">${address}</code>
      </div>
      <div class="meta-item">
        <span class="meta-label">Chain</span>
        <span class="meta-value">${threat_analysis?.metadata?.chain || 'Unknown'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Analyzed</span>
        <span class="meta-value">${new Date().toLocaleString()}</span>
      </div>
    </div>
  </div>

  <!-- Risk Assessment Card -->
  <div class="risk-assessment ${riskColor}">
    <div class="risk-header">
      <h2>🎯 Risk Assessment</h2>
      <div class="risk-badge ${riskColor}">${riskLevel.toUpperCase()}</div>
    </div>
    
    <div class="risk-metrics">
      <div class="risk-score-container">
        <div class="risk-score-label">Risk Score</div>
        <div class="risk-score-display">
          <span class="score-number">${riskScore}</span>
          <span class="score-max">/100</span>
        </div>
        <div class="risk-progress">
          <div class="progress-bar">
            <div class="progress-fill ${riskColor}" style="width: ${riskScore}%"></div>
          </div>
        </div>
      </div>
      
      <div class="threat-count">
        <div class="threat-icon">⚠️</div>
        <div class="threat-info">
          <div class="threat-number">${threats.length}</div>
          <div class="threat-label">Threats Found</div>
        </div>
      </div>
    </div>
  </div>`

    // Modern Threat Cards
    if (threats.length > 0) {
      html += `
  <div class="threats-section">
    <h2>🚨 Security Threats Identified</h2>
    <div class="threats-grid">`
    
      threats.forEach((threat: any, idx: number) => {
        const confidenceLevel = threat.confidence || 'medium'
        const evidenceCount = threat.supporting_evidence?.length || 0
        
        html += `
      <div class="threat-card">
        <div class="threat-header">
          <div class="threat-index">${idx + 1}</div>
          <h3 class="threat-title">${threat.threat_type}</h3>
          <div class="confidence-badge ${confidenceLevel}">${confidenceLevel.toUpperCase()}</div>
        </div>
        
        <div class="threat-content">
          <div class="threat-description">${threat.reason}</div>
          
          ${evidenceCount > 0 ? `
          <div class="evidence-section">
            <div class="evidence-icon">📋</div>
            <span class="evidence-text">${evidenceCount} transaction(s) flagged as evidence</span>
          </div>` : ''}
          
          ${threat.recommended_actions && threat.recommended_actions.length > 0 ? `
          <div class="actions-section">
            <h4>🛠️ Recommended Actions</h4>
            <ul class="actions-list">
              ${threat.recommended_actions.map((action: string) => `<li>${action}</li>`).join('')}
            </ul>
          </div>` : ''}
        </div>
      </div>`
      })
      
      html += `
    </div>
  </div>`
    } else {
      html += `
  <div class="no-threats-section">
    <div class="success-icon">✅</div>
    <h2>No Security Threats Detected</h2>
    <p>The analysis found no immediate security concerns with this address.</p>
  </div>`
    }

    // Modern Analytics Cards
    html += `
  <div class="analytics-section">
    <h2>📊 Analysis Overview</h2>
    <div class="analytics-grid">`

    // Transaction Summary Card
    if (detailed_data?.transaction_summary) {
      const summary = detailed_data.transaction_summary
      html += `
      <div class="analytics-card">
        <div class="card-header">
          <div class="card-icon">📈</div>
          <h3>Transaction Activity</h3>
        </div>
        <div class="metrics-list">
          <div class="metric-item">
            <span class="metric-value">${summary.total_transactions || 0}</span>
            <span class="metric-label">Total Transactions</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${summary.recent_signatures || 0}</span>
            <span class="metric-label">Recent Signatures</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${summary.balance_changes || 0}</span>
            <span class="metric-label">Balance Changes</span>
          </div>
        </div>
      </div>`
    }

    // Token Holdings Card
    if (detailed_data?.token_analysis) {
      const tokens = detailed_data.token_analysis
      html += `
      <div class="analytics-card">
        <div class="card-header">
          <div class="card-icon">🪙</div>
          <h3>Asset Portfolio</h3>
        </div>
        <div class="metrics-list">
          <div class="metric-item">
            <span class="metric-value">${tokens.tokens_found || 0}</span>
            <span class="metric-label">Tokens</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${tokens.nfts_found || 0}</span>
            <span class="metric-label">NFTs</span>
          </div>
        </div>
      </div>`
    }

    html += `
    </div>
  </div>`

    // Additional Notes
    if (threat_analysis?.additional_notes) {
      html += `
  <div class="notes-section">
    <div class="notes-header">
      <div class="notes-icon">📝</div>
      <h3>Additional Analysis Notes</h3>
    </div>
    <div class="notes-content">${threat_analysis.additional_notes}</div>
  </div>`
    }

    // Footer
    html += `
  <div class="report-footer">
    <div class="footer-info">
      <div class="engine-info">
        <strong>Analysis Engine:</strong> ${threat_analysis?.engine || 'Daemon Security Engine'}
      </div>
      <div class="report-id">
        <strong>Report ID:</strong> <code>${threat_analysis?.metadata?.analysis_timestamp || 'N/A'}</code>
      </div>
    </div>
    <div class="disclaimer">
      <em>This report is generated based on publicly available blockchain data and should not be considered as financial advice.</em>
    </div>
  </div>
</div>`
    
    return html
  }

  const reconstructStreamingContent = (contentBuffer: string[]): string => {
    if (contentBuffer.length === 0) return ""
    
    // Join all content chunks
    let fullContent = contentBuffer.join('')
    
    // Clean up and format the content
    fullContent = fullContent
      // Ensure proper line breaks before headers
      .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
      // Ensure proper line breaks after headers
      .replace(/(#{1,6}\s[^\n]*)\n([^\n#])/g, '$1\n\n$2')
      // Ensure proper line breaks before list items
      .replace(/([^\n])\n([-*+]\s)/g, '$1\n\n$2')
      .replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
      // Ensure proper line breaks after list items when followed by non-list content
      .replace(/([-*+]\s[^\n]*)\n([^\n\-\*\+\d])/g, '$1\n\n$2')
      .replace(/(\d+\.\s[^\n]*)\n([^\n\d])/g, '$1\n\n$2')
      // Clean up excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Ensure horizontal rules have proper spacing
      .replace(/([^\n])\n(---+)\n([^\n])/g, '$1\n\n$2\n\n$3')
      .trim()
    
    return fullContent
  }

  const preprocessMarkdownText = (text: string): string => {
    if (!text) return ''
    
    console.log('PreprocessMarkdownText called with:', JSON.stringify(text.substring(0, 200)))
    
    // Enhanced preprocessing for better markdown parsing
    let processedText = text
      // Ensure proper spacing around headers
      .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
      .replace(/(#{1,6}\s[^\n]*)\n([^\n#])/g, '$1\n\n$2')
      // Ensure proper spacing around horizontal rules
      .replace(/([^\n])\n(---+)\n([^\n])/g, '$1\n\n$2\n\n$3')
      // Ensure proper list formatting
      .replace(/([^\n])\n([-*+]\s)/g, '$1\n\n$2')
      .replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
      // Ensure lists end properly
      .replace(/([-*+]\s[^\n]*)\n([^\n\-\*\+\d\s])/g, '$1\n\n$2')
      .replace(/(\d+\.\s[^\n]*)\n([^\n\d\s])/g, '$1\n\n$2')
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
      .trim()
    
    console.log('PreprocessMarkdownText result:', JSON.stringify(processedText.substring(0, 200)))
    
    return processedText
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', { key: e.key, shiftKey: e.shiftKey, isTyping, inputValue })
    if (e.key === "Enter" && !e.shiftKey && !isTyping && inputValue.trim()) {
      console.log('Enter key detected, calling handleSend')
      e.preventDefault()
      handleSend()
    }
  }

  const handleToolSelect = (tool: string, exampleInput: string) => {
    setShowWelcome(false)
    setInputValue(exampleInput)
    // Focus on input after a short delay
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement
      if (input) input.focus()
    }, 100)
  }

  const handleAnalyzeAddress = (address: string) => {
    // Set input value to the address for analysis
    setInputValue(`Analyze address: ${address}`)

    // Trigger analysis by calling handleSend after a short delay
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  const handleUsernameOSINT = async (username: string) => {
    const osintMessageId = `osint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const osintMessage: Message = {
      id: osintMessageId,
      text: `**Analyzing Username**: \`@${username}\`\n\n*Running Daemon OSINT analysis...*`,
      sender: "copilot",
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, osintMessage])

    try {
      const response = await fetch(`${BASE_URL}/sherlock/analyze/${username}`)

      if (!response.ok) {
        throw new Error('Failed to fetch OSINT data')
      }

      const data = await response.json()
      const formattedOSINT = formatOSINTData(username, data)

      updateMessageStream(osintMessageId, {
        text: formattedOSINT,
        isStreaming: false
      })

      setTimeout(() => scrollToBottom('smooth'), 500)
    } catch (error) {
      console.error('Error fetching OSINT:', error)
      updateMessageStream(osintMessageId, {
        text: `## OSINT Analysis Failed\n\n**Username**: \`@${username}\`\n\n**Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**Recommendation**: Please verify the username and try again.`,
        isStreaming: false
      })
    }
  }

  const handleIPGeolocation = async (ipAddress: string) => {
    const geoMessageId = `geo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const geoMessage: Message = {
      id: geoMessageId,
      text: `**Looking up IP Address**: \`${ipAddress}\`\n\n*Fetching geolocation data...*`,
      sender: "copilot",
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, geoMessage])

    try {
      const response = await fetch(`${BASE_URL}/ipgeo/lookup/${ipAddress}?include_security=false`)

      if (!response.ok) {
        throw new Error('Failed to fetch geolocation data')
      }

      const data = await response.json()
      const formattedGeo = formatGeolocationData(ipAddress, data)

      updateMessageStream(geoMessageId, {
        text: formattedGeo,
        isStreaming: false
      })

      setTimeout(() => scrollToBottom('smooth'), 500)
    } catch (error) {
      console.error('Error fetching geolocation:', error)
      updateMessageStream(geoMessageId, {
        text: `## Geolocation Lookup Failed\n\n**IP Address**: \`${ipAddress}\`\n\n**Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**Recommendation**: Please verify the IP address format and try again.`,
        isStreaming: false
      })
    }
  }

  const formatOSINTData = (username: string, data: any): string => {
    const footprint = data.footprint_analysis
    if (!footprint) {
      return `## OSINT Data Unavailable\n\n**Username**: \`@${username}\`\n\nNo footprint analysis data found for this username.`
    }

    const standardSearch = footprint.standard_search
    const nsfwSearch = footprint.nsfw_search
    const analysis = footprint.footprint_analysis
    const riskAssessment = analysis?.risk_assessment

    let html = `
<div class="security-report">
  <div class="report-header">
    <div class="header-icon">Daemon OSINT</div>
    <h1>Digital Footprint Analysis</h1>
    <div class="report-meta">
      <div class="meta-item">
        <span class="meta-label">Username</span>
        <code class="address-code">@${username}</code>
      </div>
      <div class="meta-item">
        <span class="meta-label">Analysis Time</span>
        <span class="meta-value">${new Date(footprint.analysis_timestamp).toLocaleString()}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Platforms Found</span>
        <span class="meta-value">${analysis?.total_platforms_found || 0} / ${standardSearch?.total_checked || 0}</span>
      </div>
    </div>
  </div>

  ${riskAssessment ? `
  <div class="risk-assessment ${riskAssessment.risk_level.toLowerCase()}">
    <div class="risk-header">
      <h2>Risk Assessment</h2>
      <div class="risk-badge ${riskAssessment.risk_level.toLowerCase()}">${riskAssessment.risk_level}</div>
    </div>
    
    <div class="osint-risk-grid">
      <div class="osint-risk-card">
        <div class="osint-risk-label">Risk Score</div>
        <div class="osint-risk-value">${riskAssessment.risk_score || 0}</div>
        <div class="osint-risk-max">/100</div>
      </div>
      <div class="osint-risk-card">
        <div class="osint-risk-label">Standard Platforms</div>
        <div class="osint-risk-value">${riskAssessment.standard_platforms}</div>
      </div>
      <div class="osint-risk-card">
        <div class="osint-risk-label">NSFW Platforms</div>
        <div class="osint-risk-value">${riskAssessment.nsfw_platforms}</div>
      </div>
    </div>

    ${riskAssessment.assessment ? `
    <div class="risk-assessment-text">
      <div class="assessment-icon">INFO</div>
      <p>${riskAssessment.assessment}</p>
    </div>` : ''}

    ${riskAssessment.risk_factors && riskAssessment.risk_factors.length > 0 ? `
    <div class="risk-factors-list">
      <h4>Risk Factors</h4>
      <div class="factors-items">
        ${riskAssessment.risk_factors.map((factor: string) => `
          <div class="factor-badge">${factor}</div>
        `).join('')}
      </div>
    </div>` : ''}
  </div>` : ''}

  <div class="report-footer">
    <div class="footer-info">
      <div class="engine-info">
        <strong>Analysis Engine:</strong> Daemon OSINT
      </div>
      <div class="report-id">
        <strong>Analysis ID:</strong> <code>${data.timestamp}</code>
      </div>
    </div>
    <div class="disclaimer">
      <em>This analysis is based on publicly available information and should be used responsibly and ethically.</em>
    </div>
  </div>
</div>`

    return html
  }

  const formatGeolocationData = (ipAddress: string, data: any): string => {
    const geo = data.geolocation
    if (!geo) {
      return `## Geolocation Data Unavailable\n\n**IP Address**: \`${ipAddress}\`\n\nNo geolocation data found for this IP address.`
    }

    let html = `
<div class="security-report">
  <div class="report-header">
    <div class="header-icon">Daemon IP Tracer</div>
    <h1>IP Address Trace Report</h1>
    <div class="report-meta">
      <div class="meta-item">
        <span class="meta-label">IP Address</span>
        <code class="address-code">${geo.ip}</code>
      </div>
      <div class="meta-item">
        <span class="meta-label">Trace Time</span>
        <span class="meta-value">${new Date(data.timestamp).toLocaleString()}</span>
      </div>
    </div>
  </div>

  <div class="geo-location-section">
    <div class="section-header">
      <div class="section-icon">LOCATION</div>
      <h3>Geographic Location</h3>
    </div>
    <div class="geo-grid">
      <div class="geo-card">
        ${geo.country_flag ? `<img src="${geo.country_flag}" alt="${geo.country_code2} flag" class="geo-flag-img" />` : `<div class="geo-flag">${geo.country_emoji || ''}</div>`}
        <div class="geo-details">
          <div class="geo-country">${geo.country_name}</div>
          <div class="geo-official">${geo.country_name_official}</div>
          <div class="geo-codes">
            <span class="geo-badge">${geo.country_code2}</span>
            <span class="geo-badge">${geo.country_code3}</span>
          </div>
        </div>
      </div>
      
      <div class="geo-info-grid">
        <div class="geo-info-item">
          <span class="geo-label">Continent</span>
          <span class="geo-value">${geo.continent_name} (${geo.continent_code})</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">Capital</span>
          <span class="geo-value">${geo.country_capital}</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">State/Province</span>
          <span class="geo-value">${geo.state_prov} (${geo.state_code})</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">District</span>
          <span class="geo-value">${geo.district}</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">City</span>
          <span class="geo-value">${geo.city}</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">Zip Code</span>
          <span class="geo-value">${geo.zipcode}</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">Coordinates</span>
          <span class="geo-value">${geo.latitude}, ${geo.longitude}</span>
        </div>
        <div class="geo-info-item">
          <span class="geo-label">Geoname ID</span>
          <span class="geo-value">${geo.geoname_id}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="report-footer">
    <div class="footer-info">
      <div class="engine-info">
        <strong>Trace Engine:</strong> Daemon IP Tracer
      </div>
      <div class="report-id">
        <strong>Trace ID:</strong> <code>${data.timestamp}</code>
      </div>
    </div>
    <div class="disclaimer">
      <em>This geolocation data is based on IP address databases and may not reflect the exact physical location of the device.</em>
    </div>
  </div>
</div>`

    return html
  }

  const markdownComponents: Components = {
    // Handle HTML content for modern analysis reports
    div: ({ children, className, ...props }) => {
      if (className?.includes('security-report')) {
        return (
          <div className="modern-security-report" {...props}>
            {children}
          </div>
        )
      }
      return <div className={className} {...props}>{children}</div>
    },
    
    code: ({ children, className, ...props }) => {
      const isInline = !className?.includes('language-')
      
      if (className?.includes('address-code')) {
        return (
          <code className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 text-cyan-300 px-2 py-1 rounded-md text-xs font-mono border border-slate-500/30 shadow-sm">
            {children}
          </code>
        )
      }
      
      if (isInline) {
        const textContent = String(children);
        const shouldBeBlock = textContent.length > 30 || textContent.includes('\n');
        
        return shouldBeBlock ? (
          <code className="block bg-slate-800/50 px-2 py-0 rounded-md text-slate-200 font-mono text-xs overflow-x-auto my-1 whitespace-pre-wrap break-words max-w-full border border-slate-600">
            {children}
          </code>
        ) : (
          <code className="bg-slate-700/60 text-cyan-300 px-2 py-0 rounded-md text-sm font-mono border border-slate-600/40">
            {children}
          </code>
        )
      }
      return (
        <pre className="bg-slate-800/50 border border-slate-600 rounded-md p-2 overflow-x-auto my-2 text-xs">
          <code className="text-slate-200 font-mono" {...props}>
            {children}
          </code>
        </pre>
      )
    },
    
    // Improved paragraph handling with reduced spacing
    p: ({ children }) => (
      <p className={`my-0 leading-relaxed text-sm break-words whitespace-pre-wrap ${
        resolvedTheme === 'dark' ? 'text-slate-200' : 'text-slate-700'
      }`}>
        {children}
      </p>
    ),
    
    // Improved list handling similar to ChatBox
    ul: ({ children }) => (
      <ul className={`list-none my-0 pl-3 space-y-0 ${
        resolvedTheme === 'dark' ? 'text-slate-200' : 'text-slate-700'
      }`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={`list-decimal list-inside my-0 pl-3 space-y-0 ${
        resolvedTheme === 'dark' ? 'text-slate-200' : 'text-slate-700'
      }`}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className={`leading-snug text-sm my-0 relative pl-4 before:content-['•'] before:absolute before:left-0 before:font-bold before:text-sm before:leading-snug ${
        resolvedTheme === 'dark' 
          ? 'text-slate-200 before:text-cyan-400' 
          : 'text-slate-700 before:text-blue-500'
      }`}>
        {children}
      </li>
    ),
    
    strong: ({ children }) => (
      <strong className={`font-semibold text-sm ${
        resolvedTheme === 'dark' ? 'text-cyan-300' : 'text-blue-600'
      }`}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className={`italic text-sm ${
        resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
      }`}>
        {children}
      </em>
    ),
    
    // Improved heading spacing
    h1: ({ children }) => (
      <h1 className={`text-lg font-bold mb-1 mt-1 border-b pb-2 ${
        resolvedTheme === 'dark' 
          ? 'text-white border-slate-600' 
          : 'text-slate-900 border-slate-300'
      }`}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={`text-base font-semibold mb-1 mt-1 ${
        resolvedTheme === 'dark' ? 'text-white' : 'text-slate-900'
      }`}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={`text-sm font-semibold mb-0.5 mt-0.5 ${
        resolvedTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
      }`}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className={`text-sm font-semibold mb-0.5 mt-0.5 ${
        resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
      }`}>
        {children}
      </h4>
    ),
    
    blockquote: ({ children }) => (
      <blockquote className={`border-l-2 pl-4 py-1 my-1 rounded-r italic text-sm ${
        resolvedTheme === 'dark'
          ? 'border-cyan-400 bg-slate-800/30 text-slate-300'
          : 'border-blue-400 bg-slate-100/50 text-slate-600'
      }`}>
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`underline decoration-dotted underline-offset-2 transition-colors text-sm font-medium ${
          resolvedTheme === 'dark'
            ? 'text-cyan-400 hover:text-cyan-300'
            : 'text-blue-600 hover:text-blue-500'
        }`}
      >
        {children}
      </a>
    ),
    hr: () => <hr className="border-slate-600 my-4" />,
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-slate-600 text-sm rounded-md">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-slate-600 hover:bg-slate-800/30">{children}</tr>,
    th: ({ children }) => (
      <th className="border border-slate-600 px-3 py-2 text-left font-semibold text-white text-sm">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-slate-600 px-3 py-2 text-slate-200 text-sm">
        {children}
      </td>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Main chat container */}
      <div ref={chatWindowRef} className="relative bg-slate-900/60 border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border-b border-slate-600/50">
          <h1 className="plus-jakarta text-2xl font-bold text-white px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            Daemon Core
            <div className="ml-auto">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </h1>
        </div>

            <div className="h-[calc(100vh-4rem)] md:h-screen max-h-[calc(100vh-4rem)] md:max-h-screen flex flex-col relative overflow-hidden">
              {/* Feature Cards - Only show when no user messages yet */}
              {/* {messages.length <= 1 && (
                <div className="px-6 py-8">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                  <div 
                    className={`backdrop-blur-sm rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      resolvedTheme === 'dark'
                        ? 'bg-slate-800/70 border-slate-700/50'
                        : 'bg-white/70 border-white/50'
                    }`}
                    onClick={() => {
                      setInputValue("Audit this smart contract: 0x...");
                      setTimeout(() => document.querySelector('input')?.focus(), 100);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Shield className="w-6 h-6 text-purple-500" />
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        resolvedTheme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                      }`}>
                        <svg className={`w-3 h-3 ${
                          resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
              </div>
              </div>
                    <p className={`text-sm ${
                      resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Audit this smart contract: 0x...</p>
            </div>

                  <div 
                    className={`backdrop-blur-sm rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      resolvedTheme === 'dark'
                        ? 'bg-slate-800/70 border-slate-700/50'
                        : 'bg-white/70 border-white/50'
                    }`}
                    onClick={() => {
                      setInputValue("Give me a summary of this transaction: txhash...");
                      setTimeout(() => document.querySelector('input')?.focus(), 100);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-6 h-6 text-blue-500" />
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        resolvedTheme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                      }`}>
                        <svg className={`w-3 h-3 ${
                          resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                  </div>
                    </div>
                    <p className={`text-sm ${
                      resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Give me a summary of this transaction: txhash...</p>
                  </div>

                  <div 
                    className={`backdrop-blur-sm rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      resolvedTheme === 'dark'
                        ? 'bg-slate-800/70 border-slate-700/50'
                        : 'bg-white/70 border-white/50'
                    }`}
                    onClick={() => {
                      setInputValue("Trace the funds from this address: address...");
                      setTimeout(() => document.querySelector('input')?.focus(), 100);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Users className="w-6 h-6 text-green-500" />
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        resolvedTheme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                      }`}>
                        <svg className={`w-3 h-3 ${
                          resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                      </div>
                    </div>
                    <p className={`text-sm ${
                      resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Trace the funds from this address: address...</p>
                  </div>

                  <div 
                    className={`backdrop-blur-sm rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      resolvedTheme === 'dark'
                        ? 'bg-slate-800/70 border-slate-700/50'
                        : 'bg-white/70 border-white/50'
                    }`}
                    onClick={() => {
                      setInputValue("Analyze security risks for: wallet_address");
                      setTimeout(() => document.querySelector('input')?.focus(), 100);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Shield className="w-6 h-6 text-orange-500" />
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        resolvedTheme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                      }`}>
                        <svg className={`w-3 h-3 ${
                          resolvedTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                </div>
                    </div>
                    <p className={`text-sm ${
                      resolvedTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Analyze security risks for: wallet_address</p>
                  </div>
                </div>
                </div>
              )} */}

        {/* Chat messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 pb-32 bg-gradient-to-b from-transparent to-slate-900/20">
          {showWelcome && messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-header">
                <h2 className="welcome-title">Welcome to Daemon Core</h2>
                <p className="welcome-subtitle">Your all-in-one security and intelligence platform</p>
              </div>

              <div className="welcome-tools-grid">
                <div className="welcome-tool-card" onClick={() => handleToolSelect('blockchain', 'Please analyze this wallet address CwkGxm8n8r9C8LMfcHxpqcFFXuzfchZQPW9hTMU6pump')}>
                  <div className="tool-icon blockchain">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <h3 className="tool-title">Blockchain Analysis</h3>
                  <p className="tool-description">Analyze wallet addresses, track transactions, and assess security risks</p>
                  <div className="tool-example">Example: CwkGxm8n...</div>
                </div>

                <div className="welcome-tool-card" onClick={() => handleToolSelect('ip', 'Trace this ip address 101.128.64.5')}>
                  <div className="tool-icon ip">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <h3 className="tool-title">IP Intelligence</h3>
                  <p className="tool-description">Trace IP addresses and discover geolocation, ISP, and network details</p>
                  <div className="tool-example">Example: 101.128.64.5</div>
                </div>

                <div className="welcome-tool-card" onClick={() => handleToolSelect('osint', 'Search and analyze this identity @username')}>
                  <div className="tool-icon osint">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <h3 className="tool-title">OSINT Investigation</h3>
                  <p className="tool-description">Search username footprints and analyze digital presence across platforms</p>
                  <div className="tool-example">Example: @username</div>
                </div>

                <div className="welcome-tool-card" onClick={() => handleToolSelect('chat', 'What can you help me with?')}>
                  <div className="tool-icon chat">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h3 className="tool-title">AI Assistant</h3>
                  <p className="tool-description">Ask questions about blockchain security and get expert guidance</p>
                  <div className="tool-example">Example: Ask anything</div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${message.sender === "user"
                  ? "bg-gradient-to-br from-cyan-400 to-blue-500"
                  : "bg-gradient-to-br from-slate-700 to-slate-600"
                  }`}>
                  {message.sender === "copilot" ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  )}
                </div>

                {/* Message bubble */}
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${message.sender === "user"
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-gradient-to-br from-slate-800 to-slate-700 text-slate-100 shadow-lg shadow-black/25 border border-slate-600/30"
                  }`}>
                  <div className="max-w-none">
                    {message.text.includes('<div class="security-report">') ? (
                      <div
                        className="modern-analysis-container"
                        dangerouslySetInnerHTML={{ __html: message.text }}
                      />
                    ) : (
                      <div className="markdown-content">
                        {(() => {
                          const processedText = preprocessMarkdownText(message.text)
                          console.log('Final text sent to ReactMarkdown:', JSON.stringify(processedText))
                          return (
                            <ReactMarkdown
                              components={markdownComponents}
                              remarkPlugins={[]}
                              rehypePlugins={[]}
                              skipHtml={false}
                            >
                              {processedText}
                            </ReactMarkdown>
                          )
                        })()}
                      </div>
                    )}
                  </div>                {/* Progress bar for streaming */}
                  {message.isStreaming && message.streamingProgress !== undefined && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs opacity-75">
                        <span>Analyzing...</span>
                        <span>{message.streamingProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-600/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out shadow-sm shadow-cyan-400/50"
                          style={{ width: `${message.streamingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl px-5 py-4 shadow-lg shadow-black/25 border border-slate-600/30">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "-0.32s" }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "-0.16s" }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
                  </div>
                </div>
            </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent backdrop-blur-sm">
        <div
          className={`w-full mx-auto transition-all duration-300 ${isMobile
            ? 'px-0' // No left padding on mobile since sidebar is hidden
            : sidebarClosed
              ? 'pl-[4.5rem]' // Match sidebar w-18 (72px)
              : 'pl-64'  // Match sidebar w-64 exactly
            }`}
        >
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/50 shadow-xl shadow-black/25 p-1 max-w-none">
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent px-3 md:px-4 py-2 md:py-3 text-slate-200 focus:outline-none placeholder:text-slate-400 text-sm min-w-0"
                placeholder="Ask Daemon Copilot anything or paste an address to analyze..."
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white p-2 md:p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 disabled:cursor-not-allowed flex-shrink-0"
                title={!inputValue.trim() ? "Type a message to send" : isTyping ? "Please wait for the current response" : "Send message"}
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cyclops Visualization */}
      {showFundFlow && (
        <Cyclops
          address={fundFlowAddress}
          onClose={() => {
            setShowFundFlow(false)
            setCyclopsLoading(false)
            // Reset button state
            const button = document.getElementById(`cyclops-btn-${fundFlowAddress}`) as HTMLButtonElement
            if (button) {
              button.disabled = false
              const btnIcon = button.querySelector('.btn-icon') as HTMLElement
              const btnText = button.querySelector('.btn-text') as HTMLElement
              const btnLoader = button.querySelector('.btn-loader') as HTMLElement

              if (btnIcon) btnIcon.style.display = 'inline'
              if (btnText) btnText.style.display = 'inline'
              if (btnLoader) btnLoader.style.display = 'none'
            }
          }}
          onLoadingChange={(isLoading: boolean) => {
            setCyclopsLoading(isLoading)
            // Update button state based on actual loading
            const button = document.getElementById(`cyclops-btn-${fundFlowAddress}`) as HTMLButtonElement
            if (button) {
              button.disabled = isLoading
              const btnIcon = button.querySelector('.btn-icon') as HTMLElement
              const btnText = button.querySelector('.btn-text') as HTMLElement
              const btnLoader = button.querySelector('.btn-loader') as HTMLElement

              if (isLoading) {
                if (btnIcon) btnIcon.style.display = 'none'
                if (btnText) btnText.style.display = 'none'
                if (btnLoader) btnLoader.style.display = 'flex'
              } else {
                if (btnIcon) btnIcon.style.display = 'inline'
                if (btnText) btnText.style.display = 'inline'
                if (btnLoader) btnLoader.style.display = 'none'
              }
            }
          }}
          onAnalyzeAddress={handleAnalyzeAddress}
        />
      )}
    </div>
  )
}

// Add global window function for triggering Cyclops from HTML buttons
if (typeof window !== 'undefined') {
  (window as any).triggerFundFlow = (address: string) => {
    // Just trigger the event - loading will be handled by Cyclops component
    const event = new CustomEvent('openFundFlow', { detail: { address } });
    window.dispatchEvent(event);
  }

  // Add global window function for exporting PDF report
  (window as any).exportPDFReport = async (address: string) => {
    const button = document.getElementById(`pdf-btn-${address}`) as HTMLButtonElement
    if (!button) return

    try {
      // Show loading state
      button.disabled = true
      const btnIcon = button.querySelector('.btn-icon') as HTMLElement
      const btnText = button.querySelector('.btn-text') as HTMLElement
      const btnLoader = button.querySelector('.btn-loader') as HTMLElement

      if (btnIcon) btnIcon.style.display = 'none'
      if (btnText) btnText.style.display = 'none'
      if (btnLoader) btnLoader.style.display = 'flex'

      // Call the PDF export API
      const response = await fetch(`${BASE_URL}/export/pdf/${address}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF report')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daemon_report_${address}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('PDF export error:', error)
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Reset button state
      button.disabled = false
      const btnIcon = button.querySelector('.btn-icon') as HTMLElement
      const btnText = button.querySelector('.btn-text') as HTMLElement
      const btnLoader = button.querySelector('.btn-loader') as HTMLElement

      if (btnIcon) btnIcon.style.display = 'inline'
      if (btnText) btnText.style.display = 'inline'
      if (btnLoader) btnLoader.style.display = 'none'
    }
  }
}

// Default export for backward compatibility
export default function ChatCopilotOld() {
  return (
    <CopilotChatOld />
  )
}
