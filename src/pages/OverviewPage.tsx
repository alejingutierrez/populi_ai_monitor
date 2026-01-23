import type { FC } from "react";
import SummaryGrid from "../components/SummaryGrid";
import TimelineChart from "../components/TimelineChart";
import MapView from "../components/MapView";
import PostFeed from "../components/PostFeed";
import TopicPanel, { type ClusterStat } from "../components/TopicPanel";
import ConversationTrends from "../components/ConversationTrends";
import type { SocialPost, TimelineDatum } from "../types";
import type { Filters } from "../components/FilterBar";

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
  allPosts: SocialPost[];
  filters: Filters;
  search: string;
}

const OverviewPage: FC<Props> = ({
  metrics,
  filteredPosts,
  timelineData,
  clusterStats,
  allPosts,
  filters,
  search,
}) => (
  <main className="p-4 md:p-6 space-y-6 overflow-y-auto">
    <SummaryGrid metrics={metrics} />

    <div className="grid gap-4 xl:grid-cols-2">
      <TimelineChart data={timelineData} />
      <MapView posts={filteredPosts} />
      <PostFeed posts={filteredPosts} />
      <TopicPanel clusters={clusterStats} />
    </div>

    <ConversationTrends allPosts={allPosts} filters={filters} search={search} />
  </main>
);

export default OverviewPage;
