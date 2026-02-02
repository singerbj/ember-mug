import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import './Footer.css'

export default function Footer() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <footer className="footer" ref={ref}>
      <div className="footer-container">
        <motion.div
          className="footer-cta"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h3>Ready to take control?</h3>
          <p>Start managing your Ember mug from the terminal today.</p>
          <div className="footer-buttons">
            <a href="#installation" className="btn btn-primary">
              Get Started
            </a>
            <a
              href="https://github.com/singerbj/ember-mug"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              View Source
            </a>
          </div>
        </motion.div>

        <div className="footer-divider" />

        <motion.div
          className="footer-bottom"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="footer-brand">
            <span className="footer-logo">C[_]</span>
            <span className="footer-name">ember-mug</span>
          </div>

          <div className="footer-links">
            <a
              href="https://github.com/singerbj/ember-mug"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/ember-mug"
              target="_blank"
              rel="noopener noreferrer"
            >
              npm
            </a>
            <a
              href="https://github.com/singerbj/ember-mug/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Issues
            </a>
          </div>

          <p className="footer-copyright">
            MIT License. Not affiliated with Ember Technologies.
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
