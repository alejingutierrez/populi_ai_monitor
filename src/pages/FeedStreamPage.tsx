import type { FC } from "react";
import type { Filters } from "../components/FilterBar";
import type { ClusterStat } from "../components/TopicPanel";
import type { SocialPost, TimelineDatum } from "../types";
import FeedStreamList from "../components/FeedStreamList";
import ResizableHorizontalSplit from "../components/ResizableHorizontalSplit";
import TrendRadar from "../components/TrendRadar";
import SubConversationExplorer from "../components/SubConversationExplorer";
import SummaryGrid, { type SummaryMetrics } from "../components/SummaryGrid";

interface Props {
  metrics: SummaryMetrics;
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
    <SummaryGrid metrics={metrics} />

    <ResizableHorizontalSplit
      storageKey="feed-stream:main"
      defaultRatio={0.6}
      minRatio={0.38}
      maxRatio={0.74}
      left={<FeedStreamList posts={filteredPosts} />}
      right={<TrendRadar posts={filteredPosts} filters={filters} timelineData={timelineData} />}
    />

    <SubConversationExplorer clusters={clusterStats} posts={filteredPosts} />
  </main>
);

export default FeedStreamPage;
