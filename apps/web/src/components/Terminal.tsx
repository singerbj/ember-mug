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
            <img
              src="/screenshot.png"
              alt="Ember Mug CLI interface showing temperature controls, battery status, and temperature presets"
              className="terminal-screenshot"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
