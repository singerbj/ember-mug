import { motion, useScroll, useTransform } from 'motion/react'
import Hero from './components/Hero'
import Features from './components/Features'
import Terminal from './components/Terminal'
import Installation from './components/Installation'
import Footer from './components/Footer'
import './App.css'

function App() {
  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])

  return (
    <div className="app">
      <motion.div
        className="gradient-bg"
        style={{ y: backgroundY }}
      />
      <Hero />
      <Terminal />
      <Features />
      <Installation />
      <Footer />
    </div>
  )
}

export default App
