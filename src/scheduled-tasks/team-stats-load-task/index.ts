import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import NyrrClient from "../../nyrr_api_client/client/index.js";
import { listObjects } from "../../s3_utils/list-objects.js";
import type {
  ApiResponse,
  Event,
  RunnerRace,
  TeamAward,
  TeamAwardRunner,
  TeamRunner,
} from "../../nyrr_api_client/types.js";
import { DELAY_INCREMENT_MS, promiseAllDelayed } from "../../utils.js";
import { getObject } from "../../s3_utils/get-object.js";

const s3Client = new S3Client({});
const BUCKET_NAME = `${process.env.TEAMSTATS_BUCKET_NAME}`;

const TEAM_CODE = `${process.env.TEAM_CODE}`;

const JSON_EXTENSION = ".json";
const IN_PROGRESS_EXTENSION = ".temp.json";

const MAX_RUNNERS = 80;

export type AugmentedRunnerRace = RunnerRace & {
  teamCode: string | null;
};

export type Document = {
  eventCode: string;
  document: {
    event: Event;
    results: ApiResponse<TeamRunner>;
    awards: (TeamAward | { runners: TeamAwardRunner[] })[];
    runners: Record<number, AugmentedRunnerRace[]>;
  };
};

const getAugmentedRunner = async (
  nyrrClient: NyrrClient,
  runnerId: number,
  teamCode: string,
): Promise<AugmentedRunnerRace[]> => {
  const [allRaces, teamRaces] = await Promise.all([
    nyrrClient.getRunnerRaces(runnerId),
    nyrrClient.getRunnerRaces(runnerId, teamCode),
  ]);
  const teamEventCodes = new Set(
    teamRaces.items.map(({ eventCode }) => eventCode),
  );
  return allRaces.items.map((event) => ({
    ...event,
    teamCode: teamEventCodes.has(event.eventCode) ? teamCode : null,
  }));
};

const assembleDocument = async (
  nyrrClient: NyrrClient,
  recentEvents: ApiResponse<Event>,
  eventCode: string,
  teamCode: string,
  partial?: Document,
) => {
  let event, results, awards, runners;
  if (partial?.document !== undefined) {
    event = partial.document.event;
    results = partial.document.results;
    awards = partial.document.awards;
    runners = partial.document.runners;
  } else {
    event = recentEvents.items.find((item) => item.eventCode === eventCode);
    results = await nyrrClient.getTeamRunners(eventCode, TEAM_CODE);
    awards = await nyrrClient.getAllRaceAwardRunners(eventCode, TEAM_CODE);
    runners = {};
  }

  const runnerIds = new Set(results.items.map(({ runnerId }) => runnerId));
  let runnerCount = 0;
  const batch: number[] = [];
  runnerIds.forEach((runnerId) => {
    if (runnerCount < MAX_RUNNERS && runners[runnerId] === undefined) {
      batch.push(runnerId);
      runnerCount += 1;
    }
  });
  console.log(
    `processing a batch of ${batch.length} out of a total of ${runnerIds.size} runners...`,
    { batch },
  );
  await promiseAllDelayed(
    batch.map((runnerId) => async () => {
      runners[runnerId] = await getAugmentedRunner(
        nyrrClient,
        runnerId,
        teamCode,
      );
    }),
    DELAY_INCREMENT_MS,
  );

  return {
    document: { eventCode, document: { event, results, awards, runners } },
    isComplete: Object.keys(runners).length === runnerIds.size,
  };
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

  // determine if there are any events that are incomplete and need to be finished
  const inProgressEventCodes = existingEvents
    .filter((key) => key.endsWith(IN_PROGRESS_EXTENSION))
    .map((key) => key.slice(0, -IN_PROGRESS_EXTENSION.length));

  let processEventCode: string | undefined;
  let partial: Document | undefined = undefined;
  let isResuming = false;

  if (inProgressEventCodes.length > 0) {
    console.log("found incomplete events in s3 bucket,", {
      inProgressEventCodes,
    });
    isResuming = true;
    [processEventCode] = inProgressEventCodes;

    console.log(`resuming work on incomplete event ${processEventCode}...`);

    const existing = await getObject(
      BUCKET_NAME,
      `${processEventCode}${IN_PROGRESS_EXTENSION}`,
      s3Client,
    );
    if (existing === null) {
      console.error(
        "could not retrieve existing in-progress document from s3! exiting.",
        { processEventCode },
      );
      throw Error();
    }
    partial = JSON.parse(existing);
  } else {
    // determine which events are new and are not in the s3 bucket
    const newEventCodes: string[] = [];
    recentEventCodes.forEach((code) => {
      if (code !== undefined && !existingEventCodes.has(code))
        newEventCodes.push(code);
    });

    console.log("found new events to process,", { newEventCodes });

    [processEventCode] = newEventCodes;
  }

  if (processEventCode === undefined) {
    console.log("no events found to process. exiting.");
    return;
  }

  const { document, isComplete } = await assembleDocument(
    nyrrClient,
    recentEvents,
    processEventCode,
    TEAM_CODE,
    partial,
  );

  const inProcessKey = `${processEventCode}${IN_PROGRESS_EXTENSION}`;
  const completeKey = `${processEventCode}${JSON_EXTENSION}`;
  const writeKey = isComplete ? completeKey : inProcessKey;
  const deleteKey = isResuming && isComplete ? inProcessKey : null;
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: isComplete ? completeKey : inProcessKey,
    Body: JSON.stringify(document),
    ContentType: "application/json",
  });
  console.log("uploading document to s3...", { key: writeKey });
  await s3Client.send(putCommand);
  console.log("uploaded document to s3!", { key: writeKey });

  if (deleteKey !== null) {
    // delete the in-progress file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: deleteKey,
    });
    console.log("deleting in-progress document from s3...", { key: deleteKey });
    await s3Client.send(deleteCommand);
    console.log("deleted in-progress document from s3!", { key: deleteKey });
  }
};
