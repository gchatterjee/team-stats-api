import {
  ListObjectsV2Command,
  S3Client,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

/**
 * Lists all objects in an S3 bucket, handling pagination automatically.
 * @param {string} bucketName The name of the S3 bucket.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of object keys.
 */
export const listObjects = async (
  bucketName: string,
  client: S3Client,
): Promise<string[]> => {
  const allKeys: string[] = [];
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    });

    const data: ListObjectsV2CommandOutput = await client.send(command);

    data.Contents?.forEach(({ Key }) => {
      if (Key !== undefined) allKeys.push(Key);
    });

    isTruncated = !!data.IsTruncated;
    continuationToken = data.NextContinuationToken;
  }

  return allKeys;
};
