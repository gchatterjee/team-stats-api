import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const getObject = async (
  bucketName: string,
  key: string,
  client: S3Client,
): Promise<string | null> => {
  const getParams = {
    Bucket: bucketName, // Replace with your bucket name
    Key: key, // Replace with the object's key/path
  };

  const command = new GetObjectCommand(getParams);
  const data = await client.send(command);

  // The Body is a Node.js Readable stream or a Blob in the browser
  if (data.Body) return data.Body.transformToString();
  else return null;
};
