<div align="center">

<img src="src/assets/logo.png" alt="LM Local Logo" width="120" />

# LM Local

### Aplicación para correr modelos locales de texto e imágenes fácilmente, optimizada para dispositivos móviles

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
Descarga desde la lista de releases activa
nota: los paquetes de android estan firmados con una key de Alan12O
nota: los paquetes de ios estan firmados con una key de Alan12O
nota: Por el momento no hay un manera sencilla de distribuir la app en ios mas alla de las betas. Te recomiendo que uses el build directamente desde el codigo fuente.

### Build from source
Existen diferentes maneras de instalar y utilizar esta app.
La manera mas sencilla es usar el build desde el codigo fuente.
Se cuenta con un script interno para facilitar el proceso: `./correr_compilacion.ps1`, el cual te preguntara que tipo de build quieres hacer y se encargara de instalar lo necesario (en la medida de lo posible).
Para usar los scripts de forma local necesitarás tener instalado nodejs, JDK 17, Android SDK 35/36 y Xcode 15+
Nota: para ios, ademas necesitas tener instalado cocoapods, por el momento no se ha incluido en el script de setup.

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
Built by Alan12O based on Wednesday's work (from Off Grid).
</div>
