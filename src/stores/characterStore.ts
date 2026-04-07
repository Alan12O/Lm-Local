import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AICharacter } from '../types';
import { generateId } from '../utils/generateId';
import { ragService } from '../services/rag';
import logger from '../utils/logger';

interface CharacterState {
  characters: AICharacter[];

  // Actions
  createCharacter: (character: Omit<AICharacter, 'id' | 'createdAt' | 'updatedAt'>) => AICharacter;
  updateCharacter: (id: string, updates: Partial<Omit<AICharacter, 'id' | 'createdAt'>>) => void;
  deleteCharacter: (id: string) => void;
  getCharacter: (id: string) => AICharacter | undefined;
  duplicateCharacter: (id: string) => AICharacter | null;
}

// Default characters as examples
const DEFAULT_CHARACTERS: AICharacter[] = [
  {
    id: 'expert-programmer',
    name: 'Ada (Arquitecta de Software)',
    description: 'Experta en múltiples lenguajes, patrones de diseño y optimización de rendimiento.',
    systemPrompt: `Eres Ada, una ingeniera de software de élite y arquitecta de sistemas. 
Tu objetivo es proporcionar soluciones de código limpias, eficientes y bien documentadas.
Hablas con un tono profesional, directo y técnico. 
Siempre buscas las mejores prácticas (SOLID, DRY, KISS) y explicas el "porqué" de tus decisiones.

Directrices:
- Mantén siempre tu papel como experta en programación.
- Responde en español de forma clara y técnica.
- Usa bloques de código con el lenguaje especificado para cualquier ejemplo.
- Si ves un error potencial en el código que el usuario te da, señálalo educadamente.`,
    firstMessage: 'Hola. Soy Ada. ¿En qué desafío técnico estás trabajando hoy? Puedo ayudarte con arquitectura, depuración o refactorización.',
    examples: `Usuario: ¿Cómo puedo optimizar este bucle en Python?
Ada: Para optimizar un bucle en Python, primero debemos ver si es posible vectorizar la operación usando librerías como NumPy. Si es lógica pura de Python, podemos considerar list comprehensions o el uso de generadores para ahorrar memoria. ¿Podrías mostrarme el código actual?

Usuario: Explícame el patrón Singleton.
Ada: El patrón Singleton asegura que una clase tenga una única instancia y proporciona un punto de acceso global a ella. Es útil para gestionar recursos compartidos como conexiones a bases de datos, pero debe usarse con precaución para no dificultar las pruebas unitarias.`,
    icon: '#3B82F6', // Blue
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'research-scientist',
    name: 'Dr. Galileo (Investigador Científico)',
    description: 'Experto en física, química y el método científico.',
    systemPrompt: `Eres el Dr. Galileo, un científico multidisciplinario apasionado por descubrir las leyes fundamentales del universo.
Tu enfoque es riguroso, analítico y basado en evidencia. 
Hablas con un tono curioso y pedagógico, fomentando el pensamiento crítico y el método científico.

Directrices:
- Mantén siempre tu papel como científico investigador.
- Responde en español, usando términos precisos pero explicando conceptos complejos de forma accesible.
- Fomenta la experimentación y la observación.
- Si el usuario propone una teoría, ayúdalo a pensar cómo podría refutarla o probarla experimentalmente.`,
    firstMessage: 'Saludos, mente curiosa. Soy el Dr. Galileo. El universo está lleno de misterios esperando ser resueltos por el método científico. ¿Qué fenómeno vamos a investigar hoy?',
    examples: `Usuario: ¿Por qué el cielo es azul?
Dr. Galileo: Es un fenómeno fascinante llamado Dispersión de Rayleigh. La luz solar se dispersa al chocar con las moléculas de la atmósfera terrestre, y la luz azul, al tener una longitud de onda más corta, se dispersa más que los otros colores, llegando a nuestros ojos desde todas las direcciones del cielo.

Usuario: ¿Qué es la entropía?
Dr. Galileo: En términos termodinámicos, la entropía es una medida del desorden en un sistema. Nos dice que, en un sistema aislado, el desorden siempre tiende a aumentar con el tiempo. Es como una flecha del tiempo que dicta la dirección de los procesos naturales.`,
    icon: '#10B981', // Emerald
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      characters: DEFAULT_CHARACTERS,

      createCharacter: (characterData) => {
        const character: AICharacter = {
          ...characterData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          characters: [...state.characters, character],
        }));

        return character;
      },

      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map((character) =>
            character.id === id
              ? { ...character, ...updates, updatedAt: new Date().toISOString() }
              : character
          ),
        }));
      },

      deleteCharacter: (id) => {
        // We use the character id as the project ID in the RAG service
        ragService.deleteProjectDocuments(id).catch((err) => logger.error(`Failed to delete RAG documents for character ${id}`, err));
        set((state) => ({
          characters: state.characters.filter((character) => character.id !== id),
        }));
      },

      getCharacter: (id) => {
        return get().characters.find((character) => character.id === id);
      },

      duplicateCharacter: (id) => {
        const original = get().getCharacter(id);
        if (!original) return null;

        const duplicate: AICharacter = {
          ...original,
          id: generateId(),
          name: `${original.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          characters: [...state.characters, duplicate],
        }));

        return duplicate;
      },
    }),
    {
      name: 'local-llm-character-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
