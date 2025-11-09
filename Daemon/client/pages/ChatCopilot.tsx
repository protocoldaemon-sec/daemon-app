"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useTheme } from "@/hooks/useTheme"
import { Send, User } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
// import Header from "@/components/Header"
// import Sidebar from "@/components/Sidebar"
import { Cyclops } from "@/components/Cyclops"
import { useWallet } from "@/hooks/useWallet"
import { authenticatedFetch, API_CONFIG } from "@/utils/apiConfig"

// Use direct import for Cyclops to be compatible outside Next.js

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

interface ChatCopilotProps {
  sidebarClosed?: boolean;
}

// User Avatar Component
function UserAvatar({ profileImage }: { profileImage: string | null }) {
  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt="User"
        className="w-10 h-10 rounded-xl object-cover"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
      <User className="w-5 h-5 text-white" />
    </div>
  );
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

// Use secure API configuration
const BASE_URL = API_CONFIG.BASE_URL
export function ChatCopilot({ sidebarClosed = false }: ChatCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showFundFlow, setShowFundFlow] = useState(false)
  const [fundFlowAddress, setFundFlowAddress] = useState<string>('')
  const [cyclopsLoading, setCyclopsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const { wallet } = useWallet()
  const { isDark } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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

  // Load profile image and listen for updates
  useEffect(() => {
    const walletAddress = wallet?.address;
    if (walletAddress) {
      // Load initial profile image
      const savedProfileImage = localStorage.getItem(`profile_image_${walletAddress}`);
      if (savedProfileImage) {
        setProfileImage(savedProfileImage);
      }
    }

    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail.wallet === walletAddress) {
        setProfileImage(event.detail.profileImage);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [wallet?.address]);

  useEffect(() => {
    // Load system prompts and add initial welcome message
    const initializeChat = async () => {
      try {
        const response = await authenticatedFetch('/chat-daemon/system-prompts')
        const prompts = await response.json()
        setSystemPrompts(prompts)
      } catch (error) {
        console.error('Failed to load system prompts:', error)
        // Handle API key errors specifically
        if (error instanceof Error) {
          if (error.message.includes('Invalid API key')) {
            console.error('⚠️ API Key Error: Please check your API key configuration');
          } else if (error.message.includes('unauthorized access')) {
            console.error('⚠️ Authorization Error: API key may be expired or invalid');
          }
        }
      }

      // Add welcome message only once
      setMessages([
        {
          id: "welcome-1",
          text: `# Welcome to Chat

How can I assist you with your investigation today? You can ask me things like:

- **Audit this smart contract**: \`0x...\`
- **Give me a summary of this transaction**: \`txhash...\`  
- **Trace the funds from this address**: \`address...\`
- **Analyze security risks for**: \`wallet_address\`

I can perform real-time blockchain analysis and provide detailed security reports!`,
          sender: "copilot",
          timestamp: new Date(),
        },
      ])
    }

    // Handle Cyclops trigger events
    const handleFundFlowTrigger = (event: CustomEvent) => {
      const { address } = event.detail
      setFundFlowAddress(address)
      setShowFundFlow(true)
      
      // Immediately set button to loading state
      setTimeout(() => {
        const button = document.getElementById(`cyclops-btn-${address}`) as HTMLButtonElement
        if (button) {
          button.disabled = true
          const btnIcon = button.querySelector('.btn-icon') as HTMLElement
          const btnText = button.querySelector('.btn-text') as HTMLElement
          const btnLoader = button.querySelector('.btn-loader') as HTMLElement
          
          if (btnIcon) btnIcon.style.display = 'none'
          if (btnText) btnText.style.display = 'none'
          if (btnLoader) btnLoader.style.display = 'flex'
        }
      }, 10) // Very short delay to ensure DOM is ready
    }

    window.addEventListener('openFundFlow', handleFundFlowTrigger as EventListener)
    initializeChat()

    return () => {
      window.removeEventListener('openFundFlow', handleFundFlowTrigger as EventListener)
    }
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

  const streamChat = async function* (message: string, systemPrompt: string): AsyncGenerator<StreamData> {
    const response = await authenticatedFetch('/chat-daemon-stream', {
      method: 'POST',
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
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue; // Skip empty lines
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim();
            if (data === '[DONE]') return;
            if (!data) continue; // Skip empty data
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle different response formats
              if (parsed.content && parsed.type === "content") {
                // Handle the streaming content format
                yield { content: parsed.content, type: parsed.type, timestamp: parsed.timestamp };
              } else if (parsed.content) {
                // Handle other content formats
                yield { content: parsed.content };
              } else if (parsed.status || parsed.message) {
                // Handle status messages
                yield { 
                  status: parsed.status, 
                  message: parsed.message, 
                  timestamp: parsed.timestamp 
                };
              } else if (parsed.type === "done") {
                // Handle completion messages
                yield { 
                  type: parsed.type, 
                  message: parsed.message, 
                  timestamp: parsed.timestamp 
                };
                return; // End streaming
              } else {
                // Handle other formats
                yield parsed;
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data, 'Error:', e);
              // Try to handle malformed JSON by attempting to fix common issues
              try {
                // Sometimes data might have trailing commas or incomplete objects
                const fixedData = data.replace(/,(\s*[}\]])/g, '$1').trim();
                if (fixedData.startsWith('{') && fixedData.endsWith('}')) {
                  const parsed = JSON.parse(fixedData);
                  yield parsed;
                }
              } catch (fixError) {
                console.warn('Could not fix malformed JSON, skipping chunk');
                // Continue processing other chunks
              }
            }
          }
        }
      }
      
      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmedBuffer = buffer.trim();
        if (trimmedBuffer.startsWith('data: ')) {
          const data = trimmedBuffer.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content && parsed.type === "content") {
                yield { content: parsed.content, type: parsed.type, timestamp: parsed.timestamp };
              } else if (parsed.content) {
                yield { content: parsed.content };
              } else {
                yield parsed;
              }
            } catch (e) {
              console.warn('Failed to parse final buffer:', data, 'Error:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  const analyzeAddress = async function* (address: string): AsyncGenerator<StreamData> {
    const response = await authenticatedFetch(`/analyze/${address}`);

    if (!response.ok || !response.body) throw new Error('Failed to start address analysis');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
      const { done, value } = await reader.read();
      if (done) break;

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue; // Skip empty lines
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim();
            if (data === '[DONE]') return;
            if (!data) continue; // Skip empty data
            
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              console.warn('Failed to parse analysis data:', data, 'Error:', e);
              // Try to handle malformed JSON by attempting to fix common issues
              try {
                // Sometimes data might have trailing commas or incomplete objects
                const fixedData = data.replace(/,(\s*[}\]])/g, '$1').trim();
                if (fixedData.startsWith('{') && fixedData.endsWith('}')) {
                  const parsed = JSON.parse(fixedData);
                  yield parsed;
                }
              } catch (fixError) {
                console.warn('Could not fix malformed analysis JSON, skipping chunk');
                // Continue processing other chunks
              }
            }
          }
        }
      }
      
      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmedBuffer = buffer.trim();
        if (trimmedBuffer.startsWith('data: ')) {
          const data = trimmedBuffer.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              console.warn('Failed to parse final buffer:', data, 'Error:', e);
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

    if (addresses.length === 0) {
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
        let lastContentType = ""
        
        const systemPrompt = systemPrompts?.available_prompts?.default || "You are a helpful AI assistant specializing in blockchain security analysis."
        
        for await (const chunk of streamChat(message, systemPrompt)) {
          let content = ""
          let currentContentType = "text"
          
          // Handle different chunk formats
          if (typeof chunk === 'string') {
            content = chunk
          } else if (chunk.content) {
            content = chunk.content
            currentContentType = chunk.type || "content"
          } else if (chunk.delta?.content) {
            content = chunk.delta.content
            currentContentType = "delta"
          } else if (chunk.choices?.[0]?.delta?.content) {
            content = chunk.choices[0].delta.content
            currentContentType = "choices"
          } else if (chunk.status || chunk.message) {
            // Handle status messages - don't add to content buffer
            console.log('Stream status:', chunk.status || chunk.message)
            continue
          } else if (chunk.type === "done") {
            // Handle completion - break out of loop
            console.log('Stream completed:', chunk.message)
            break
          }
          
          if (content) {
            // For streaming content, simply accumulate the chunks
            // The content is already properly split by the server
            console.log('Adding content chunk:', JSON.stringify(content))
            contentBuffer.push(content)
            lastContentType = currentContentType
            
            // Build the current text by joining all content chunks
            const currentText = contentBuffer.join('')
            console.log('Current accumulated text:', JSON.stringify(currentText))
            
            // Update the message in real-time
            updateMessageStream(copilotMessageId, {
              text: currentText,
              isStreaming: true
            })
          }
        }

        // Final cleanup and formatting
        const finalContent = contentBuffer.join('').trim()
        
        updateMessageStream(copilotMessageId, {
          text: finalContent || "I've received your message. How can I help you with blockchain security analysis?",
          isStreaming: false
        })

      } catch (error) {
        console.error('Streaming error:', error)

        // Handle API key specific errors
        let errorMessage = "Sorry, I encountered an error processing your request. Please try again.";

        if (error instanceof Error) {
          if (error.message.includes('Invalid API key')) {
            errorMessage = "⚠️ **API Configuration Error**\n\nThe API key appears to be invalid or missing. Please check your configuration and try again.\n\n*If you're the developer, please verify the API key in `utils/apiConfig.ts`*";
          } else if (error.message.includes('unauthorized access')) {
            errorMessage = "🔒 **Authorization Error**\n\nYour API key may be expired or doesn't have the required permissions. Please check your API key status and try again.\n\n*Contact support if the issue persists.*";
          } else if (error.message.includes('Rate limit exceeded')) {
            errorMessage = "⏱️ **Rate Limit Exceeded**\n\nYou've reached the API rate limit. Please wait a moment before trying again.\n\n*Consider upgrading your plan for higher limits.*";
          } else if (error.message.includes('API Error:')) {
            errorMessage = `🚫 **API Error**\n\n${error.message}\n\nPlease check your connection and try again.`;
          }
        }

        updateMessageStream(copilotMessageId, {
          text: errorMessage,
          isStreaming: false
        })
      } finally {
        setIsTyping(false)
      }
    } else {
      // Handle addresses - go directly to analysis without chat response
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
      text: `**Analyzing Address**: \`${address}\`\n\n*Initializing security analysis...*`,
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
          let progressText = `## Security Analysis\n\n`
          progressText += `**Target Address**: \`${address}\`\n\n`
          progressText += `### Analysis Progress\n\n`
          
          // Progress bar
          const progressPercent = chunk.progress || 0
          const progressBars = Math.floor(progressPercent / 5)
          const progressBar = `${'█'.repeat(progressBars)}${'░'.repeat(20 - progressBars)}`
          progressText += `\`${progressBar}\` **${progressPercent}%**\n\n`
          
          // Analysis steps matching test outputs - detect chain type
          const isEthereumAddress = address.startsWith('0x') && address.length === 42
          
          const stepLabels: { [key: number]: string } = isEthereumAddress ? {
            // Ethereum steps based on output_eth.json
            1: "Fetching ETH balance",
            2: "Fetching transactions",
            3: "Fetching ERC20 transfers",
            4: "Fetching ERC721 (NFT) transfers",
            5: "Fetching additional data",
            6: "Analyzing token transfers",
            7: "Gathering additional data", 
            8: "Running multi-agent analysis",
            9: "Finalizing Daemon Risk Engine",
            12: "Analysis complete"
          } : {
            // Solana steps based on output_sol.json
            1: "Fetching address history",
            2: "Getting transaction signatures",
            3: "Analyzing token transfers",
            4: "Calculating wallet risk score",
            5: "Gathering additional data",
            6: "Running multi-agent analysis",
            7: "Finalizing Daemon Risk Engine",
            12: "Analysis complete"
          }
          
          Object.keys(stepLabels).forEach(stepNum => {
            const step = parseInt(stepNum)
            const label = stepLabels[step]
            
            if (analysisSteps[step]) {
              const stepData = analysisSteps[step]
              if (stepData.complete) {
                progressText += `\n[✓] **${label}** - Completed\n`
              } else if (step === chunk.step) {
                progressText += `\n[>] **${label}** - ${stepData.status}\n`
              } else {
                progressText += `\n[-] **${label}** - Pending\n`
              }
              
              // Show step data if available
              if (stepData.data) {
                const data = stepData.data
                if (data.transactions_count !== undefined) {
                  progressText += `  - **${data.transactions_count}** transactions found\n`
                }
                if (data.signatures_count !== undefined) {
                  progressText += `  - **${data.signatures_count}** signatures retrieved\n`
                }
                if (data.tokens_analyzed !== undefined) {
                  progressText += `  - **${data.tokens_analyzed}** tokens analyzed\n`
                }
                if (data.nfts_found !== undefined) {
                  progressText += `  - **${data.nfts_found}** NFTs found\n`
                }
                if (data.balance_changes_count !== undefined) {
                  progressText += `  - **${data.balance_changes_count}** balance changes detected\n`
                }
              }
            } else {
              progressText += `\n[-] **${label}** - Pending\n`
            }
          })
          
          progressText += `\n---\n\n`
          progressText += `**Current Status**: ${statusText}\n\n`
          progressText += `*Powered by Daemon Risk Engine*`
          
          updateMessageStream(analysisMessageId, {
            text: progressText,
            streamingProgress: chunk.progress,
            isStreaming: true
          })
        }
        
        if (chunk.analysis_result) {
          analysisResult = chunk
          
          // Show completion status
          const completionText = `## Analysis Complete\n\n**Address**: \`${address}\`\n\n**Status**: Security analysis completed successfully!\n\n*Generating detailed security report and Cyclops visualization...*`
          
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

      // Handle API key specific errors for address analysis
      let errorMessage = `## Analysis Failed\n\n**Address**: \`${address}\`\n\n**Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**Recommendation**: Please verify the address format and try again.\n\n*If the issue persists, the address may not be supported or the service may be temporarily unavailable.*`;

      if (error instanceof Error) {
        if (error.message.includes('Invalid API key')) {
          errorMessage = `## 🔍 Analysis Failed - API Configuration Error\n\n**Address**: \`${address}\`\n\n**Error**: Invalid API key configuration\n\n**Solution**: Please check the API key in the application configuration and try again.\n\n*Note: Contact support if you believe this is an error.*`;
        } else if (error.message.includes('unauthorized access')) {
          errorMessage = `## 🔍 Analysis Failed - Authorization Error\n\n**Address**: \`${address}\`\n\n**Error**: API key authorization failed\n\n**Solution**: Your API key may be expired or lacks required permissions. Please check your API key status.\n\n*Note: Upgrade your plan or contact support for assistance.*`;
        } else if (error.message.includes('Rate limit exceeded')) {
          errorMessage = `## 🔍 Analysis Failed - Rate Limited\n\n**Address**: \`${address}\`\n\n**Error**: Rate limit exceeded\n\n**Solution**: Please wait a moment before trying again. Rate limits help ensure fair usage for all users.\n\n*Note: Consider upgrading your plan for higher limits.*`;
        }
      }

      updateMessageStream(analysisMessageId, {
        text: errorMessage,
        isStreaming: false
      })
    }
  }

  const handleAnalyzeAddress = (address: string) => {
    // Set input value to the address for analysis
    setInputValue(`Analyze address: ${address}`)
    
    // Trigger analysis by calling handleSend after a short delay
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  const convertAnalysisToMarkdown = (address: string, result: any): string => {
    if (!result.analysis_result) {
      return `
<div class="analysis-incomplete">
  <div class="error-icon">X</div>
  <h2>Analysis Incomplete</h2>
  <div class="address-display">${address}</div>
  <p>Analysis completed but no detailed results available.</p>
</div>`
    }

    const { threat_analysis, detailed_data } = result.analysis_result
    const riskLevel = threat_analysis?.overall_risk_level || 'unknown'
    const riskScore = threat_analysis?.risk_score || 0
    const threats = threat_analysis?.potential_threats || []
    const riskColor = riskLevel === 'critical' ? 'critical' : 
                     riskLevel === 'high' ? 'high' : 
                     riskLevel === 'medium' ? 'medium' : 
                     riskLevel === 'low' ? 'low' : 
                     riskLevel === 'informational' ? 'informational' : 
                     riskLevel === 'no risk' ? 'no-risk' : 'unknown'
    
    let html = `
<div class="security-report">
  <!-- Report Header -->
  <div class="report-header">
    <div class="header-icon">Daemon Risk Engine</div>
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
      <h2>Risk Assessment</h2>
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
        <div class="threat-icon">!</div>
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
    <h2>Security Threats Identified</h2>
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
            <div class="evidence-icon">[INFO]</div>
            <span class="evidence-text">${evidenceCount} transaction(s) flagged as evidence</span>
          </div>` : ''}
          
          ${threat.recommended_actions ? `
          <div class="actions-section">
            <h4>Recommended Actions</h4>
            <div class="actions-content">
              ${Array.isArray(threat.recommended_actions) 
                ? `<ul class="actions-list">
              ${threat.recommended_actions.map((action: string) => `<li>${action}</li>`).join('')}
                   </ul>`
                : `<p class="action-text">${threat.recommended_actions}</p>`
              }
            </div>
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
    <div class="success-icon">OK</div>
    <h2>No Security Threats Detected</h2>
    <p>The analysis found no immediate security concerns with this address.</p>
  </div>`
    }

    // Modern Analytics Cards
    html += `
  <div class="analytics-section">
    <h2>Analysis Overview</h2>
    <div class="analytics-grid">`

    // Transaction Summary Card
    if (detailed_data?.transaction_summary) {
      const summary = detailed_data.transaction_summary
      html += `
      <div class="analytics-card">
        <div class="card-header">
          <div class="card-icon">TXN</div>
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
          <div class="card-icon">TOKENS</div>
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

    // Collapsible Transaction Details Section
    const chainType = threat_analysis?.metadata?.chain?.toLowerCase() || 'ethereum'
    
    // Handle different data structures for different chains
    let transactions = []
    let tokenTransactions = []
    
    if (chainType === 'solana') {
      // For Solana: check signatures and address_history
      transactions = result.raw_data?.address_history?.result || []
      const signatures = result.raw_data?.signatures?.result || []
      
      // If we have signatures but no detailed transactions, show signatures
      if (signatures.length > 0 && transactions.length === 0) {
        transactions = signatures.map((sig: any, idx: number) => ({
          signature: sig,
          slot: 'N/A',
          blockTime: 'N/A',
          confirmationStatus: 'N/A'
        }))
      }
      
      // For Solana token transfers, check token_meta or specific token transaction data
      tokenTransactions = result.raw_data?.token_meta || []
    } else {
      // For Ethereum: use existing structure
      transactions = result.raw_data?.address_history?.txlist?.result || result.raw_data?.address_history?.result || []
      tokenTransactions = result.raw_data?.erc20?.result || []
    }
    
    if (transactions.length > 0 || tokenTransactions.length > 0) {
      html += `
  <div class="transaction-section">
    <div class="section-header">
      <div class="section-icon">TXN</div>
      <h3>Transaction Details</h3>
    </div>
    <div class="transaction-content">
      
      ${transactions.length > 0 ? `
      <div class="transaction-group">
        <h4>${chainType === 'solana' ? 'Solana Transactions' : 'Regular Transactions'} (${transactions.length})</h4>
        <div class="transaction-carousel">
          <div class="transaction-list">
            ${transactions.map((tx: any, idx: number) => {
              if (chainType === 'solana') {
                return `
                  <div class="transaction-item">
                    <div class="tx-header">
                      <span class="tx-index">#${idx + 1}</span>
                      <span class="tx-status ${tx.confirmationStatus === 'finalized' ? 'success' : 'pending'}">
                        ${tx.confirmationStatus || 'UNKNOWN'}
                      </span>
                    </div>
                    <div class="tx-details">
                      <div class="tx-row">
                        <span class="tx-label">Signature:</span>
                        <code class="tx-value">${tx.signature || tx}</code>
                      </div>
                      ${tx.slot && tx.slot !== 'N/A' ? `
                      <div class="tx-row">
                        <span class="tx-label">Slot:</span>
                        <span class="tx-value">${tx.slot}</span>
                      </div>` : ''}
                      ${tx.blockTime && tx.blockTime !== 'N/A' ? `
                      <div class="tx-row">
                        <span class="tx-label">Block Time:</span>
                        <span class="tx-value">${new Date(tx.blockTime * 1000).toLocaleString()}</span>
                      </div>` : ''}
                      ${tx.fee ? `
                      <div class="tx-row">
                        <span class="tx-label">Fee:</span>
                        <span class="tx-value">${tx.fee / 1e9} SOL</span>
                      </div>` : ''}
                      ${tx.preBalances && tx.postBalances ? `
                      <div class="tx-row">
                        <span class="tx-label">Balance Change:</span>
                        <span class="tx-value">${((tx.postBalances[0] || 0) - (tx.preBalances[0] || 0)) / 1e9} SOL</span>
                      </div>` : ''}
                    </div>
                  </div>`
              } else {
                return `
                  <div class="transaction-item">
                    <div class="tx-header">
                      <span class="tx-index">#${idx + 1}</span>
                      <span class="tx-status ${tx.isError === '0' ? 'success' : 'error'}">
                        ${tx.isError === '0' ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <div class="tx-details">
                      <div class="tx-row">
                        <span class="tx-label">Hash:</span>
                        <code class="tx-value">${tx.hash || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Block:</span>
                        <span class="tx-value">${tx.blockNumber || 'N/A'}</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">From:</span>
                        <code class="tx-value">${tx.from || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">To:</span>
                        <code class="tx-value">${tx.to || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Value:</span>
                        <span class="tx-value">${tx.value ? parseFloat(tx.value) / 1e18 : 0} ETH</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Gas Used:</span>
                        <span class="tx-value">${tx.gasUsed || 'N/A'}</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Gas Price:</span>
                        <span class="tx-value">${tx.gasPrice ? parseFloat(tx.gasPrice) / 1e9 : 0} Gwei</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Timestamp:</span>
                        <span class="tx-value">${tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toLocaleString() : 'N/A'}</span>
                      </div>
                      ${tx.functionName ? `
                      <div class="tx-row">
                        <span class="tx-label">Function:</span>
                        <span class="tx-value">${tx.functionName}</span>
                      </div>` : ''}
                      ${tx.input && tx.input !== '0x' ? `
                      <div class="tx-row">
                        <span class="tx-label">Input Data:</span>
                        <code class="tx-value tx-input">${tx.input}</code>
                      </div>` : ''}
                    </div>
                  </div>`
              }
            }).join('')}
          </div>
        </div>
      </div>` : ''}
      
      ${tokenTransactions.length > 0 ? `
      <div class="transaction-group">
        <h4>${chainType === 'solana' ? 'SPL Token Transfers' : 'ERC20 Token Transfers'} (${tokenTransactions.length})</h4>
        <div class="transaction-carousel">
          <div class="transaction-list">
            ${tokenTransactions.map((tx: any, idx: number) => {
              if (chainType === 'solana') {
                return `
                  <div class="transaction-item">
                    <div class="tx-header">
                      <span class="tx-index">#${idx + 1}</span>
                      <span class="token-badge">${tx.symbol || tx.tokenSymbol || 'TOKEN'}</span>
                    </div>
                    <div class="tx-details">
                      <div class="tx-row">
                        <span class="tx-label">Signature:</span>
                        <code class="tx-value">${tx.signature || tx.hash || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Token:</span>
                        <span class="tx-value">${tx.name || tx.tokenName || 'Unknown'} (${tx.symbol || tx.tokenSymbol || 'TOKEN'})</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Mint:</span>
                        <code class="tx-value">${tx.mint || tx.contractAddress || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Amount:</span>
                        <span class="tx-value">${tx.amount || tx.value || 0} ${tx.symbol || tx.tokenSymbol || 'TOKEN'}</span>
                      </div>
                      ${tx.blockTime ? `
                      <div class="tx-row">
                        <span class="tx-label">Timestamp:</span>
                        <span class="tx-value">${new Date(tx.blockTime * 1000).toLocaleString()}</span>
                      </div>` : ''}
                    </div>
                  </div>`
              } else {
                return `
                  <div class="transaction-item">
                    <div class="tx-header">
                      <span class="tx-index">#${idx + 1}</span>
                      <span class="token-badge">${tx.tokenSymbol || 'TOKEN'}</span>
                    </div>
                    <div class="tx-details">
                      <div class="tx-row">
                        <span class="tx-label">Hash:</span>
                        <code class="tx-value">${tx.hash || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Token:</span>
                        <span class="tx-value">${tx.tokenName || 'Unknown'} (${tx.tokenSymbol || 'TOKEN'})</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">From:</span>
                        <code class="tx-value">${tx.from || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">To:</span>
                        <code class="tx-value">${tx.to || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Value:</span>
                        <span class="tx-value">${tx.value && tx.tokenDecimal ? parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal)) : tx.value || 0} ${tx.tokenSymbol || 'TOKEN'}</span>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Contract:</span>
                        <code class="tx-value">${tx.contractAddress || 'N/A'}</code>
                      </div>
                      <div class="tx-row">
                        <span class="tx-label">Timestamp:</span>
                        <span class="tx-value">${tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>`
              }
            }).join('')}
          </div>
        </div>
      </div>` : ''}
    </div>
  </div>`
    }

    // Risk Factors Section
    if (threat_analysis?.risk_factors && threat_analysis.risk_factors.length > 0) {
      html += `
  <div class="risk-factors-section">
    <div class="section-header">
      <div class="section-icon">FACTORS</div>
      <h3>Risk Factors Identified</h3>
    </div>
    <div class="factors-grid">
      ${threat_analysis.risk_factors.map((factor: string) => `
        <div class="factor-item">
          <div class="factor-icon">!</div>
          <span class="factor-text">${factor.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  </div>`
    }

    // Tags Section  
    if (threat_analysis?.tags && threat_analysis.tags.length > 0) {
      html += `
  <div class="tags-section">
    <div class="section-header">
      <div class="section-icon">TAGS</div>
      <h3>Classification Tags</h3>
    </div>
    <div class="tags-container">
      ${threat_analysis.tags.map((tag: string) => `
        <span class="tag-badge critical">
          ${tag.replace(/_/g, ' ')}
        </span>
      `).join('')}
    </div>
  </div>`
    }

    // IOC (Indicators of Compromise) Section
    if (threat_analysis?.ioc) {
      const ioc = threat_analysis.ioc
      const hasIOCData = (ioc.addresses && ioc.addresses.length > 0) || 
                        (ioc.transaction_signatures && ioc.transaction_signatures.length > 0) ||
                        (ioc.suspicious_mints && ioc.suspicious_mints.length > 0) ||
                        (ioc.related_programs && ioc.related_programs.length > 0)
      
      if (hasIOCData) {
        html += `
  <div class="ioc-section">
    <div class="section-header">
      <div class="section-icon">IOC</div>
      <h3>Indicators of Compromise</h3>
    </div>
    <div class="ioc-grid">`
        
        if (ioc.addresses && ioc.addresses.length > 0) {
          html += `
      <div class="ioc-card">
        <h4>Related Addresses</h4>
        <div class="ioc-list">
          ${ioc.addresses.map((addr: string) => `<code class="ioc-item">${addr}</code>`).join('')}
        </div>
      </div>`
        }
        
        if (ioc.transaction_signatures && ioc.transaction_signatures.length > 0) {
          html += `
      <div class="ioc-card">
        <h4>Transaction Signatures</h4>
        <div class="ioc-list">
          ${ioc.transaction_signatures.map((sig: string) => `<code class="ioc-item">${sig}</code>`).join('')}
        </div>
      </div>`
        }
        
        if (ioc.suspicious_mints && ioc.suspicious_mints.length > 0) {
          html += `
      <div class="ioc-card">
        <h4>Suspicious Mints</h4>
        <div class="ioc-list">
          ${ioc.suspicious_mints.map((mint: string) => `<code class="ioc-item">${mint}</code>`).join('')}
        </div>
      </div>`
        }
        
        if (ioc.related_programs && ioc.related_programs.length > 0) {
          html += `
      <div class="ioc-card">
        <h4>Related Programs</h4>
        <div class="ioc-list">
          ${ioc.related_programs.map((program: string) => `<code class="ioc-item">${program}</code>`).join('')}
        </div>
      </div>`
        }
        
        html += `
    </div>
  </div>`
      }
    }

    // Graph Analysis Section
    if (detailed_data?.address_graph) {
      const graph = detailed_data.address_graph
      html += `
  <div class="graph-analysis-section">
    <div class="section-header">
      <div class="section-icon">GRAPH</div>
      <h3>Network Analysis</h3>
    </div>
    <div class="graph-content">
      <div class="graph-metrics">
        <div class="graph-score">
          <span class="score-label">Graph Risk Level</span>
          <span class="score-value ${graph.graph_risk_level || 'unknown'}">${(graph.graph_risk_level || 'unknown').toUpperCase()}</span>
        </div>
        <div class="graph-stats">
          <div class="stat-item">
            <span class="stat-value">${graph.graph_metrics?.nodes_count || 0}</span>
            <span class="stat-label">Nodes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${graph.graph_metrics?.edges_count || 0}</span>
            <span class="stat-label">Edges</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${graph.graph_metrics?.density || 0}</span>
            <span class="stat-label">Density</span>
          </div>
        </div>
      </div>
      ${graph.risk_indicators && graph.risk_indicators.length > 0 ? `
      <div class="risk-indicators">
        <h4>Risk Indicators</h4>
        <div class="indicators-list">
          ${graph.risk_indicators.map((indicator: string) => `
            <div class="indicator-item">
              <span class="indicator-icon">⚠</span>
              <span class="indicator-text">${indicator}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
      ${graph.daemon_security_findings && graph.daemon_security_findings.length > 0 ? `
      <div class="security-findings">
        <h4>Security Findings</h4>
        <div class="findings-list">
          ${graph.daemon_security_findings.map((finding: string) => `
            <div class="finding-item">
              <span class="finding-icon">🔍</span>
              <span class="finding-text">${finding}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`
    }

    // Wallet Information Section
    if (detailed_data?.wallet_info) {
      const wallet = detailed_data.wallet_info
      html += `
  <div class="wallet-info-section">
    <div class="section-header">
      <div class="section-icon">WALLET</div>
      <h3>Wallet Information</h3>
    </div>
    <div class="wallet-details">
      <div class="wallet-item">
        <span class="wallet-label">Address:</span>
        <code class="wallet-value">${wallet.address}</code>
      </div>
      <div class="wallet-item">
        <span class="wallet-label">Chain:</span>
        <span class="wallet-value">${wallet.chain}</span>
      </div>
      <div class="wallet-item">
        <span class="wallet-label">Owner:</span>
        <code class="wallet-value">${wallet.owner}</code>
      </div>
      ${wallet.risk_score !== null && wallet.risk_score !== undefined ? `
      <div class="wallet-item">
        <span class="wallet-label">Wallet Risk Score:</span>
        <span class="wallet-value">${wallet.risk_score}</span>
      </div>` : ''}
    </div>
  </div>`
    }

    // Additional Analysis Scores
    if (detailed_data?.anomaly_score !== undefined || detailed_data?.exploit_score !== undefined) {
      html += `
  <div class="additional-scores-section">
    <div class="section-header">
      <div class="section-icon">SCORES</div>
      <h3>Additional Risk Scores</h3>
    </div>
    <div class="scores-grid">
      ${detailed_data.anomaly_score !== undefined ? `
      <div class="score-card">
        <div class="score-header">Anomaly Score</div>
        <div class="score-display">${detailed_data.anomaly_score}</div>
      </div>` : ''}
      ${detailed_data.exploit_score !== undefined ? `
      <div class="score-card">
        <div class="score-header">Exploit Score</div>
        <div class="score-display">${detailed_data.exploit_score}</div>
      </div>` : ''}
    </div>
  </div>`
    }

    // Data Sources
    if (threat_analysis?.metadata?.data_sources && threat_analysis.metadata.data_sources.length > 0) {
      html += `
  <div class="data-sources-section">
    <div class="section-header">
      <div class="section-icon">SOURCES</div>
      <h3>Data Sources</h3>
    </div>
    <div class="sources-list">
      ${threat_analysis.metadata.data_sources.map((source: string) => `
        <div class="source-item">
          <span class="source-name">${source}</span>
        </div>
      `).join('')}
    </div>
  </div>`
    }

    // Additional Notes
    if (threat_analysis?.additional_notes) {
      html += `
  <div class="notes-section">
    <div class="notes-header">
      <div class="notes-icon">NOTES</div>
      <h3>Additional Analysis Notes</h3>
    </div>
    <div class="notes-content" style="text-align: justify;">${threat_analysis.additional_notes}</div>
  </div>`
    }

    // Footer
    html += `
  <div class="fund-flow-section">
    <div class="fund-flow-header">
      <h3>Cyclops - FundFlow Analysis</h3>
    </div>
    <div class="fund-flow-content">
      <p>Visualize the complete transaction flow network in an interactive 3D environment. Explore fund movements, token transfers, and address relationships.</p>
      <button class="fund-flow-btn" id="cyclops-btn-${address}" onclick="window.triggerFundFlow && window.triggerFundFlow('${address}')">
        <span class="btn-icon">🚀</span>
        <span class="btn-text">Launch Cyclops Visualization</span>
        <span class="btn-loader" style="display: none;">
          <div class="spinner"></div>
          Loading...
        </span>
      </button>
    </div>
  </div>
  
  <div class="report-footer">
    <div class="footer-info">
      <div class="engine-info">
        <strong>Analysis Engine:</strong> ${threat_analysis?.engine || 'Daemon Risk Engine'}
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

  const getRiskLevelIndicator = (level: string): string => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'CRITICAL'
      case 'high': return 'HIGH'
      case 'medium': return 'MEDIUM'
      case 'low': return 'LOW'
      case 'informational': return 'INFO'
      default: return 'UNKNOWN'
    }
  }

  const detectAndConvertLists = (text: string): string => {
    if (!text) return ''
    
    console.log('Original text:', JSON.stringify(text))
    
    // Normalize line breaks
    let processedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    
    // Find list patterns and convert them to proper HTML if needed
    const lines = processedText.split('\n')
    const result: string[] = []
    let inList = false
    let listType = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      // Check if this is a list item
      const isUnorderedList = /^[-*+]\s(.+)/.test(trimmed)
      const isOrderedList = /^\d+\.\s(.+)/.test(trimmed)
      
      if (isUnorderedList || isOrderedList) {
        const currentListType = isUnorderedList ? 'ul' : 'ol'
        
        // Start new list or continue existing one
        if (!inList) {
          result.push('') // Add empty line before list
          inList = true
          listType = currentListType
        }
        
        // Extract the content after the marker
        const content = isUnorderedList 
          ? trimmed.replace(/^[-*+]\s/, '')
          : trimmed.replace(/^\d+\.\s/, '')
        
        result.push(`${isUnorderedList ? '-' : (i + 1) + '.'} ${content}`)
      } else {
        // Not a list item
        if (inList && trimmed !== '') {
          result.push('') // Add empty line after list
          inList = false
          listType = ''
        }
        result.push(line)
      }
    }
    
    const finalText = result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    console.log('Processed text:', JSON.stringify(finalText))
    
    return finalText
  }

  const reconstructStreamingContent = (contentBuffer: string[]): string => {
    if (contentBuffer.length === 0) return ""
    
    // Join all content chunks with intelligent spacing
    let fullContent = ""
    
    for (let i = 0; i < contentBuffer.length; i++) {
      const currentChunk = contentBuffer[i]
      const prevChunk = i > 0 ? contentBuffer[i - 1] : ""
      const nextChunk = i < contentBuffer.length - 1 ? contentBuffer[i + 1] : ""
      
      // Add the current chunk
      fullContent += currentChunk
      
      // Add spacing logic for next chunk if it exists
      if (nextChunk) {
        const currentEndsWithNewline = currentChunk.endsWith('\n')
        const nextStartsWithNewline = nextChunk.startsWith('\n')
        const nextIsListItem = nextChunk.match(/^[\-\*\+]\s/) || nextChunk.match(/^\d+\.\s/)
        const nextIsHeader = nextChunk.match(/^#{1,6}\s/)
        const currentIsHeader = currentChunk.match(/#{1,6}\s[^\n]*$/)
        
        // Don't add extra spacing if chunks already have proper newlines
        if (!currentEndsWithNewline && !nextStartsWithNewline) {
          // Add spacing for different content types
          if (nextIsHeader || nextIsListItem || currentIsHeader) {
            fullContent += '\n\n'
          } else if (currentChunk.length > 0 && nextChunk.length > 0 && 
                    !currentChunk.endsWith(' ') && !nextChunk.startsWith(' ')) {
            // Add space between words if needed
            fullContent += ' '
          }
        }
      }
    }
    
    // Clean up and format the final content
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
    
    // Check if text contains table syntax - if so, minimal preprocessing
    const hasTable = text.includes('|') && text.includes('---')
    
    if (hasTable) {
      console.log('Table detected, using minimal preprocessing')
      // Minimal preprocessing for tables to preserve structure
      return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
    }
    
    // Enhanced preprocessing for better markdown parsing (non-table content)
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

  // Function to toggle transaction visibility
  const toggleTransactions = (id: string) => {
    const content = document.getElementById(id);
    const button = content?.previousElementSibling?.querySelector('.collapse-button');
    const text = button?.querySelector('.collapse-text');
    const arrow = button?.querySelector('.collapse-arrow');
    
    if (content && text && arrow) {
      if (content.style.display === 'none') {
        content.style.display = 'block';
        text.textContent = 'Hide Transactions';
        arrow.textContent = '▲';
      } else {
        content.style.display = 'none';
        text.textContent = 'Show Transactions';
        arrow.textContent = '▼';
      }
    }
  }

  // Make the function globally accessible
  useEffect(() => {
    (window as any).toggleTransactions = toggleTransactions;
    return () => {
      delete (window as any).toggleTransactions;
    };
  }, []);

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
    p: ({ children }) => <p className="my-0 leading-relaxed text-sm break-words whitespace-pre-wrap">{children}</p>,
    
    // Improved list handling similar to ChatBox
    ul: ({ children }) => (
      <ul className="list-none my-0 pl-3 text-white/90 space-y-0">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-0 pl-3 text-white/90 space-y-0">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-slate-200 leading-snug text-sm my-0 relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-cyan-400 before:font-bold before:text-sm before:leading-snug">
        {children}
      </li>
    ),
    
    strong: ({ children }) => <strong className="font-semibold text-cyan-300 text-sm">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-300 text-sm">{children}</em>,
    
    // Improved heading spacing
    h1: ({ children }) => (
      <h1 className={`text-lg font-bold mb-1 mt-1 ${isDark ? 'text-white' : 'text-black'} border-b border-slate-600 pb-2`}>
        {children}
      </h1>
    ),
    h2: ({ children }) => <h2 className="text-base font-semibold mb-1 mt-1 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold mb-0.5 mt-0.5 text-slate-200">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-semibold mb-0.5 mt-0.5 text-slate-300">{children}</h4>,
    
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-cyan-400 pl-4 py-1 my-1 bg-slate-800/30 rounded-r text-slate-300 italic text-sm">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline decoration-dotted underline-offset-2 transition-colors text-sm font-medium"
      >
        {children}
      </a>
    ),
    hr: () => <hr className="border-slate-600 my-4" />,
    table: ({ children }) => {
      console.log('Table component rendered!')
      return (
        <div className="overflow-x-auto my-4 rounded-lg border border-slate-600">
          <table className="min-w-full border-collapse bg-slate-800/50 text-sm">
          {children}
        </table>
      </div>
      )
    },
    thead: ({ children }) => {
      console.log('Thead component rendered!')
      return <thead className="bg-slate-700">{children}</thead>
    },
    tbody: ({ children }) => <tbody className="bg-slate-800/30">{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">{children}</tr>,
    th: ({ children }) => (
      <th className="border-r border-slate-600 px-4 py-3 text-left font-semibold text-cyan-300 text-sm bg-slate-700/80">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-r border-slate-600 px-4 py-3 text-slate-200 text-sm last:border-r-0 align-top">
        {children}
      </td>
    )
  }

  return (
    <div className={`h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col relative bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-800 to-slate-900 text-slate-100' : 'from-slate-50 via-slate-100 to-slate-50 text-slate-900'} p-4`}>
      {/* Main chat container */}
      <div ref={chatWindowRef} className={`relative rounded-xl backdrop-blur-md flex-1 flex flex-col overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900/60 border border-slate-700/50 shadow-black/40' : 'bg-white/80 border border-slate-300/60 shadow-black/10'}`}>
        {/* Header */}
        <div className={`bg-gradient-to-r backdrop-blur-sm border-b ${isDark ? 'from-slate-800/80 to-slate-700/80 border-slate-600/50' : 'from-slate-100/80 to-slate-50/80 border-slate-200/60'}`}>
          <h1 className={`plus-jakarta text-2xl font-bold px-6 py-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <img src="/public/favicon.svg" alt="Chat Icon" className="w-8 h-8" />
            Chat
            <div className="ml-auto">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </h1>
        </div>

        {/* Chat messages */}
        <div className={`flex-1 p-6 overflow-y-auto space-y-6 pb-32 bg-gradient-to-b ${isDark ? 'from-transparent to-slate-900/20' : 'from-transparent to-slate-100/40'}`}>
          {messages.map((message) => (
              <div
                key={message.id}
              className={`flex flex-col ${
                message.sender === "user" ? "items-end" : "items-start"
                  } gap-2`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.sender === "copilot" ? (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? "bg-gradient-to-br from-slate-700 to-slate-600" : "bg-gradient-to-br from-slate-200 to-slate-100"
                    }`}>
                      <div className={`w-5 h-5 rounded ${isDark ? 'bg-cyan-500' : 'bg-blue-500'}`}></div>
                    </div>
                  ) : (
                    <UserAvatar profileImage={profileImage} />
                  )}
                </div>

                {/* Message bubble under avatar with tail */}
              <div className={`relative max-w-[85%] rounded-2xl px-5 py-4 ${
                message.sender === "user"
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : isDark
                    ? "bg-gradient-to-br from-slate-800 to-slate-700 text-slate-100 shadow-lg shadow-black/25 border border-slate-600/30"
                    : "bg-white text-slate-900 shadow-lg shadow-black/10 border border-slate-300/60"
                  }`}>
                  {/* Tail */}
                  <span
                    className={`absolute -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent ${
                      message.sender === 'user'
                        ? 'right-6 border-b-cyan-500'
                        : isDark
                          ? 'left-6 border-b-slate-800'
                          : 'left-6 border-b-white'
                    }`}
                  />
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
                                remarkPlugins={[remarkGfm]}
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
                        <div className={`flex justify-between text-xs opacity-75 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          <span>Analyzing...</span>
                          <span>{message.streamingProgress}%</span>
                        </div>
                        <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-slate-600/50' : 'bg-slate-300/60'}`}>
                          <div
                            className={`bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out ${isDark ? 'shadow-sm shadow-cyan-400/50' : ''}`}
                            style={{ width: `${message.streamingProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                <div className="w-5 h-5 rounded bg-cyan-500"></div>
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

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent backdrop-blur-sm">
        <div
          className={`w-full mx-auto transition-all duration-300 ${
            isMobile 
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
                placeholder="Ask Chat anything or paste an address to analyze..."
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

              {/* Enhanced styles */}
              <style>{`
                /* Custom scrollbar */
                div::-webkit-scrollbar {
                  width: 6px;
                }
                div::-webkit-scrollbar-track {
                  background: rgba(51, 65, 85, 0.3);
                  border-radius: 3px;
                }
                div::-webkit-scrollbar-thumb {
                  background: rgba(100, 116, 139, 0.5);
                  border-radius: 3px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: rgba(100, 116, 139, 0.7);
                }

                /* Enhanced List Styling - Similar to ChatBox */
                .modern-analysis-container ul,
                .modern-analysis-container ol {
                  margin: 0;
                  padding-left: 16px;
                  list-style: none;
                }
                
                .modern-analysis-container ul li {
                  position: relative;
                  margin: 0;
                  padding-left: 16px;
                  list-style: none;
                  line-height: 1.4;
                  display: list-item;
                }
                
                .modern-analysis-container ul li::before {
                  content: "•";
                  position: absolute;
                  left: 0;
                  color: #22d3ee;
          font-weight: semibold;
                  font-size: 14px;
                  line-height: 1.4;
                }
                
                .modern-analysis-container ol {
                  list-style: decimal;
                  list-style-position: inside;
                  padding-left: 16px;
                }
                
                .modern-analysis-container ol li {
                  position: relative;
                  margin: 0;
                  padding-left: 8px;
                  display: list-item;
                  line-height: 1.4;
                }
                
                .modern-analysis-container ol li::marker {
                  color: #22d3ee;
          font-weight: semibold;
                }

                /* Chat message specific list styling - Match ChatBox approach */
                .max-w-none ul,
                .markdown-content ul {
                  margin: 0 !important;
                  padding-left: 16px !important;
                  list-style: none !important;
                  display: block !important;
                }
                
                .max-w-none ul li,
                .markdown-content ul li {
                  position: relative !important;
                  margin: 0 !important;
                  padding-left: 16px !important;
                  list-style: none !important;
                  display: list-item !important;
                  line-height: 1.4 !important;
                }
                
                .max-w-none ul li::before,
                .markdown-content ul li::before {
                  content: "•" !important;
                  position: absolute !important;
                  left: 0 !important;
                  color: #22d3ee !important;
          font-weight: 400 !important;
                  font-size: 14px !important;
                  line-height: 1.4 !important;
                }
                
                .max-w-none ol,
                .markdown-content ol {
                  list-style: decimal !important;
                  list-style-position: inside !important;
                  margin: 0 !important;
                  padding-left: 16px !important;
                  display: block !important;
                }
                
                .max-w-none ol li,
                .markdown-content ol li {
                  position: relative !important;
                  margin: 0 !important;
                  padding-left: 8px !important;
                  display: list-item !important;
                  line-height: 1.4 !important;
                }
                
                .max-w-none ol li::marker,
                .markdown-content ol li::marker {
                  color: #22d3ee !important;
          font-weight: semibold !important;
                }

                /* Force proper list display */
                .markdown-content ul,
                .markdown-content ol {
                  display: block !important;
                }
                
                .markdown-content li {
                  display: list-item !important;
                }

                /* Improved spacing for paragraphs in lists */
                .markdown-content li p,
                .max-w-none li p {
                  margin: 0 !important;
                  display: inline !important;
                }

                /* Modern Security Report Styles */
                .security-report {
                  max-width: 100%;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  color: #e2e8f0;
                  line-height: 1.6;
                }

                /* Report Header */
                .report-header {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  border: 1px solid #475569;
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 24px;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

                .header-icon {
                  font-size: 32px;
                  margin-bottom: 12px;
                }

                .report-header h1 {
                  font-size: 24px;
                  font-weight: 700;
                  color: #ffffff;
                  margin: 0 0 16px 0;
                }

                .report-meta {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 16px;
                }

                .meta-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                }

                .meta-label {
                  font-size: 11px;
                  font-weight: 600;
                  color: #94a3b8;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }

                .meta-value {
                  font-size: 13px;
                  color: #e2e8f0;
                  font-weight: 500;
                }

                .address-code {
                  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
                  color: #22d3ee;
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-family: 'JetBrains Mono', 'Fira Code', monospace;
                  font-size: 12px;
                  border: 1px solid #6b7280;
                  word-break: break-all;
                }

                /* Risk Assessment */
                .risk-assessment {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 24px;
                  border-width: 2px;
                  border-style: solid;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

        .risk-assessment.critical {
          border-color: #dc2626;
          box-shadow: 0 8px 32px rgba(220, 38, 38, 0.3);
                }

                .risk-assessment.high {
                  border-color: #ef4444;
                  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2);
                }

                .risk-assessment.medium {
                  border-color: #f59e0b;
                  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.2);
                }

                .risk-assessment.low {
                  border-color: #10b981;
                  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.2);
                }

        .risk-assessment.informational {
          border-color: #3b82f6;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
        }

        .risk-assessment.no-risk {
          border-color: #6b7280;
          box-shadow: 0 8px 32px rgba(107, 114, 128, 0.2);
        }

        .risk-assessment.unknown {
          border-color: #9ca3af;
          box-shadow: 0 8px 32px rgba(156, 163, 175, 0.2);
                }

                .risk-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                }

                .risk-header h2 {
                  font-size: 20px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0;
                }

                .risk-badge {
                  padding: 6px 16px;
                  border-radius: 20px;
                  font-size: 11px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }

        .risk-badge.critical {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          color: #ffffff;
                }

                .risk-badge.high {
                  background: linear-gradient(135deg, #dc2626, #ef4444);
                  color: #ffffff;
                }

                .risk-badge.medium {
                  background: linear-gradient(135deg, #d97706, #f59e0b);
                  color: #ffffff;
                }

                .risk-badge.low {
                  background: linear-gradient(135deg, #059669, #10b981);
                  color: #ffffff;
                }

        .risk-badge.informational {
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: #ffffff;
        }

        .risk-badge.no-risk {
          background: linear-gradient(135deg, #374151, #6b7280);
          color: #ffffff;
        }

        .risk-badge.unknown {
          background: linear-gradient(135deg, #6b7280, #9ca3af);
                  color: #ffffff;
                }

                .risk-metrics {
                  display: grid;
                  grid-template-columns: 2fr 1fr;
                  gap: 24px;
                  align-items: center;
                }

                .risk-score-container {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }

                .risk-score-label {
                  font-size: 12px;
                  color: #94a3b8;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }

                .risk-score-display {
                  display: flex;
                  align-items: baseline;
                  gap: 4px;
                }

                .score-number {
                  font-size: 36px;
                  font-weight: 800;
                  color: #ffffff;
                }

                .score-max {
                  font-size: 18px;
                  color: #94a3b8;
                  font-weight: 500;
                }

                .risk-progress {
                  width: 100%;
                }

                .progress-bar {
                  width: 100%;
                  height: 8px;
                  background: #374151;
                  border-radius: 4px;
                  overflow: hidden;
                }

                .progress-fill {
                  height: 100%;
                  border-radius: 4px;
                  transition: width 1s ease-in-out;
                }

        .progress-fill.critical {
          background: linear-gradient(90deg, #b91c1c, #dc2626);
                }

                .progress-fill.high {
                  background: linear-gradient(90deg, #dc2626, #ef4444);
                }

                .progress-fill.medium {
                  background: linear-gradient(90deg, #d97706, #f59e0b);
                }

                .progress-fill.low {
                  background: linear-gradient(90deg, #059669, #10b981);
                }

        .progress-fill.informational {
          background: linear-gradient(90deg, #1d4ed8, #3b82f6);
        }

        .progress-fill.no-risk {
          background: linear-gradient(90deg, #374151, #6b7280);
        }

        .progress-fill.unknown {
          background: linear-gradient(90deg, #6b7280, #9ca3af);
                }

                .threat-count {
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  padding: 20px;
                  background: rgba(30, 41, 59, 0.5);
                  border-radius: 12px;
                  border: 1px solid #475569;
                }

                .threat-icon {
                  font-size: 24px;
                }

                .threat-number {
                  font-size: 28px;
                  font-weight: 700;
                  color: #ffffff;
                }

                .threat-label {
                  font-size: 12px;
                  color: #94a3b8;
                  text-transform: uppercase;
                  font-weight: 600;
                }

                /* Threats Section */
                .threats-section {
                  margin-bottom: 24px;
                }

                .threats-section h2 {
                  font-size: 20px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0 0 16px 0;
                }

                .threats-grid {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                }

                .threat-card {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  border: 1px solid #ef4444;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.1);
                }

                .threat-header {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  padding: 16px 20px;
                  background: rgba(239, 68, 68, 0.1);
                  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
                }

                .threat-index {
                  background: #ef4444;
                  color: #ffffff;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: 700;
                }

                .threat-title {
                  flex-grow: 1;
                  font-size: 16px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0;
                }

                .confidence-badge {
                  padding: 4px 12px;
                  border-radius: 12px;
                  font-size: 10px;
                  font-weight: 700;
                  text-transform: uppercase;
                }

                .confidence-badge.high {
                  background: #dc2626;
                  color: #ffffff;
                }

                .confidence-badge.medium {
                  background: #f59e0b;
                  color: #ffffff;
                }

                .confidence-badge.low {
                  background: #10b981;
                  color: #ffffff;
                }

                .threat-content {
                  padding: 20px;
                }

                .threat-description {
                  font-size: 14px;
                  color: #e2e8f0;
                  margin-bottom: 16px;
                  line-height: 1.6;
                }

                .evidence-section {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 12px 16px;
                  background: rgba(30, 41, 59, 0.5);
                  border-radius: 8px;
                  margin-bottom: 16px;
                  border: 1px solid #475569;
                }

                .evidence-icon {
                  font-size: 16px;
                }

                .evidence-text {
                  font-size: 12px;
                  color: #94a3b8;
                }

                .actions-section h4 {
                  font-size: 14px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0 0 12px 0;
                }

                .actions-list {
                  margin: 0;
                  padding-left: 16px;
                  list-style-type: none;
                }

                .actions-list li {
                  position: relative;
                  font-size: 13px;
                  color: #cbd5e1;
                  margin-bottom: 8px;
                  padding-left: 16px;
                  line-height: 1.4;
                }

                .actions-list li::before {
                  content: "→";
                  position: absolute;
                  left: 0;
                  color: #22d3ee;
          font-weight: 300;
                }

                /* No Threats Section */
                .no-threats-section {
                  text-align: center;
                  padding: 40px;
                  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
                  border: 1px solid #10b981;
                  border-radius: 16px;
                  margin-bottom: 24px;
                }

                .success-icon {
                  font-size: 48px;
                  margin-bottom: 16px;
                }

                .no-threats-section h2 {
                  font-size: 20px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0 0 8px 0;
                }

                .no-threats-section p {
                  font-size: 14px;
                  color: #a7f3d0;
                  margin: 0;
                }

                /* Analytics Section */
                .analytics-section {
                  margin-bottom: 24px;
                }

                .analytics-section h2 {
                  font-size: 20px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0 0 16px 0;
                }

                .analytics-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                  gap: 16px;
                }

                .analytics-card {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  border: 1px solid #475569;
                  border-radius: 12px;
                  padding: 20px;
                  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                }

                .card-header {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 16px;
                }

                .card-icon {
                  font-size: 20px;
                }

                .card-header h3 {
                  font-size: 16px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0;
                }

                .metrics-list {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }

                .metric-item {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 8px 0;
                }

                .metric-value {
                  font-size: 18px;
                  font-weight: 700;
                  color: #22d3ee;
                }

                .metric-label {
                  font-size: 12px;
                  color: #94a3b8;
                  font-weight: 500;
                }

                /* Notes Section */
                .notes-section {
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                  border: 1px solid #475569;
                  border-radius: 12px;
                  padding: 20px;
                  margin-bottom: 24px;
                }

                .notes-header {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 12px;
                }

                .notes-icon {
                  font-size: 20px;
                }

                .notes-header h3 {
                  font-size: 16px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0;
                }

                .notes-content {
                  font-size: 14px;
                  color: #cbd5e1;
                  line-height: 1.6;
                }

                /* Report Footer */
                .report-footer {
                  background: rgba(30, 41, 59, 0.5);
                  border: 1px solid #475569;
                  border-radius: 12px;
                  padding: 20px;
                  margin-top: 24px;
                }

                .footer-info {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 12px;
                  margin-bottom: 16px;
                }

                .footer-info strong {
                  color: #22d3ee;
          font-weight: 400;
                }

                .footer-info code {
                  background: #374151;
                  color: #22d3ee;
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                }

                .disclaimer {
                  font-size: 12px;
                  color: #6b7280;
                  font-style: italic;
                  text-align: center;
                  padding-top: 16px;
                  border-top: 1px solid #374151;
                }

                /* Analysis Incomplete */
                .analysis-incomplete {
                  text-align: center;
                  padding: 40px;
                  background: linear-gradient(135deg, #7c2d12 0%, #dc2626 100%);
                  border: 1px solid #ef4444;
                  border-radius: 16px;
                }

                .error-icon {
                  font-size: 48px;
                  margin-bottom: 16px;
                }

                .analysis-incomplete h2 {
                  font-size: 20px;
                  font-weight: 600;
                  color: #ffffff;
                  margin: 0 0 12px 0;
                }

                .address-display {
                  background: rgba(0, 0, 0, 0.3);
                  color: #22d3ee;
                  padding: 8px 16px;
                  border-radius: 8px;
                  font-family: monospace;
                  font-size: 12px;
                  margin: 16px 0;
                  word-break: break-all;
                }

                .analysis-incomplete p {
                  font-size: 14px;
                  color: #fca5a5;
                  margin: 0;
                }

        /* Risk Factors Section */
        .risk-factors-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%);
          border: 1px solid #a855f7;
          border-radius: 16px;
          padding: 20px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .section-icon {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .section-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .factors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .factor-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 8px;
        }

        .factor-icon {
          color: #f59e0b;
          font-weight: bold;
        }

        .factor-text {
          font-size: 12px;
          color: #e2e8f0;
          font-weight: 500;
        }

        /* Tags Section */
        .tags-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
          border: 1px solid #3b82f6;
          border-radius: 16px;
          padding: 20px;
        }

        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tag-badge.critical {
          background: #dc2626;
          color: #ffffff;
        }

        .tag-badge.high {
          background: #dc2626;
          color: #ffffff;
        }

        .tag-badge.normal {
          background: #dc2626;
          color: #ffffff;
        }

        /* IOC Section */
        .ioc-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #7c2d12 0%, #92400e 100%);
          border: 1px solid #f97316;
          border-radius: 16px;
          padding: 20px;
        }

        .ioc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .ioc-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 12px;
          padding: 16px;
        }

        .ioc-card h4 {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 12px 0;
        }

        .ioc-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ioc-item {
          background: rgba(0, 0, 0, 0.3);
          color: #fbbf24;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-family: 'Monaco', 'Menlo', monospace;
          word-break: break-all;
          border: 1px solid rgba(251, 191, 36, 0.2);
        }

        /* Graph Analysis Section */
        .graph-analysis-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #083344 0%, #155e75 100%);
          border: 1px solid #0891b2;
          border-radius: 16px;
          padding: 20px;
        }

        .graph-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .graph-metrics {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(8, 145, 178, 0.3);
        }

        .graph-score {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .score-label {
          font-size: 12px;
          color: #94a3b8;
        }

        .score-value {
          font-size: 18px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 8px;
        }

        .score-value.critical {
          background: #dc2626;
          color: #ffffff;
        }

        .score-value.high {
          background: #f59e0b;
          color: #ffffff;
        }

        .score-value.medium {
          background: #eab308;
          color: #ffffff;
        }

        .score-value.low {
          background: #10b981;
          color: #ffffff;
        }

        .score-value.informational {
          background: #3b82f6;
          color: #ffffff;
        }

        .graph-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
        }

        .stat-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .risk-indicators,
        .security-findings {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(8, 145, 178, 0.3);
          border-radius: 12px;
          padding: 16px;
        }

        .risk-indicators h4,
        .security-findings h4 {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 12px 0;
        }

        .indicators-list,
        .findings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .indicator-item,
        .finding-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .indicator-icon,
        .finding-icon {
          font-size: 14px;
          margin-top: 2px;
        }

        .indicator-text,
        .finding-text {
          font-size: 12px;
          color: #e2e8f0;
          line-height: 1.4;
        }

        /* Wallet Info Section */
        .wallet-info-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #422006 0%, #78350f 100%);
          border: 1px solid #a16207;
          border-radius: 16px;
          padding: 20px;
        }

        .wallet-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wallet-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(161, 98, 7, 0.3);
          border-radius: 8px;
        }

        .wallet-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .wallet-value {
          font-size: 12px;
          color: #fbbf24;
          font-family: 'Monaco', 'Menlo', monospace;
          word-break: break-all;
        }

        /* Additional Scores Section */
        .additional-scores-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
          border: 1px solid #8b5cf6;
          border-radius: 16px;
          padding: 20px;
        }

        .scores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .score-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .score-header {
          font-size: 12px;
          color: #c4b5fd;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .score-display {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
        }

        /* Data Sources Section */
        .data-sources-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
          border: 1px solid #10b981;
          border-radius: 16px;
          padding: 20px;
        }

        .sources-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .source-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          white-space: nowrap;
        }

        .source-icon {
          font-size: 16px;
        }

        .source-name {
          font-size: 13px;
          color: #d1fae5;
          font-weight: 500;
        }

        /* Transaction Section */
        .transaction-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border: 1px solid #6366f1;
          border-radius: 16px;
          padding: 20px;
        }

        .transaction-content {
          margin-top: 16px;
        }

        .transaction-group {
          margin-bottom: 24px;
        }

        .transaction-group h4 {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(99, 102, 241, 0.3);
        }

        .transaction-carousel {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
        }

        .transaction-list {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 4px 0 16px 0;
          scroll-behavior: smooth;
        }

        .transaction-list::-webkit-scrollbar {
          height: 8px;
        }

        .transaction-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .transaction-list::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.6);
          border-radius: 4px;
        }

        .transaction-list::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.8);
        }

        .transaction-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          padding: 16px;
          min-width: 320px;
          max-width: 380px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .transaction-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .tx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tx-index {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }

        .tx-status {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .tx-status.success {
          background: #10b981;
          color: #ffffff;
        }

        .tx-status.error {
          background: #dc2626;
          color: #ffffff;
        }

        .token-badge {
          background: #3b82f6;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
        }

        .tx-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tx-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .tx-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
          min-width: 100px;
          flex-shrink: 0;
        }

        .tx-value {
          font-size: 12px;
          color: #e2e8f0;
          text-align: right;
          word-break: break-all;
          flex: 1;
        }

        .tx-value code {
          background: rgba(0, 0, 0, 0.3);
          color: #fbbf24;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .tx-input {
          font-family: 'Monaco', 'Menlo', monospace;
          background: rgba(0, 0, 0, 0.3);
          color: #fbbf24;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(251, 191, 36, 0.2);
          max-height: 100px;
          overflow-y: auto;
          word-break: break-all;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                  .risk-metrics {
                    grid-template-columns: 1fr;
                    gap: 16px;
                  }
                  
                  .report-meta {
                    grid-template-columns: 1fr;
                  }
                  
                  .analytics-grid {
                    grid-template-columns: 1fr;
                  }
                  
                  .footer-info {
                    grid-template-columns: 1fr;
                  }

          .factors-grid,
          .ioc-grid,
          .scores-grid {
            grid-template-columns: 1fr;
          }

          .graph-metrics {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .graph-stats {
            justify-content: center;
          }

          .transaction-item {
            min-width: 280px;
            max-width: 320px;
          }

          .transaction-list {
            padding: 4px 0 12px 0;
          }
        }
        
        /* Cyclops Section Styles */
        .fund-flow-section {
          margin-bottom: 24px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
          border: 1px solid #4f46e5;
          border-radius: 16px;
          padding: 20px;
        }
        
        .fund-flow-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .fund-flow-icon {
          font-size: 24px;
        }
        
        .fund-flow-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        
        .fund-flow-content p {
          color: #c7d2fe;
          margin-bottom: 16px;
          line-height: 1.6;
        }
        
        .fund-flow-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
          position: relative;
        }
        
        .fund-flow-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
          transform: none !important;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);
        }
        
        .fund-flow-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.6);
          background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
        }
        
        .fund-flow-btn .btn-icon,
        .fund-flow-btn .btn-text {
          font-size: 18px;
        }
        
        .fund-flow-btn .btn-loader {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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

export default function ChatCopilotPage() {
  return (
    <ChatCopilot />
  )
}

// Add global window function for triggering Cyclops from HTML buttons
if (typeof window !== 'undefined') {
  (window as any).triggerFundFlow = (address: string) => {
    // Just trigger the event - loading will be handled by Cyclops component
    const event = new CustomEvent('openFundFlow', { detail: { address } });
    window.dispatchEvent(event);
  }
}
