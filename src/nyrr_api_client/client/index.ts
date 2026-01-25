import { DELAY_INCREMENT_MS, promiseAllDelayed } from "../../utils.js";
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
  console.log("getting page 1...", { url, data });
  const result: ApiResponse<T> = (
    await instance.post(url, {
      ...data,
      pageIndex: 1,
      pageSize: PAGE_SIZE,
    })
  ).data;
  const pageCount = Math.ceil(result.totalItems / PAGE_SIZE);
  console.log(`got page 1 of ${pageCount}!`, { url, data });
  if (pageCount === 0) return result; // this will only happen if there are no items
  await promiseAllDelayed(
    [...new Array(pageCount - 1)].map((_, i) => async () => {
      const pageIndex = i + 2;
      const body = { ...data, pageIndex, pageSize: PAGE_SIZE };
      console.log(`getting page ${pageIndex} of ${pageCount}...`, {
        url,
        body,
      });
      const response: ApiResponse<T> = (await instance.post(url, body)).data;
      console.log(`got page ${pageIndex} of ${pageCount}!`, { url, body });
      result.items.push(...response.items);
    }),
    DELAY_INCREMENT_MS,
  );
  return result;
};

export default class {
  async getRecentEvents(): Promise<ApiResponse<Event>> {
    try {
      console.log("getting recent events...");
      const response: ApiResponse<Event> = await withPagination(
        "/events/search",
        { sortColumn: "StartDateTime" },
      );
      console.log("got recent events!");
      return response;
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
    runnerId: number,
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
