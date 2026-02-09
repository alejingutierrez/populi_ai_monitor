export type Sentiment = "positivo" | "neutral" | "negativo";

// Brandwatch (Consumer Insights) puede devolver valores no previstos para plataforma/tema.
// Mantenemos estos campos como strings para evitar roturas al migrar/backfill.
export type Platform = string;
export type Topic = string;

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  platform: Platform;
  content: string;
  sentiment: Sentiment;
  topic: Topic;
  location: {
    city: string;
    lat: number | null;
    lng: number | null;
  };
  timestamp: string;
  reach: number;
  engagement: number;
  mediaType: "texto" | "video" | "audio" | "imagen";
  cluster: string;
  subcluster: string;
  microcluster: string;
  // Campos opcionales para compatibilidad futura con Consumer API + Neon.
  url?: string;
  domain?: string;
  language?: string;
}

export interface TimelineDatum {
  time: string;
  publicaciones: number;
  alcance: number;
  engagement: number;
  sentimentIndex: number;
  reputationalRisk: number;
  polarization: number;
  viralPropensity: number;
}
