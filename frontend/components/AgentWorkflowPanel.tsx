'use client'

import { useEffect, useMemo, useState } from 'react'

type WorkflowStep = {
  id: string
  title: string
  subtitle: string
  detail: string
}

type AgentWorkflowPanelProps = {
  loading: boolean
  executionTrace?: string[]
}

const steps: WorkflowStep[] = [
  {
    id: 'workflow_started',
    title: 'Orchestrator Started',
    subtitle: 'Workflow boot',
    detail: 'Receives user query and orchestrates the complete analysis workflow.',
  },
  {
    id: 'query_understanding_completed',
    title: 'Query Understanding Agent',
    subtitle: 'Parse user intent',
    detail: 'Extracts topic, region, intent, and search hints from natural language.',
  },
  {
    id: 'market_research_completed',
    title: 'Market Research Agent',
    subtitle: 'Build market context',
    detail: 'Retrieves market data and synthesizes key markets and industry overview.',
  },
  {
    id: 'news_signal_analysis_completed',
    title: 'News / Signal Agent',
    subtitle: 'Analyze developments',
    detail: 'Aggregates news signals and evaluates their impact on the market context.',
  },
  {
    id: 'workflow_completed',
    title: 'Final Report Ready',
    subtitle: 'Return response',
    detail: 'Compiles all agent findings into a finalized, actionable insight report.',
  },
]

function getStepState(args: {
  stepId: string
  animatedIndex: number
  loading: boolean
  completedIds: Set<string>
}) {
  const { stepId, animatedIndex, loading, completedIds } = args
  const stepIndex = steps.findIndex((item) => item.id === stepId)

  if (completedIds.has(stepId)) return 'done'
  if (loading && stepIndex === animatedIndex) return 'active'
  if (loading && stepIndex < animatedIndex) return 'done'
  return 'idle'
}

