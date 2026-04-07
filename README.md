<div align="center">

<img src="src/assets/logo.png" alt="Lm-Local Logo" width="120" />

# Lm-Local

### The Swiss Army Knife of On-Device AI

**Chat. Generate images. Use tools. See. Listen. All on your phone or Mac. All offline. Zero data leaves your device.**
</div>

---

## Not just another chat app

Most "local LLM" apps give you a text chatbot and call it a day. Lm-Local is a **complete offline AI suite** — text generation, image generation, vision AI, voice transcription, tool calling, and document analysis, all running natively on your phone's or Mac's hardware.

---

## What can it do?

<div align="center">
<table>
  <tr>
    <td align="center"><img src="demo-gifs/onboarding.gif" width="200" /><br /><b>Onboarding</b></td>
    <td align="center"><img src="demo-gifs/text-gen.gif" width="200" /><br /><b>Text Generation</b></td>
    <td align="center"><img src="demo-gifs/image-gen.gif" width="200" /><br /><b>Image Generation</b></td>
  </tr>
  <tr>
    <td align="center"><img src="demo-gifs/vision.gif" width="200" /><br /><b>Vision AI</b></td>
    <td align="center"><img src="demo-gifs/attachments.gif" width="200" /><br /><b>Attachments</b></td>
    <td align="center"><img src="demo-gifs/tool-calling.gif" width="200" /><br /><b>Tool Calling</b></td>
</tr>
</table>
</div>

**Text Generation** — Run Qwen 3, Llama 3.2, Gemma 3, Phi-4, and any GGUF model. Streaming responses, thinking mode, markdown rendering, 15-30 tok/s on flagship devices. Bring your own `.gguf` files too.

**Remote LLM Servers** — Connect to any OpenAI-compatible server on your local network (Ollama, LM Studio, LocalAI). Discover models automatically, stream responses via SSE, store API keys securely in the system keychain. Switch seamlessly between local and remote models.

**Tool Calling** — Models that support function calling can use built-in tools: web search, calculator, date/time, device info, and knowledge base search. Automatic tool loop with runaway prevention. Clickable links in search results.

**Project Knowledge Base** — Upload PDFs and text documents to a project's knowledge base. Documents are chunked, embedded on-device with a bundled MiniLM model, and retrieved via cosine similarity — all stored locally in SQLite. The `search_knowledge_base` tool is automatically available in project conversations.

**Image Generation** — On-device Stable Diffusion with real-time preview. NPU-accelerated on Snapdragon (5-10s per image), Core ML on iOS. 20+ models including Absolute Reality, DreamShaper, Anything V5.

**Vision AI** — Point your camera at anything and ask questions. SmolVLM, Qwen3-VL, Gemma 3n — analyze documents, describe scenes, read receipts. ~7s on flagship devices.

**Voice Input** — On-device Whisper speech-to-text. Hold to record, auto-transcribe. No audio ever leaves your phone.

**Document Analysis** — Attach PDFs, code files, CSVs, and more to your conversations. Native PDF text extraction on both platforms.

**AI Prompt Enhancement** — Simple prompt in, detailed Stable Diffusion prompt out. Your text model automatically enhances image generation prompts.

<a name="install"></a>
## Install

<div align="center">
<table><tr>
<td align="center"><a href="https://apps.apple.com/us/app/off-grid-local-ai/id6759299882"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="180" /></a></td>
<td align="center"><a href="https://play.google.com/store/apps/details?id=ai.offgridmobile"><img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" width="220" /></a></td>
</tr></table>
</div>
### Build from source

```bash
git clone https://github.com/Alan12O/Lm-Local.git
cd Lm-Local
npm install

# Android
cd android && ./gradlew clean && cd ..
npm run android

# iOS
cd ios && pod install && cd ..
npm run ios
```

> Requires Node.js 20+, JDK 17 / Android SDK 36 (Android), Xcode 15+ (iOS). See [full build guide](docs/ARCHITECTURE.md#building-from-source).

---

## Testing

[![CI](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml/badge.svg)](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Alan12O/Lm-Local/graph/badge.svg)](https://codecov.io/gh/Alan12O/Lm-Local)

Tests run across three platforms on every PR:

| Platform | Framework | What's covered |
|----------|-----------|----------------|
| React Native | Jest + RNTL | Stores, services, components, screens, contracts |
| Android | JUnit | LocalDream, DownloadManager, BroadcastReceiver |
| iOS | XCTest | PDFExtractor, CoreMLDiffusion, DownloadManager |
| E2E | Maestro | Critical path flows (launch, chat, models, downloads) |

```bash
npm test              # Run all tests (Jest + Android + iOS)
npm run test:e2e      # Run Maestro E2E flows (requires running app)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture & Technical Reference](docs/ARCHITECTURE.md) | System architecture, design patterns, native modules, performance tuning |
| [Codebase Guide](docs/standards/CODEBASE_GUIDE.md) | Comprehensive code walkthrough |
| [Design System](docs/design/DESIGN_PHILOSOPHY_SYSTEM.md) | Brutalist design philosophy, theme system, tokens |
| [Visual Hierarchy Standard](docs/design/VISUAL_HIERARCHY_STANDARD.md) | Visual hierarchy and layout standards |
</div>
