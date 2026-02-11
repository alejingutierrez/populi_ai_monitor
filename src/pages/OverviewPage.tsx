import type { FC } from "react";
import SummaryGrid, { type SummaryMetrics } from "../components/SummaryGrid";
import TimelineChart from "../components/TimelineChart";
import MapView from "../components/MapView";
import PostFeed from "../components/PostFeed";
import ResizableHorizontalSplit from "../components/ResizableHorizontalSplit";
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

    <ResizableHorizontalSplit
      storageKey="overview:timeline-map"
      defaultRatio={0.52}
      minRatio={0.34}
      maxRatio={0.66}
      left={<TimelineChart data={timelineData} />}
      right={<MapView posts={filteredPosts} />}
    />

    <ResizableHorizontalSplit
      storageKey="overview:feed-topics"
      defaultRatio={0.56}
      minRatio={0.34}
      maxRatio={0.72}
      left={<PostFeed posts={filteredPosts} />}
      right={<TopicPanel clusters={clusterStats} />}
    />

    <ConversationTrends allPosts={allPosts} filters={filters} search={search} />
  </main>
);

export default OverviewPage;
