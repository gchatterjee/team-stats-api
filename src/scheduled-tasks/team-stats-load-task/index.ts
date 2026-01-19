import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import NyrrClient, {
  DELAY_INCREMENT_MS,
} from "../../nyrr_api_client/client/index.js";
import { listObjects } from "../../s3_utils/list-objects.js";
import type {
  ApiResponse,
  Event,
  RunnerRace,
} from "../../nyrr_api_client/types.js";

const s3Client = new S3Client({});
const BUCKET_NAME = `${process.env.TEAMSTATS_BUCKET_NAME}`;

const TEAM_CODE = `${process.env.TEAM_CODE}`;

const JSON_EXTENSION = ".json";

const getAugmentedRunner = async (
  nyrrClient: NyrrClient,
  runnerId: number,
  teamCode: string,
): Promise<{
  runnerId: number;
  races: (RunnerRace | { teamCode: string | null })[];
}> => {
  const [allRaces, teamRaces] = await Promise.all([
    nyrrClient.getRunnerRaces(runnerId),
    nyrrClient.getRunnerRaces(runnerId, teamCode),
  ]);
  const teamEventCodes = new Set(
    teamRaces.items.map(({ eventCode }) => eventCode),
  );
  return {
    runnerId,
    races: allRaces.items.map((event) => ({
      ...event,
      teamCode: teamEventCodes.has(event.eventCode) ? teamCode : null,
    })),
  };
};

const assembleDocument = async (
  nyrrClient: NyrrClient,
  recentEvents: ApiResponse<Event>,
  eventCode: string,
  teamCode: string,
) => {
  const event = recentEvents.items.find((item) => item.eventCode === eventCode);
  const results = await nyrrClient.getTeamRunners(eventCode, TEAM_CODE);
  const awards = await nyrrClient.getAllRaceAwardRunners(eventCode, TEAM_CODE);
  const runners = await Promise.all(
    results.items.map(
      ({ runnerId }, i) =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve(getAugmentedRunner(nyrrClient, runnerId, teamCode)),
            i * DELAY_INCREMENT_MS,
          );
        }),
    ),
  );

  return { eventCode, document: { event, results, awards, runners } };
};

export const handler = async (): Promise<void> => {
  const nyrrClient = new NyrrClient();
  const recentEvents = await nyrrClient.getRecentEvents();
  console.log("getting existing events from s3 bucket...");
  const existingEvents = await listObjects(BUCKET_NAME, s3Client);
  console.log("got existing events from s3 bucket!", {
    count: existingEvents.length,
  });
  const recentEventCodes = recentEvents.items.map((event) => event.eventCode);
  const existingEventCodes = new Set(
    existingEvents.map((key) =>
      key.endsWith(JSON_EXTENSION) ? key.slice(0, -JSON_EXTENSION.length) : key,
    ),
  );

  // determine which events are new and are not in the s3 bucket
  const newEventCodes: string[] = [];
  recentEventCodes.forEach((code) => {
    if (code !== undefined && !existingEventCodes.has(code))
      newEventCodes.push(code);
  });

  const [newEventCode] = newEventCodes;

  if (newEventCode === undefined) {
    console.log("no new events found. exiting.");
    return;
  }

  console.log(
    `found new events. this run will attempt to produce the document for ${newEventCode}`,
    { newEventCodes },
  );

  const document = await assembleDocument(
    nyrrClient,
    recentEvents,
    newEventCode,
    TEAM_CODE,
  );

  const key = `${newEventCode}${JSON_EXTENSION}`;
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(document),
    ContentType: "application/json",
  });
  console.log("uploading document to s3...", { key });
  await s3Client.send(putCommand);
  console.log("uploaded document to s3!", { key });
};
