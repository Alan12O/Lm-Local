<div align="center">

<img src="src/assets/logo.png" alt="Logo de LM Local" width="120" />

# LM Local

### Aplicación para correr modelos locales de texto e imágenes fácilmente, optimizada para dispositivos móviles

**Chatea. Genera imágenes. Usa herramientas. Mira. Escucha. Todo en tu teléfono o Mac. Todo sin conexión. Ningún dato sale de tu dispositivo.**

[![CI](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml/badge.svg)](https://github.com/Alan12O/Lm-Local/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Alan12O/Lm-Local/graph/badge.svg)](https://codecov.io/gh/Alan12O/Lm-Local)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🚀 Mucho más que una aplicación de chat

La mayoría de las aplicaciones de "LLM local" solo ofrecen un chatbot de texto. **LM Local** es una **suite de IA completa y offline**: generación de texto, generación de imágenes, IA de visión, transcripción de voz, llamado de herramientas y análisis de documentos, todo ejecutándose de forma nativa en el hardware de tu teléfono o Mac.

---

## ✨ Características Principales

<div align="center">
<table>
  <tr>
    <td align="center"><b>💬 Generación de Texto</b><br/>Llama 3.2, Qwen 3, Phi-4<br/>Streaming y Modo Pensamiento</td>
    <td align="center"><b>🎨 Generación de Imágenes</b><br/>Stable Diffusion acelerado por NPU<br/>Vistas previas en tiempo real</td>
    <td align="center"><b>👁️ IA de Visión</b><br/>Analiza imágenes y documentos<br/>SmolVLM y Qwen3-VL</td>
  </tr>
  <tr>
    <td align="center"><b>🛠️ Llamado de Herramientas</b><br/>Búsqueda web, Calculadora<br/>Integración con Base de Conocimientos</td>
    <td align="center"><b>📚 RAG Local</b><br/>Búsqueda vectorial en el dispositivo<br/>Análisis de PDF y documentos</td>
    <td align="center"><b>🎙️ Entrada de Voz</b><br/>Whisper STT<br/>Transcripción con latencia cero</td>
  </tr>
</table>
</div>

### 🧠 Capacidades Avanzadas

- **Base de Conocimientos del Proyecto**: Sube archivos PDF y documentos de texto. Se fragmentan y se generan incrustaciones (embeddings) en el dispositivo con MiniLM, recuperándose mediante similitud de coseno usando un almacén vectorial local en SQLite.
- **Soporte para LLM Remotos**: Conéctate sin problemas a Ollama, LM Studio o cualquier API compatible con OpenAI en tu red local con descubrimiento automático.
- **Aceleración de Hardware**: Utilización estable de NPU en Snapdragon (8 Gen 2/3) y Core ML en Apple Silicon.
- **Privacidad Ante Todo**: Sin rastreadores, sin analíticas, sin la nube. Tus datos te pertenecen.

---

## 📦 Instalación

### Descarga
Descarga desde la lista de releases activa.
Nota: Los paquetes de Android están firmados con una clave de **Alan12O**.
Nota: Los paquetes de iOS están firmados con una clave de **Alan12O**.
Nota: Por el momento no hay una manera sencilla de distribuir la app en iOS más allá de las betas. Te recomendamos que hagas el *build* directamente desde el código fuente.

### Build desde el código fuente
Existen diferentes maneras de instalar y utilizar esta app.
La manera más sencilla es usar el build desde el código fuente.
Se cuenta con un script interno para facilitar el proceso: `./correr_compilacion.ps1`, el cual te preguntará qué tipo de build quieres hacer y se encargará de instalar lo necesario (en la medida de lo posible).
Para usar los scripts de forma local necesitarás tener instalado Node.js 20+, JDK 17, Android SDK 35/36 y Xcode 15+.
Nota: para iOS, además necesitas tener instalado CocoaPods; por el momento no se ha incluido en el script de configuración automática.

```bash
git clone https://github.com/Alan12O/Lm-Local.git
cd Lm-Local
npm install

# Build para Android
npm run android

# Build para iOS
cd ios && pod install && cd ..
npm run ios
```

---

## 🛠️ Pruebas y Calidad

Mantenemos estrictos controles de calidad mediante **Husky** y **GitHub Actions**. Cada PR se valida contra:

- **Pruebas Unitarias** (`Jest`): Lógica, estados y capas de servicio.
- **Pruebas Nativas** (`JUnit`/`XCTest`): Módulos específicos de hardware (NPU, PDF, Sistema de archivos).
- **Flujos E2E** (`Maestro`): Rutas críticas de usuario.

```bash
npm test              # Ejecuta todas las pruebas unitarias/nativas
npm run test:e2e      # Ejecuta los flujos E2E de Maestro
```

---

## 📖 Documentación

Explora nuestras guías detalladas:

- 🏛️ **[Arquitectura](docs/ARCHITECTURE.md)**: Diseño del sistema y optimización de rendimiento.
- 🗺️ **[Guía del Código](docs/standards/CODEBASE_GUIDE.md)**: Análisis profundo del código fuente.
- 🎨 **[Sistema de Diseño](docs/design/DESIGN_PHILOSOPHY_SYSTEM.md)**: Estética brutalista y motor de temas.
- ⚖️ **[Política de Privacidad](docs/PRIVACY_POLICY.md)**: Nuestro compromiso con tus datos.

---

## 📜 Créditos y Agradecimientos

Esta aplicación está basada en el trabajo original de **Wednesday** y la aplicación **Off Grid**. Estamos agradecidos por sus contribuciones al ecosistema de IA local.

---

<div align="center">
Desarrollado por Alan12O basado en el trabajo de Wednesday (Off Grid).
</div>
