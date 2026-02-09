import type { FC } from "react";
import SummaryGrid, { type SummaryMetrics } from "../components/SummaryGrid";
import TimelineChart from "../components/TimelineChart";
import MapView from "../components/MapView";
import PostFeed from "../components/PostFeed";
import TopicPanel, { type ClusterStat } from "../components/TopicPanel";
import ConversationTrends from "../components/ConversationTrends";
import type { SocialPost, TimelineDatum } from "../types";
import type { Filters } from "../components/FilterBar";

interface Props {
  metrics: SummaryMetrics;
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
