import type { FC } from "react";
import type { Filters } from "../components/FilterBar";
import type { ClusterStat } from "../components/TopicPanel";
import type { SocialPost, TimelineDatum } from "../types";
import FeedStreamList from "../components/FeedStreamList";
import TrendRadar from "../components/TrendRadar";
import SubConversationExplorer from "../components/SubConversationExplorer";
import StreamPulse from "../components/StreamPulse";

interface Props {
  metrics: {
    totalPosts: number;
    reach: number;
    avgEngagement: number;
    topTopic: string;
    topCities: string[];
    deltas: {
      totalPct: number;
      reachPct: number;
      engagementPct: number;
      sentimentPct: number;
      reputationPct: number;
      polarizationPct: number;
      viralPropensityPct: number;
    };
    reputationalRisk: number;
    polarization: number;
    viralPropensity: number;
    sentimentIndex: number;
  };
  filteredPosts: SocialPost[];
  timelineData: TimelineDatum[];
  clusterStats: ClusterStat[];
  filters: Filters;
}

const FeedStreamPage: FC<Props> = ({
  metrics,
  filteredPosts,
  timelineData,
  clusterStats,
  filters,
}) => (
  <main className="p-4 md:p-6 space-y-6 overflow-y-auto">
    <StreamPulse posts={filteredPosts} metrics={metrics} />

    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <FeedStreamList posts={filteredPosts} />
      <TrendRadar posts={filteredPosts} filters={filters} timelineData={timelineData} />
    </div>

    <SubConversationExplorer clusters={clusterStats} posts={filteredPosts} />
  </main>
);

export default FeedStreamPage;
