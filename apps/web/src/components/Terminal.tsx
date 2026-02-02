import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import './Terminal.css'

export default function Terminal() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="terminal-section" ref={ref}>
      <div className="terminal-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2>Beautiful Terminal Interface</h2>
          <p>A full-featured CLI with real-time updates, intuitive controls, and a stunning visual design.</p>
        </motion.div>

        <motion.div
          className="terminal-window"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="terminal-header">
            <div className="terminal-buttons">
              <span className="terminal-btn close" />
              <span className="terminal-btn minimize" />
              <span className="terminal-btn maximize" />
            </div>
            <span className="terminal-title">ember-mug</span>
            <div className="terminal-spacer" />
          </div>

          <div className="terminal-body">
            <TerminalContent />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TerminalContent() {
  return (
    <div className="cli-interface">
      {/* Header */}
      <div className="cli-header">
        <span className="cli-logo">C[_]</span>
        <span className="cli-title">EMBER MUG</span>
        <span className="cli-status">
          <span className="status-dot" />
          EMBER
        </span>
      </div>

      <div className="cli-divider" />

      <div className="cli-main">
        {/* ASCII Mug */}
        <div className="cli-mug">
          <pre className="ascii-art">{`      |   |
       \\   /
        (   )
         { }
    {    }-{    }
  .-{      }     }-.
 |'-..______..-'|
   \\'-..__..-'/
     (     \\\\
     |   )  )
     )  /
    (   /
    \\\\      y'
 \\'-..__..-'`}</pre>
        </div>

        {/* Panels */}
        <div className="cli-panels">
          {/* Temperature Panel */}
          <div className="cli-panel">
            <div className="panel-header">Temperature</div>
            <div className="panel-content temp-content">
              <div className="temp-display">
                <div className="temp-item">
                  <span className="temp-label">Current</span>
                  <span className="temp-value">133°F</span>
                </div>
                <span className="temp-arrow">&rarr;</span>
                <div className="temp-item">
                  <span className="temp-label">Target</span>
                  <span className="temp-value target">133°F</span>
                </div>
              </div>
              <div className="temp-status">At temp</div>
            </div>
          </div>

          {/* Battery Panel */}
          <div className="cli-panel">
            <div className="panel-header">Battery</div>
            <div className="panel-content battery-content">
              <span className="battery-percent">52%</span>
              <div className="battery-bar">
                <div className="battery-fill" style={{ width: '52%' }} />
              </div>
              <span className="battery-time">[~] 1h 44m remaining</span>
            </div>
          </div>

          {/* Temperature Adjust */}
          <div className="cli-panel">
            <div className="panel-header">Temperature Adjust</div>
            <div className="panel-content adjust-content">
              <div className="slider-display">
                <span>122°F</span>
                <div className="slider-track">
                  <div className="slider-fill" style={{ width: '50%' }} />
                  <div className="slider-thumb" style={{ left: '50%' }} />
                </div>
                <span>145°F</span>
              </div>
              <span className="slider-hint">&larr;/&rarr;</span>
            </div>
          </div>

          {/* Presets */}
          <div className="cli-panel">
            <div className="panel-header">Temperature Presets</div>
            <div className="panel-content presets-content">
              <div className="preset">
                <span className="preset-name">Latte</span>
                <span className="preset-temp">126°F</span>
                <span className="preset-key">[1]</span>
              </div>
              <div className="preset">
                <span className="preset-name">Coffee</span>
                <span className="preset-temp">132°F</span>
                <span className="preset-key">[2]</span>
              </div>
              <div className="preset">
                <span className="preset-name">Tea</span>
                <span className="preset-temp">140°F</span>
                <span className="preset-key">[3]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cli-divider" />

      {/* Footer */}
      <div className="cli-footer">
        <span><b>[1-3]</b> presets</span>
        <span><b>[u]</b> unit</span>
        <span><b>[r]</b> repair</span>
        <span><b>[o]</b> settings</span>
        <span><b>[q]</b> quit</span>
      </div>
    </div>
  )
}
