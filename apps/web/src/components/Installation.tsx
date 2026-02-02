import { motion, useInView } from 'motion/react'
import { useRef, useState } from 'react'
import './Installation.css'

const installSteps = [
  {
    step: '01',
    title: 'Enable Bluetooth',
    command: null,
    description: 'Make sure Bluetooth is enabled on your device and your Ember mug is powered on.',
  },
  {
    step: '02',
    title: 'Run the CLI',
    command: 'npx ember-mug@latest',
    description: 'Launch the CLI and it will automatically discover and connect to your mug.',
  },
]

export default function Installation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="installation-section" id="installation" ref={ref}>
      <div className="installation-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2>Get Started in Seconds</h2>
          <p>Two simple steps to start controlling your Ember mug from the terminal.</p>
        </motion.div>

        <div className="steps-container">
          {installSteps.map((step, index) => (
            <motion.div
              key={step.step}
              className="step-card"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 * index }}
            >
              <div className="step-number">{step.step}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.command && <CommandBlock command={step.command} />}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="platform-notes"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h4>Platform Requirements</h4>
          <div className="platforms">
            <div className="platform">
              <span className="platform-icon">
                <AppleIcon />
              </span>
              <span className="platform-name">macOS</span>
              <span className="platform-note">Works out of the box</span>
            </div>
            <div className="platform">
              <span className="platform-icon">
                <LinuxIcon />
              </span>
              <span className="platform-name">Linux</span>
              <span className="platform-note">Requires BlueZ stack</span>
            </div>
            <div className="platform">
              <span className="platform-icon">
                <WindowsIcon />
              </span>
              <span className="platform-name">Windows</span>
              <span className="platform-note">Requires compatible adapter</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="command-block">
      <code>
        <span className="prompt">$</span> {command}
      </code>
      <button className="copy-button" onClick={copyToClipboard}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function LinuxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.311.002-.465.006C6.993.156 3.54 3.967 3.54 9.143c0 1.826.267 3.577.787 5.195-.378.21-.733.479-1.043.809-1.135 1.218-1.282 3.116-.197 4.532.392.512.946.916 1.583 1.165-.158.328-.24.693-.24 1.078 0 1.412 1.047 2.578 2.4 2.578.666 0 1.27-.285 1.7-.74.47.185.978.285 1.5.285H14c.522 0 1.03-.1 1.5-.285.43.455 1.034.74 1.7.74 1.353 0 2.4-1.166 2.4-2.578 0-.385-.082-.75-.24-1.078.637-.249 1.191-.653 1.583-1.165 1.085-1.416.938-3.314-.197-4.532-.31-.33-.665-.599-1.043-.809.52-1.618.787-3.369.787-5.195C20.46 3.967 17.007.156 11.961.006c-.154-.004-.31-.006-.465-.006h.008zm-.006 2.003c4.195.132 7.002 3.28 7.002 7.14 0 1.618-.227 3.156-.67 4.556l-.197.63.587.322c.293.162.545.372.749.63.574.723.663 1.773.108 2.476-.254.321-.595.552-.98.676l-.6.195.134.628c.05.232.078.472.078.719 0 .683-.384 1.253-.9 1.403V21c0-.22-.18-.4-.4-.4H7.8c-.22 0-.4.18-.4.4v.378c-.516-.15-.9-.72-.9-1.403 0-.247.028-.487.078-.72l.134-.627-.6-.195c-.385-.124-.726-.355-.98-.676-.555-.703-.466-1.753.108-2.476.204-.258.456-.468.749-.63l.587-.323-.197-.629c-.443-1.4-.67-2.938-.67-4.556 0-3.86 2.807-7.008 7.002-7.14z" />
    </svg>
  )
}

function WindowsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  )
}
