import instance from "../instance/index.js";
import {
  Gender,
  type ApiResponse,
  type Event,
  type RunnerRace,
  type TeamAward,
  type TeamAwardRunner,
  type TeamRunner,
} from "../types.js";

export const GENDERS = [Gender.Women, Gender.NonBinary, Gender.Men];
export const PAGE_SIZE = 100;

export const withPagination = async <T, D>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> => {
  const result: ApiResponse<T> = (
    await instance.post(url, {
      ...data,
      pageIndex: 1,
      pageSize: PAGE_SIZE,
    })
  ).data;
  const pageCount = Math.ceil(result.totalItems / PAGE_SIZE);
  await Promise.all(
    [...new Array(pageCount - 1)].map(async (_, i) => {
      const pageIndex = i + 2;
      const response: ApiResponse<T> = (
        await instance.post(url, {
          ...data,
          pageIndex,
          pageSize: PAGE_SIZE,
        })
      ).data;
      result.items.push(...response.items);
    }),
  );
  return result;
};

export default class {
  async getRecentEvents(): Promise<ApiResponse<Event>> {
    try {
      const response = await instance.post("/events/search", {
        sortColumn: "StartDateTime",
      });
      return response.data;
    } catch (error) {
      console.error("error retrieving recent events", error);
      throw error;
    }
  }

  async getTeamRunners(
    eventCode: string,
    teamCode: string,
  ): Promise<ApiResponse<TeamRunner>> {
    try {
      return await withPagination("/teams/teamRunners", {
        eventCode,
        teamCode,
      });
    } catch (error) {
      console.error("error retrieving results", { eventCode, teamCode }, error);
      throw error;
    }
  }

  private async getTeamAwards(
    eventCode: string,
    teamCode: string,
  ): Promise<ApiResponse<TeamAward>> {
    try {
      return await withPagination("/awards/teamAwards", {
        eventCode,
        teamCode,
      });
    } catch (error) {
      console.error("error retrieving awards", { eventCode, teamCode }, error);
      throw error;
    }
  }

  private async getTeamAwardRunners(
    eventCode: string,
    teamCode: string,
    gender: Gender,
    minimumAge: number = 0,
  ): Promise<ApiResponse<TeamAwardRunner>> {
    try {
      return withPagination("/awards/teamAwardRunners", {
        teamCode,
        eventCode,
        teamGender: gender,
        teamMinimumAge: `${minimumAge}`,
      });
    } catch (error) {
      console.error(
        "error retrieving awards",
        { eventCode, teamCode, gender, minimumAge },
        error,
      );
      throw error;
    }
  }

  async getAllRaceAwardRunners(
    eventCode: string,
    teamCode: string,
  ): Promise<(TeamAward | { runners: TeamAwardRunner[] })[]> {
    const awards = (await this.getTeamAwards(eventCode, teamCode)).items;
    return Promise.all(
      awards.map(async (award) => ({
        ...award,
        runners: await this.getTeamAwardRunners(
          eventCode,
          teamCode,
          award.teamGender,
          award.minimumAge,
        ),
      })),
    );
  }

  async getRunnerRaces(
    runnerId: string,
    teamCode?: string,
  ): Promise<ApiResponse<RunnerRace>> {
    try {
      return await withPagination("/runners/races", {
        runnerId,
        sortColumn: "EventDate",
        sortDescending: true,
        teamCode,
      });
    } catch (error) {
      console.error("error retrieving races", { runnerId }, error);
      throw error;
    }
  }
}
