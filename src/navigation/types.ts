export type RootStackParamList = {
  Onboarding: undefined;
  ModelDownload: undefined;
  Main: undefined;
  // Former ChatsStack
  Chat: { conversationId?: string; projectId?: string };
  // Former ProjectsStack
  ProjectDetail: { projectId: string };
  ProjectEdit: { projectId?: string };
  ProjectChats: { projectId: string };
  KnowledgeBase: { projectId: string };
  DocumentPreview: { filePath: string; fileName: string; fileSize: number };
  // CharactersStack
  CharacterDetail: { characterId: string };
  CharacterEdit: { characterId?: string };
  CharacterChats: { characterId: string };
  // Former SettingsStack
  ModelSettings: undefined;
  RemoteServers: undefined;
  VoiceSettings: undefined;
  DeviceInfo: undefined;
  StorageSettings: undefined;
  SecuritySettings: undefined;
  // Already in RootStack
  DownloadManager: undefined;
  Gallery: { conversationId?: string } | undefined;
  Math: undefined;
  Projects: undefined;
  Characters: undefined;
  ImageStudio: undefined;
};

// Tab navigator — simple, no sub-stacks
export type MainTabParamList = {
  HomeTab: undefined;
  ChatsTab: undefined;
  ArtifactsTab: undefined;
  ModelsTab: { initialTab?: 'text' | 'image' } | undefined;
  SettingsTab: undefined;
};
