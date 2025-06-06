import { QueryProvider } from "../ClientQueryProvider";
import LeaderboardPage from "./Leaderboard";

export default async function Leaderboard() {
  return (
    <QueryProvider>
      <LeaderboardPage/>
    </QueryProvider>

  );
}