export default function AgentWorkflowPanel({
  loading,
  executionTrace = [],
}: AgentWorkflowPanelProps) {
  const [open, setOpen] = useState(true)
  const [animatedIndex, setAnimatedIndex] = useState(0)

  const completedIds = useMemo(() => new Set(executionTrace), [executionTrace])

  useEffect(() => {
    if (!loading) {
      setAnimatedIndex(0)
      return
    }

    setAnimatedIndex(0)

    const interval = setInterval(() => {
      setAnimatedIndex((prev) => {
        if (prev >= steps.length - 1) return prev
        return prev + 1
      })
    }, 900)

    return () => clearInterval(interval)
  }, [loading])

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748b',
            }}
          >
            Agent Workflow
          </p>
          <h2
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 22,
              lineHeight: 1.2,
              color: '#0f172a'
            }}
          >
            How the system is working
          </h2>
        </div>

        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#0f172a',
            padding: '10px 14px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {open ? 'Hide Workflow' : 'Show Workflow'}
        </button>
      </div>

      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? 1200 : 0,
          opacity: open ? 1 : 0,
          transition: 'all 0.35s ease',
        }}
      >
        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 14,
          }}
        >
          {executionTrace.some(t => t.startsWith('warning:')) && (
            <div style={{ 
              background: '#fff7ed', 
              border: '1px solid #fed7aa', 
              borderRadius: 12, 
              padding: '12px 16px', 
              color: '#9a3412',
              fontSize: 14,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontWeight: 500,
              marginBottom: 8
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              {executionTrace.find(t => t.startsWith('warning:'))?.replace('warning: ', 'Note: ')}
            </div>
          )}
          {steps.map((step, index) => {
            const state = getStepState({
              stepId: step.id,
              animatedIndex,
              loading,
              completedIds,
            })

            const isDone = state === 'done'
            const isActive = state === 'active'

            // Extract dynamic details for this step if available
            let dynamicDetailContent = null
            if (isDone) {
              if (step.id === 'query_understanding_completed') {
                const breakdownEntry = executionTrace.find(t => t.startsWith('query_breakdown:'))
                if (breakdownEntry) {
                  try {
                    const topic = breakdownEntry.match(/topic="([^"]+)"/)?.[1]
                    const region = breakdownEntry.match(/region="([^"]+)"/)?.[1]
                    const intent = breakdownEntry.match(/intent="([^"]+)"/)?.[1]
                    const infoJson = breakdownEntry.match(/info=(\[.*\])/)?.[1]
                    const info = infoJson ? JSON.parse(infoJson) : []
                    
                    dynamicDetailContent = (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, fontSize: 13 }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Topic:</span>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{topic}</span>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Region:</span>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{region}</span>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Intent:</span>
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>{intent}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {info.map((item: string, i: number) => (
                            <span key={i} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 11, color: '#475569' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  } catch (e) {
                    console.error("Failed to parse query_breakdown", e)
                  }
                }
              } else if (step.id === 'market_research_completed') {
                const marketEntry = executionTrace.find(t => t.startsWith('market_context_result:'))
                if (marketEntry) {
                  try {
                    const marketsJson = marketEntry.match(/key_markets=(\[.*\])/)?.[1]
                    const markets = marketsJson ? JSON.parse(marketsJson) : []
                    dynamicDetailContent = (
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#64748b', width: '100%', marginBottom: 4 }}>Focusing on:</span>
                        {markets.map((m: string, i: number) => (
                          <span key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: 8, fontSize: 11, color: '#166534', fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    )
                  } catch (e) {}
                }
              } else if (step.id === 'news_signal_analysis_completed') {
                const newsEntry = executionTrace.find(t => t.startsWith('news_analysis_result:'))
                if (newsEntry) {
                  const count = newsEntry.match(/found=(\d+)/)?.[1]
                  const sources = newsEntry.match(/sources=([^,]+(?:, [^,]+)*)/)?.[1]
                  
                  let refs: string[] = []
                  try {
                    const refsMatch = newsEntry.match(/references=(\[.*\])/)
                    if (refsMatch) refs = JSON.parse(refsMatch[1])
                  } catch (e) {}

                  dynamicDetailContent = (
                    <div style={{ marginTop: 12, fontSize: 13 }}>
                      <div style={{ 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 16, 
                        padding: '14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ 
                          color: '#64748b', 
                          fontSize: 10, 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.06em', 
                          marginBottom: 10,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Verified Intelligence Sources</span>
                          <span style={{ 
                            background: '#eff6ff', 
                            color: '#2563eb', 
                            padding: '2px 6px', 
                            borderRadius: 6,
                            fontSize: 9
                          }}>+{count} Signals</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {refs.length > 0 ? refs.map((ref, i) => (
                            <div key={i} style={{ 
                              fontSize: 11, 
                              color: '#1e293b', 
                              background: '#f8fafc', 
                              padding: '5px 10px', 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }}></div>
                              {ref}
                            </div>
                          )) : (
                            <span style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>Searching for external signals...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
              }
            }

            return (
              <div
                key={step.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr',
                  gap: 14,
                  alignItems: 'start',
                  padding: 16,
                  borderRadius: 18,
                  border: isActive
                    ? '1px solid #93c5fd'
                    : isDone
                    ? '1px solid #86efac'
                    : '1px solid #e2e8f0',
                  background: isActive
                    ? '#eff6ff'
                    : isDone
                    ? '#f0fdf4'
                    : '#ffffff',
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isActive
                    ? '0 10px 24px rgba(59, 130, 246, 0.10)'
                    : 'none',
                  transition: 'all 0.25s ease',
                  color: '#0f172a'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    color: isActive ? '#1d4ed8' : isDone ? '#166534' : '#475569',
                    background: isActive
                      ? '#dbeafe'
                      : isDone
                      ? '#dcfce7'
                      : '#f1f5f9',
                    border: isActive
                      ? '1px solid #93c5fd'
                      : isDone
                      ? '1px solid #86efac'
                      : '1px solid #cbd5e1',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {isDone ? '✓' : index + 1}

                  {isActive ? (
                    <span
                      style={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: 999,
                        border: '2px solid rgba(59,130,246,0.35)',
                        animation: 'agentPulse 1.2s infinite',
                      }}
                    />
                  ) : null}
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 17,
                          lineHeight: 1.3,
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        style={{
                          marginTop: 4,
                          marginBottom: 0,
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {step.subtitle}
                      </p>
                    </div>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: isActive
                          ? '#dbeafe'
                          : isDone
                          ? '#dcfce7'
                          : '#e2e8f0',
                        color: isActive
                          ? '#1d4ed8'
                          : isDone
                          ? '#166534'
                          : '#475569',
                      }}
                    >
                      {isActive
                        ? 'Running'
                        : isDone
                        ? 'Completed'
                        : 'Waiting'}
                    </span>
                  </div>

                  <p
                    style={{
                      marginTop: 12,
                      marginBottom: 0,
                      color: '#334155',
                      lineHeight: 1.7,
                      fontSize: 14,
                    }}
                  >
                    {step.detail}
                  </p>

                  {dynamicDetailContent}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes agentPulse {
          0% {
            transform: scale(0.92);
            opacity: 1;
          }
          100% {
            transform: scale(1.12);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  )
}
