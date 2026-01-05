export type Sentiment = "positivo" | "neutral" | "negativo";

export type Platform =
  | "X/Twitter"
  | "Facebook"
  | "Instagram"
  | "YouTube"
  | "TikTok"
  | "Reddit";

export type Topic =
  | "Infraestructura"
  | "Turismo"
  | "Salud"
  | "Seguridad"
  | "Energia"
  | "Educacion"
  | "Clima"
  | "Innovacion"
  | "Empleo"
  | "Comunidad";

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
    lat: number;
    lng: number;
  };
  timestamp: string;
  reach: number;
  engagement: number;
  mediaType: "texto" | "video" | "audio" | "imagen";
  cluster: string;
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
