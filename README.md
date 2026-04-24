<div align="center">

<img src="src/assets/logo.png" alt="LM Local Logo" width="120" />

# LM Local

### The Swiss Army Knife of On-Device AI

**Chat. Generate images. Use tools. See. Listen. All on your phone or Mac. All offline. Zero data leaves your device.**

[![CI](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml/badge.svg)](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Alan12O/Lm-Local/graph/badge.svg)](https://codecov.io/gh/Alan12O/Lm-Local)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🚀 Not just another chat app

Most "local LLM" apps give you a text chatbot and call it a day. **LM Local** is a **complete offline AI suite** — text generation, image generation, vision AI, voice transcription, tool calling, and document analysis, all running natively on your phone's or Mac's hardware.

---

## ✨ Key Features

<div align="center">
<table>
  <tr>
    <td align="center"><b>💬 Text Generation</b><br/>Llama 3.2, Qwen 3, Phi-4<br/>Streaming & Thinking Mode</td>
    <td align="center"><b>🎨 Image Generation</b><br/>Stable Diffusion NPU-Accelerated<br/>Real-time previews</td>
    <td align="center"><b>👁️ Vision AI</b><br/>Analyze images & documents<br/>SmolVLM & Qwen3-VL</td>
  </tr>
  <tr>
    <td align="center"><b>🛠️ Tool Calling</b><br/>Web Search, Calculator<br/>Knowledge Base Integration</td>
    <td align="center"><b>📚 Local RAG</b><br/>On-device vector search<br/>PDF & Doc analysis</td>
    <td align="center"><b>🎙️ Voice Input</b><br/>Whisper STT<br/>Zero-latency transcription</td>
  </tr>
</table>
</div>

### 🧠 Advanced Capabilities

- **Project Knowledge Base** — Upload PDFs and text documents. They are chunked, embedded on-device with MiniLM, and retrieved via cosine similarity using a local SQLite vector store.
- **Remote LLM Support** — Seamlessly connect to Ollama, LM Studio, or any OpenAI-compatible API on your local network with automatic discovery.
- **Hardware Acceleration** — Forcibly stable NPU utilization on Snapdragon (8 Gen 2/3) and Core ML on Apple Silicon.
- **Privacy First** — No trackers, no analytics, no cloud. Your data is yours.

---

## 📦 Installation

### Download

<div align="center">
<table><tr>
<td align="center"><a href="https://apps.apple.com/us/app/lm-local-local-ai/id6759299882"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="180" /></a></td>
<td align="center"><a href="https://play.google.com/store/apps/details?id=ai.lmlocal"><img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" width="220" /></a></td>
</tr></table>
</div>

### Build from source

```bash
git clone https://github.com/Alan12O/Lm-Local.git
cd Lm-Local
npm install

# Build Android
npm run android

# Build iOS
cd ios && pod install && cd ..
npm run ios
```

> **Requirements:** Node.js 20+, JDK 17, Android SDK 35/36, Xcode 15+.

---

## 🛠️ Testing & Quality

We maintain strict quality gates via **Husky** and **GitHub Actions**. Every PR is validated against:

- **Unit Tests** (`Jest`): Logic, stores, and service layers.
- **Native Tests** (`JUnit`/`XCTest`): Hardware-specific modules (NPU, PDF, File System).
- **E2E Flows** (`Maestro`): Critical user paths.

```bash
npm test              # Run all unit/native tests
npm run test:e2e      # Run Maestro E2E flows
```

---

## 📖 Documentation

Explore our detailed guides:

- 🏛️ **[Architecture](docs/ARCHITECTURE.md)**: System design and performance tuning.
- 🗺️ **[Codebase Guide](docs/standards/CODEBASE_GUIDE.md)**: Deep dive into the source code.
- 🎨 **[Design System](docs/design/DESIGN_PHILOSOPHY_SYSTEM.md)**: Brutalist aesthetics and theme engine.
- ⚖️ **[Privacy Policy](docs/PRIVACY_POLICY.md)**: Our commitment to your data.

---

## 📜 Credits & Acknowledgments

This application is based on the original work of **Wednesday** and the **Off Grid** application. We are grateful for their contributions to the local AI ecosystem.

---

<div align="center">
Built with ❤️ by the LM Local Community
</div>
